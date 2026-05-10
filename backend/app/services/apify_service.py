import hashlib
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus, urlparse

from app.config import get_settings
from app.models.listing import Listing
from app.services.mock_data_service import MockDataService, detect_product_key


def _runtime_data_dir() -> Path:
    configured = os.getenv("DEALPILOT_RUNTIME_DATA_DIR")
    if configured:
        return Path(configured)
    if os.getenv("VERCEL"):
        return Path("/tmp/dealpilot-ai")
    return Path(__file__).resolve().parents[1] / "data"


CACHE_DIR = _runtime_data_dir() / "cache"
AUDIT_DIR = _runtime_data_dir() / "audit"
AUDIT_PATH = AUDIT_DIR / "apify_live_runs.jsonl"
HARD_MAX_ITEMS = 20


class ApifyService:
    """Credit-safe Apify adapter.

    The only branch that imports and calls Apify requires live mode, credentials,
    request-level confirmation, and cache miss. All other branches return local
    mock data without external calls.
    """

    def __init__(self, mock_data_service: MockDataService | None = None) -> None:
        self.settings = get_settings()
        self.mock_data_service = mock_data_service or MockDataService()

    def search_marketplace_listings(
        self,
        query: str,
        max_items: int = 10,
        confirm_live_run: bool = False,
        source: str | None = None,
    ) -> dict[str, Any]:
        max_items_requested = max_items
        max_items_used = self._clamp_max_items(max_items)
        source_key = self._source_key(source)
        actor_id = self._actor_id_for_source(source_key)

        if source_key == "multi":
            return self._multi_source_response(query, max_items_requested, max_items_used, confirm_live_run)

        if not self.settings.apify_live_mode:
            return self._mock_response(query, max_items_requested, max_items_used, "APIFY_LIVE_MODE is false.")

        if not confirm_live_run:
            return self._mock_response(query, max_items_requested, max_items_used, "Live run was not confirmed.")

        if not self.settings.apify_api_token or not actor_id:
            self._write_audit_event(
                query=query,
                source=source_key,
                actor_id=actor_id,
                max_items_requested=max_items_requested,
                max_items_used=max_items_used,
                confirm_live_run=confirm_live_run,
                outcome="blocked_missing_credentials",
                apify_called=False,
                data_source="mock_fallback",
                message=f"Apify token or actor ID is missing for source '{source_key}'.",
            )
            return self._mock_response(query, max_items_requested, max_items_used, f"Apify token or actor ID is missing for source '{source_key}'.")

        cached = self._read_cache(query, source_key)
        if cached is not None:
            self._write_audit_event(
                query=query,
                source=source_key,
                actor_id=actor_id,
                max_items_requested=max_items_requested,
                max_items_used=min(max_items_used, len(cached)),
                confirm_live_run=confirm_live_run,
                outcome="cache_hit",
                apify_called=False,
                data_source="apify_cache",
                message="Fresh cache returned before actor call.",
            )
            return {
                "listings": cached[:max_items_used],
                "data_source": "apify_cache",
                "apify_called": False,
                "apify_cache_used": True,
                "max_items_requested": max_items_requested,
                "max_items_used": min(max_items_used, len(cached)),
                "live_run_confirmed": confirm_live_run,
                "message": f"Fresh Apify cache used for {source_key}; no actor run was started.",
            }

        try:
            # Lazy import prevents Apify dependency or clients from loading at startup.
            from apify_client import ApifyClient

            client = ApifyClient(self.settings.apify_api_token)
            run = client.actor(actor_id).call(
                run_input=self._run_input_for_source(query, source_key, max_items_used),
                max_total_charge_usd=self.settings.apify_max_total_charge_usd,
            )
            dataset_id = getattr(run, "default_dataset_id", None)
            if dataset_id is None and isinstance(run, dict):
                dataset_id = run.get("defaultDatasetId") or run.get("default_dataset_id")
            raw_items = list(client.dataset(dataset_id).iterate_items(limit=max_items_used)) if dataset_id else []
            expanded_items = self._expand_raw_items(raw_items, max_items_used)
            listings = [self._normalize_item(query, item, index, source_key) for index, item in enumerate(expanded_items)]
            listings = listings[:max_items_used]
            if self.settings.apify_cache_enabled:
                self._write_cache(query, source_key, listings)
            self._write_audit_event(
                query=query,
                source=source_key,
                actor_id=actor_id,
                max_items_requested=max_items_requested,
                max_items_used=len(listings),
                confirm_live_run=confirm_live_run,
                outcome="actor_run_completed",
                apify_called=True,
                data_source="apify_live",
                message="Confirmed Apify actor run completed.",
            )
            return {
                "listings": listings,
                "data_source": "apify_live",
                "apify_called": True,
                "apify_cache_used": False,
                "max_items_requested": max_items_requested,
                "max_items_used": len(listings),
                "live_run_confirmed": confirm_live_run,
                "message": f"One confirmed Apify actor run completed for {source_key}.",
            }
        except Exception as exc:
            self._write_audit_event(
                query=query,
                source=source_key,
                actor_id=actor_id,
                max_items_requested=max_items_requested,
                max_items_used=max_items_used,
                confirm_live_run=confirm_live_run,
                outcome="actor_run_failed",
                apify_called=False,
                data_source="mock_fallback",
                message=f"Apify {source_key} run failed; mock fallback returned.",
                error_type=type(exc).__name__,
            )
            return self._mock_response(query, max_items_requested, max_items_used, f"Apify {source_key} run failed; mock fallback returned.")

    def status(self) -> dict[str, Any]:
        return {
            "apify_live_mode": self.settings.apify_live_mode,
            "token_configured": bool(self.settings.apify_api_token),
            "actor_configured": bool(self.settings.apify_actor_id),
            "sources": {
                "default": self._source_key(None),
                "multi_source_available": True,
                "olx_configured": bool(self.settings.apify_olx_actor_id),
                "ebay_configured": bool(self.settings.apify_ebay_actor_id),
                "facebook_configured": bool(self.settings.apify_facebook_actor_id),
                "google_configured": bool(self.settings.apify_google_actor_id),
                "fallback_actor_configured": bool(self.settings.apify_actor_id),
            },
            "cache_enabled": self.settings.apify_cache_enabled,
            "max_items": min(self.settings.apify_max_items, HARD_MAX_ITEMS),
            "max_total_charge_usd": self.settings.apify_max_total_charge_usd,
            "live_run_audit_enabled": self.settings.apify_live_run_audit_enabled,
            "warning": (
                "Apify live mode is enabled with item and charge caps."
                if self.settings.apify_live_mode
                else "Apify live mode is disabled by default to protect credits."
            ),
        }

    def clear_cache(self) -> dict[str, int]:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        deleted = 0
        for path in CACHE_DIR.glob("*.json"):
            if path.resolve().parent == CACHE_DIR.resolve():
                path.unlink()
                deleted += 1
        return {"files_deleted": deleted}

    def list_audit_events(self, limit: int = 50) -> dict[str, Any]:
        safe_limit = min(max(limit, 1), 200)
        if not AUDIT_PATH.exists():
            return {"events": [], "count": 0}
        events = []
        for line in AUDIT_PATH.read_text(encoding="utf-8").splitlines()[-safe_limit:]:
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        events.reverse()
        return {"events": events, "count": len(events)}

    def clear_audit_events(self) -> dict[str, int]:
        if AUDIT_PATH.exists():
            AUDIT_PATH.unlink()
            return {"audit_events_deleted": 1}
        return {"audit_events_deleted": 0}

    def _mock_response(self, query: str, max_items_requested: int, max_items_used: int, message: str) -> dict[str, Any]:
        _, _, listings = self.mock_data_service.search(query)
        return {
            "listings": listings[:max_items_used],
            "data_source": "mock_fallback",
            "apify_called": False,
            "apify_cache_used": False,
            "max_items_requested": max_items_requested,
            "max_items_used": min(max_items_used, len(listings)),
            "live_run_confirmed": False,
            "message": message,
        }

    def _multi_source_response(self, query: str, max_items_requested: int, max_items_used: int, confirm_live_run: bool) -> dict[str, Any]:
        if not self.settings.apify_live_mode:
            return self._mock_response(query, max_items_requested, max_items_used, "APIFY_LIVE_MODE is false.")

        if not confirm_live_run:
            return self._mock_response(query, max_items_requested, max_items_used, "Live run was not confirmed.")

        if not self.settings.apify_api_token:
            return self._mock_response(query, max_items_requested, max_items_used, "Apify token is missing for multi-source search.")

        sources = self._configured_sources()
        if not sources:
            return self._mock_response(query, max_items_requested, max_items_used, "No configured Apify source actors were available for multi-source search.")

        combined: list[Listing] = []
        seen: set[str] = set()
        apify_called = False
        cache_used = False
        source_messages: list[str] = []

        for source in sources:
            remaining = max_items_used - len(combined)
            if remaining <= 0:
                break
            per_source_limit = max(1, min(remaining, max(3, max_items_used // len(sources))))
            result = self.search_marketplace_listings(
                query=query,
                max_items=per_source_limit,
                confirm_live_run=confirm_live_run,
                source=source,
            )
            source_messages.append(result["message"])
            apify_called = apify_called or result["apify_called"]
            cache_used = cache_used or result["apify_cache_used"]
            if result["data_source"] == "mock_fallback":
                continue
            for listing in result["listings"]:
                key = self._dedupe_key(listing)
                if key in seen:
                    continue
                seen.add(key)
                combined.append(listing)
                if len(combined) >= max_items_used:
                    break

        if not combined:
            return self._mock_response(query, max_items_requested, max_items_used, "Multi-source Apify search returned no usable listings; fallback returned.")

        data_source = "apify_live" if apify_called else "apify_cache"
        return {
            "listings": combined[:max_items_used],
            "data_source": data_source,
            "apify_called": apify_called,
            "apify_cache_used": cache_used,
            "max_items_requested": max_items_requested,
            "max_items_used": len(combined[:max_items_used]),
            "live_run_confirmed": confirm_live_run,
            "message": f"Multi-source Apify search used {', '.join(sources)}. " + " ".join(source_messages[:3]),
        }

    def _configured_sources(self) -> list[str]:
        explicit_actor_ids = {
            "google": self.settings.apify_google_actor_id,
            "olx": self.settings.apify_olx_actor_id,
            "ebay": self.settings.apify_ebay_actor_id,
            "facebook": self.settings.apify_facebook_actor_id,
        }
        preferred = ["google", "olx", "ebay", "facebook"]
        configured = [source for source in preferred if explicit_actor_ids[source]]
        if configured:
            return configured

        default_source = self._source_key(None)
        if default_source != "multi" and self._actor_id_for_source(default_source):
            return [default_source]
        return []

    def _dedupe_key(self, listing: Listing) -> str:
        if listing.listing_url and listing.listing_url != "#":
            return listing.listing_url.lower().rstrip("/")
        normalized_title = re.sub(r"\W+", "", listing.title.lower())[:80]
        return f"{normalized_title}:{listing.price}:{listing.location.lower()}"

    def _clamp_max_items(self, max_items: int) -> int:
        configured = max(1, self.settings.apify_max_items)
        requested = max(1, max_items)
        return min(requested, configured, HARD_MAX_ITEMS)

    def _source_key(self, source: str | None) -> str:
        requested = (source or self.settings.apify_default_source or "google").strip().lower()
        aliases = {
            "all": "multi",
            "multiple": "multi",
            "multi_source": "multi",
            "multi-source": "multi",
            "fb": "facebook",
            "facebook_marketplace": "facebook",
            "facebook-marketplace": "facebook",
            "google_search": "google",
            "google-shopping": "google",
        }
        normalized = aliases.get(requested, requested)
        return normalized if normalized in {"olx", "ebay", "facebook", "google", "multi"} else "google"

    def _actor_id_for_source(self, source: str) -> str | None:
        actors = {
            "olx": self.settings.apify_olx_actor_id,
            "ebay": self.settings.apify_ebay_actor_id,
            "facebook": self.settings.apify_facebook_actor_id,
            "google": self.settings.apify_google_actor_id,
        }
        return actors.get(source) or self.settings.apify_actor_id

    def _run_input_for_source(self, query: str, source: str, max_items: int) -> dict[str, Any]:
        marketplace_query = _simplify_marketplace_query(query)
        encoded_query = quote_plus(marketplace_query)
        if source == "google":
            search_query = f"{query} used marketplace India OLX OR eBay"
            return {
                "queries": search_query,
                "countryCode": "in",
                "languageCode": "en",
                "maxPagesPerQuery": 1,
                "resultsPerPage": min(max_items, 10),
                "mobileResults": False,
                "includeUnfilteredResults": False,
                "saveHtml": False,
                "saveHtmlToKeyValueStore": False,
            }
        if source == "facebook":
            return {
                "startUrls": [
                    {
                        "url": f"https://www.facebook.com/marketplace/search/?query={encoded_query}",
                    }
                ],
                "resultsLimit": max_items,
                "query": query,
                "maxItems": max_items,
                "limit": max_items,
            }
        if source == "ebay":
            return {
                "urls": [
                    f"https://www.ebay.com/sch/i.html?_nkw={encoded_query}",
                    f"https://www.ebay.com/sch/i.html?_nkw={encoded_query}&LH_ItemCondition=3000",
                ],
                "query": query,
                "search": query,
                "keyword": query,
                "maxItems": max_items,
                "max_items": max_items,
                "limit": max_items,
                "proxyConfiguration": {"useApifyProxy": True},
            }
        return {
            "startUrls": [
                {
                    "url": f"https://www.olx.in/items/q-{encoded_query}",
                },
                {
                    "url": f"https://www.olx.in/items/q-{quote_plus(query)}",
                },
            ],
            "query": query,
            "search": query,
            "keyword": query,
            "maxItems": max_items,
            "max_items": max_items,
            "limit": max_items,
            "maxPages": 1,
        }

    def _expand_raw_items(self, raw_items: list[dict[str, Any]], max_items: int) -> list[dict[str, Any]]:
        expanded: list[dict[str, Any]] = []
        nested_keys = ("organicResults", "shoppingResults", "paidResults", "results", "items", "products", "listings", "ads", "data")
        for item in raw_items:
            nested_found = False
            for key in nested_keys:
                values = item.get(key)
                if isinstance(values, list):
                    nested_found = True
                    for value in values:
                        if isinstance(value, dict):
                            merged = {**value}
                            merged.setdefault("searchQuery", item.get("searchQuery"))
                            merged.setdefault("data_origin", key)
                            expanded.append(merged)
                            if len(expanded) >= max_items:
                                return expanded
            if not nested_found:
                expanded.append(item)
                if len(expanded) >= max_items:
                    return expanded
        return expanded

    def _cache_path(self, query: str, source: str = "google") -> Path:
        cache_key = f"{source}:{query.strip().lower()}"
        safe_hash = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()[:24]
        return CACHE_DIR / f"{safe_hash}.json"

    def _read_cache(self, query: str, source: str) -> list[Listing] | None:
        if not self.settings.apify_cache_enabled:
            return None
        path = self._cache_path(query, source)
        if not path.exists():
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            created_at = datetime.fromisoformat(payload["created_at"])
            if datetime.now(timezone.utc) - created_at > timedelta(minutes=self.settings.apify_cache_ttl_minutes):
                return None
            return [Listing(**item).model_copy(update={"data_source": "apify_cache"}) for item in payload.get("listings", [])]
        except Exception:
            return None

    def _write_cache(self, query: str, source: str, listings: list[Listing]) -> None:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        payload = {
            "query": query,
            "source": source,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "listings": [listing.model_dump() for listing in listings],
        }
        self._cache_path(query, source).write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _write_audit_event(
        self,
        query: str,
        source: str,
        actor_id: str | None,
        max_items_requested: int,
        max_items_used: int,
        confirm_live_run: bool,
        outcome: str,
        apify_called: bool,
        data_source: str,
        message: str,
        error_type: str | None = None,
    ) -> None:
        if not self.settings.apify_live_run_audit_enabled:
            return
        AUDIT_DIR.mkdir(parents=True, exist_ok=True)
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "query": query,
            "source": source,
            "actor_configured": bool(actor_id),
            "actor_id_hash": hashlib.sha256((actor_id or "").encode("utf-8")).hexdigest()[:12] if actor_id else None,
            "max_items_requested": max_items_requested,
            "max_items_used": max_items_used,
            "max_total_charge_usd": self.settings.apify_max_total_charge_usd,
            "confirm_live_run": confirm_live_run,
            "outcome": outcome,
            "apify_called": apify_called,
            "data_source": data_source,
            "message": message,
            "error_type": error_type,
        }
        with AUDIT_PATH.open("a", encoding="utf-8") as file:
            file.write(json.dumps(event) + "\n")

    def _normalize_item(self, query: str, item: dict[str, Any], index: int, source: str = "actor") -> Listing:
        product_key = detect_product_key(query)
        description = str(self._first(item, "description", "text", "snippet", "shortDescription", "subtitle", "itemDescription") or "")
        price = self._parse_price(
            self._first(
                item,
                "price",
                "amount",
                "currentPrice",
                "itemPrice",
                "priceText",
                "price_text",
                "formattedPrice",
                "displayPrice",
                "buyItNowPrice",
                "value",
            )
            or description
        )
        title = str(self._first(item, "title", "name", "productTitle", "itemTitle", "adTitle", "heading") or "Marketplace listing")
        listing_url = self._normalize_listing_url(
            self._first(
                item,
                "url",
                "link",
                "listingUrl",
                "listing_url",
                "productUrl",
                "product_url",
                "sourceUrl",
                "source_url",
                "displayedUrl",
                "adUrl",
                "itemUrl",
                "href",
            )
        )
        seller = self._first(item, "seller", "sellerName", "sellerInfo", "seller_name", "user")
        seller_name = seller.get("name") if isinstance(seller, dict) else seller
        image_url = self._normalize_image_url(self._first(item, "image", "imageUrl", "thumbnail", "photo", "picture", "images", "imageUrls"))
        image_url = image_url or f"gradient://{product_key}-apify"
        location = self._normalize_location(self._first(item, "location", "city", "itemLocation", "sellerLocation", "area", "region"))
        description = description or title
        currency = self._currency_from_item(item) or "INR"

        return Listing(
            id=f"apify_{hashlib.sha1(f'{query}:{index}:{listing_url}'.encode('utf-8')).hexdigest()[:12]}",
            title=title,
            price=price,
            currency=currency,
            location=location,
            description=description,
            seller_name=str(seller_name or "Marketplace seller"),
            seller_rating=self._parse_rating(self._first(item, "seller_rating", "sellerRating", "rating", "sellerRatingScore")),
            image_url=image_url,
            listing_url=listing_url,
            source=f"apify_{source}",
            condition=str(self._first(item, "condition", "itemCondition", "item_condition", "conditionText") or "used"),
            posted_time=str(self._first(item, "posted_time", "postedTime", "createdAt", "datePosted", "postedDate", "time") or "recently"),
            data_source="apify_live",
            product_key=product_key,
        )

    def _normalize_listing_url(self, value: Any) -> str:
        text = str(value or "").strip()
        if not text:
            return "#"
        if text.startswith("//"):
            text = f"https:{text}"
        elif text.startswith("www."):
            text = f"https://{text}"
        elif not re.match(r"^https?://", text, flags=re.IGNORECASE):
            # Google-style displayed URLs can arrive as "olx.in/item/..."
            # or "example.com > category". Convert likely domains only.
            candidate = text.split()[0].split(">")[0].strip().rstrip("/")
            if "." in candidate and " " not in candidate:
                text = f"https://{candidate}"
            else:
                return "#"

        parsed = urlparse(text)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return "#"
        return text

    def _first(self, item: dict[str, Any], *keys: str) -> Any:
        for key in keys:
            if key in item and item[key] not in (None, ""):
                return item[key]
        return None

    def _parse_price(self, value: Any) -> int:
        if isinstance(value, (int, float)):
            return max(0, int(value))
        if isinstance(value, dict):
            for key in ("value", "amount", "price", "raw", "text", "formatted", "display"):
                if key in value:
                    parsed = self._parse_price(value[key])
                    if parsed:
                        return parsed
            return 0
        if isinstance(value, list):
            parsed_values = [self._parse_price(item) for item in value]
            return max(parsed_values) if parsed_values else 0
        text = str(value or "0")
        currency_match = re.search(r"(?:₹|INR|Rs\.?|US\s*\$|\$)\s*([0-9][0-9,\.\s]*)", text, flags=re.IGNORECASE)
        if currency_match:
            amount = re.sub(r"\D", "", currency_match.group(1))
            if amount:
                return int(amount)

        comma_amounts = re.findall(r"\d{1,3}(?:,\d{3})+", text)
        if comma_amounts:
            return max(int(amount.replace(",", "")) for amount in comma_amounts)

        plain_amounts = [int(amount) for amount in re.findall(r"\b\d{4,7}\b", text)]
        return max(plain_amounts) if plain_amounts else 0

    def _parse_rating(self, value: Any) -> float | None:
        if value is None:
            return None
        try:
            rating = float(value)
            return rating if 0 <= rating <= 5 else None
        except (TypeError, ValueError):
            return None

    def _normalize_image_url(self, value: Any) -> str:
        if isinstance(value, list):
            for item in value:
                image = self._normalize_image_url(item)
                if image:
                    return image
            return ""
        if isinstance(value, dict):
            for key in ("url", "src", "imageUrl", "thumbnail", "large", "original"):
                if value.get(key):
                    return str(value[key])
            return ""
        return str(value or "")

    def _normalize_location(self, value: Any) -> str:
        if isinstance(value, dict):
            parts = [str(value.get(key) or "").strip() for key in ("city", "region", "state", "country", "name")]
            return ", ".join(part for part in parts if part) or "Unknown location"
        return str(value or "Unknown location")

    def _currency_from_item(self, item: dict[str, Any]) -> str | None:
        for key in ("currency", "currencyCode", "priceCurrency"):
            value = item.get(key)
            if value:
                return str(value).upper()
        price = item.get("price")
        if isinstance(price, dict):
            for key in ("currency", "currencyCode"):
                if price.get(key):
                    return str(price[key]).upper()
        return None


def _simplify_marketplace_query(query: str) -> str:
    cleaned = re.sub(r"\b(find|me|a|an|used|under|below|inr|rs|with|good|condition)\b", " ", query, flags=re.IGNORECASE)
    cleaned = re.sub(r"[₹$,]+", " ", cleaned)
    cleaned = re.sub(r"\b\d{4,7}\b", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or query
