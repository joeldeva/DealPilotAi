import re
from collections import defaultdict
from statistics import median
from urllib.parse import urlparse

from app.models.analysis import DuplicateSignal, PlatformSignal, SourceBreakdown
from app.models.api import RankedDeal
from app.models.listing import Listing


def build_source_breakdown(ranked_results: list[RankedDeal]) -> list[SourceBreakdown]:
    grouped: dict[str, list[RankedDeal]] = defaultdict(list)
    for deal in ranked_results:
        grouped[_display_source(deal.listing.source)].append(deal)

    breakdown: list[SourceBreakdown] = []
    for source, deals in sorted(grouped.items(), key=lambda item: len(item[1]), reverse=True):
        prices = [deal.listing.price for deal in deals if deal.listing.price > 0]
        if not prices:
            continue
        breakdown.append(
            SourceBreakdown(
                source=source,
                listing_count=len(deals),
                median_price=int(round(median(prices))),
                average_price=int(round(sum(prices) / len(prices))),
                lowest_price=min(prices),
                highest_price=max(prices),
                medium_or_high_risk_count=sum(1 for deal in deals if deal.risk_analysis.risk_level in {"medium", "high"}),
                suspicious_listing_count=sum(
                    1
                    for deal in deals
                    if deal.deal_analysis.price_position == "suspiciously_low" or deal.risk_analysis.risk_score >= 50
                ),
            )
        )
    return breakdown


def detect_duplicate_signals(ranked_results: list[RankedDeal]) -> list[DuplicateSignal]:
    signals: list[DuplicateSignal] = []
    by_url: dict[str, list[Listing]] = defaultdict(list)
    by_price_location: dict[str, list[Listing]] = defaultdict(list)

    for deal in ranked_results:
        listing = deal.listing
        if listing.listing_url and listing.listing_url != "#":
            by_url[listing.listing_url.lower().rstrip("/")].append(listing)
        title_key = _title_fingerprint(listing.title)
        location_key = re.sub(r"\W+", "", listing.location.lower())[:24]
        by_price_location[f"{title_key}:{listing.price}:{location_key}"].append(listing)

    for listings in by_url.values():
        if len(listings) > 1:
            signals.append(_duplicate_signal(listings, "same_listing_url", 0.96))

    for listings in by_price_location.values():
        unique_ids = {listing.id for listing in listings}
        if len(unique_ids) > 1:
            signals.append(_duplicate_signal(listings, "similar_title_price_location", 0.82))

    return _dedupe_duplicate_signals(signals)[:6]


def build_platform_signals(ranked_results: list[RankedDeal]) -> list[PlatformSignal]:
    return [_platform_signal(deal.listing) for deal in ranked_results]


def source_intelligence_summary(source_breakdown: list[SourceBreakdown], duplicate_signals: list[DuplicateSignal]) -> str:
    if not source_breakdown:
        return "No source intelligence was available for this run."
    source_count = len(source_breakdown)
    listing_count = sum(item.listing_count for item in source_breakdown)
    duplicate_phrase = (
        f"{len(duplicate_signals)} possible duplicate signal(s) found."
        if duplicate_signals
        else "No strong duplicate signals found."
    )
    return f"Analyzed {listing_count} listing(s) across {source_count} source bucket(s). {duplicate_phrase}"


def _platform_signal(listing: Listing) -> PlatformSignal:
    source = _display_source(listing.source)
    url = listing.listing_url or ""
    parsed = urlparse(url if url.startswith("http") else "")
    domain = parsed.netloc.lower()
    notes: list[str] = []

    confidence = 55
    if url and url != "#":
        confidence += 15
        notes.append("Original listing URL available.")
    else:
        confidence -= 20
        notes.append("Original listing URL is missing.")

    source_domain = source.lower()
    if source_domain != "google" and source_domain in domain:
        confidence += 18
        notes.append("URL domain matches the marketplace source.")
    elif any(platform in domain for platform in ("olx", "ebay", "facebook", "marketplace")):
        confidence += 10
        notes.append("URL points to a recognizable marketplace domain.")
    elif source_domain == "google":
        notes.append("Google-discovered result; verify destination marketplace details.")

    if listing.seller_rating is None:
        confidence -= 10
        notes.append("Seller rating is unavailable.")

    freshness_score, freshness_label = _freshness_score(listing.posted_time)
    if freshness_score >= 80:
        notes.append("Recent listing can move quickly.")
    elif freshness_score <= 45:
        notes.append("Older listing may give negotiation leverage.")

    confidence = max(0, min(100, confidence))
    return PlatformSignal(
        listing_id=listing.id,
        source=source,
        source_confidence_score=confidence,
        source_confidence_label=_confidence_label(confidence),
        freshness_score=freshness_score,
        freshness_label=freshness_label,
        notes=notes[:4],
    )


def _freshness_score(posted_time: str) -> tuple[int, str]:
    text = posted_time.lower()
    if any(term in text for term in ("minute", "hour", "today", "just", "recent")):
        return 90, "fresh"
    if any(term in text for term in ("yesterday", "1 day", "2 days", "3 days")):
        return 75, "recent"
    if any(term in text for term in ("week", "7 days", "14 days")):
        return 55, "aging"
    if any(term in text for term in ("month", "year", "old")):
        return 35, "stale"
    return 58, "unknown"


def _confidence_label(score: int) -> str:
    if score >= 80:
        return "high"
    if score >= 55:
        return "medium"
    return "low"


def _duplicate_signal(listings: list[Listing], signal_type: str, confidence: float) -> DuplicateSignal:
    return DuplicateSignal(
        listing_ids=[listing.id for listing in listings],
        titles=list(dict.fromkeys(listing.title for listing in listings))[:3],
        signal_type=signal_type,
        confidence=confidence,
        explanation="Similar listing identity appeared more than once; verify seller and listing details before trusting the price.",
    )


def _dedupe_duplicate_signals(signals: list[DuplicateSignal]) -> list[DuplicateSignal]:
    seen: set[str] = set()
    unique: list[DuplicateSignal] = []
    for signal in signals:
        key = ":".join(sorted(signal.listing_ids))
        if key in seen:
            continue
        seen.add(key)
        unique.append(signal)
    return unique


def _title_fingerprint(title: str) -> str:
    words = [word for word in re.findall(r"[a-z0-9]+", title.lower()) if len(word) > 2]
    return "-".join(words[:8])


def _display_source(source: str) -> str:
    normalized = source.lower().replace("apify_", "").replace("_", " ").strip()
    if "google" in normalized:
        return "Google"
    if "olx" in normalized:
        return "OLX"
    if "ebay" in normalized:
        return "eBay"
    if "facebook" in normalized:
        return "Facebook"
    return normalized.title() or "Marketplace"
