import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.models.listing import Listing
from app.services.mock_data_service import MockDataService, detect_product_key


CACHE_DIR = Path(__file__).resolve().parents[1] / "data" / "cache"
AUDIT_DIR = Path(__file__).resolve().parents[1] / "data" / "audit"
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
                run_input={
                    "query": query,
                    "search": query,
                    "keyword": query,
                    "maxItems": max_items_used,
                    "max_items": max_items_used,
                    "limit": max_items_used,
                },
                max_total_charge_usd=self.settings.apify_max_total_charge_usd,
            )
            dataset_id = getattr(run, "default_dataset_id", None)
            if dataset_id is None and isinstance(run, dict):
                dataset_id = run.get("defaultDatasetId") or run.get("default_dataset_id")
            raw_items = list(client.dataset(dataset_id).iterate_items(limit=max_items_used)) if dataset_id else []
            listings = [self._normalize_item(query, item, index) for index, item in enumerate(raw_items)]
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
            "warning": "Apify live mode is disabled by default to protect credits.",
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

    def _clamp_max_items(self, max_items: int) -> int:
        configured = max(1, self.settings.apify_max_items)
        requested = max(1, max_items)
        return min(requested, configured, HARD_MAX_ITEMS)

    def _source_key(self, source: str | None) -> str:
        requested = (source or self.settings.apify_default_source or "google").strip().lower()
        aliases = {
            "fb": "facebook",
            "facebook_marketplace": "facebook",
            "facebook-marketplace": "facebook",
            "google_search": "google",
            "google-shopping": "google",
        }
        normalized = aliases.get(requested, requested)
        return normalized if normalized in {"olx", "ebay", "facebook", "google"} else "google"

    def _actor_id_for_source(self, source: str) -> str | None:
        actors = {
            "olx": self.settings.apify_olx_actor_id,
            "ebay": self.settings.apify_ebay_actor_id,
            "facebook": self.settings.apify_facebook_actor_id,
            "google": self.settings.apify_google_actor_id,
        }
        return actors.get(source) or self.settings.apify_actor_id

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

    def _normalize_item(self, query: str, item: dict[str, Any], index: int) -> Listing:
        product_key = detect_product_key(query)
        price = self._parse_price(self._first(item, "price", "amount"))
        title = str(self._first(item, "title", "name") or "Marketplace listing")
        listing_url = str(self._first(item, "url", "link", "listingUrl") or "https://example.invalid/apify/listing")
        seller = self._first(item, "seller", "sellerName")
        seller_name = seller.get("name") if isinstance(seller, dict) else seller
        image_url = str(self._first(item, "image", "imageUrl", "thumbnail") or f"gradient://{product_key}-apify")
        location = str(self._first(item, "location", "city") or "Unknown location")
        description = str(self._first(item, "description", "text") or title)

        return Listing(
            id=f"apify_{hashlib.sha1(f'{query}:{index}:{listing_url}'.encode('utf-8')).hexdigest()[:12]}",
            title=title,
            price=price,
            currency="INR",
            location=location,
            description=description,
            seller_name=str(seller_name or "Marketplace seller"),
            seller_rating=self._parse_rating(self._first(item, "seller_rating", "sellerRating", "rating")),
            image_url=image_url,
            listing_url=listing_url,
            source="apify_actor",
            condition=str(self._first(item, "condition", "itemCondition") or "used"),
            posted_time=str(self._first(item, "posted_time", "postedTime", "createdAt") or "recently"),
            data_source="apify_live",
            product_key=product_key,
        )

    def _first(self, item: dict[str, Any], *keys: str) -> Any:
        for key in keys:
            if key in item and item[key] not in (None, ""):
                return item[key]
        return None

    def _parse_price(self, value: Any) -> int:
        if isinstance(value, (int, float)):
            return max(0, int(value))
        text = str(value or "0")
        digits = "".join(ch if ch.isdigit() else " " for ch in text)
        numbers = [int(part) for part in digits.split() if part.isdigit()]
        return max(numbers) if numbers else 0

    def _parse_rating(self, value: Any) -> float | None:
        if value is None:
            return None
        try:
            rating = float(value)
            return rating if 0 <= rating <= 5 else None
        except (TypeError, ValueError):
            return None
