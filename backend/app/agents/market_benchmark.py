from statistics import median

from app.models.analysis import ListingBenchmark, MarketBenchmark
from app.models.listing import Listing


def calculate_market_benchmark(listings: list[Listing], best_listing_id: str | None = None) -> MarketBenchmark:
    valid_prices = [int(listing.price) for listing in listings if int(listing.price or 0) > 0]
    currency = listings[0].currency if listings else "INR"

    if not valid_prices:
        return MarketBenchmark(
            median_price=0,
            lowest_price=0,
            highest_price=0,
            listing_count=0,
            currency=currency,
            summary="No valid listing prices were available for market benchmarking.",
        )

    median_price = int(round(median(valid_prices)))
    lowest_price = min(valid_prices)
    highest_price = max(valid_prices)

    listing_benchmarks: list[ListingBenchmark] = []
    for listing in listings:
        price = int(listing.price or 0)
        percent = round(((price - median_price) / median_price) * 100, 1) if median_price else 0.0
        listing_benchmarks.append(
            ListingBenchmark(
                listing_id=listing.id,
                title=listing.title,
                price=price,
                price_vs_median_percent=percent,
                price_band=_price_band(percent),
                outlier_status=_outlier_status(percent),
            )
        )

    best_benchmark = next((item for item in listing_benchmarks if item.listing_id == best_listing_id), None)
    if best_benchmark:
        delta = abs(best_benchmark.price_vs_median_percent)
        if delta < 0.1:
            summary = f"Best recommendation sits at the market median of {currency} {median_price:,}."
        else:
            direction = "below" if best_benchmark.price_vs_median_percent < 0 else "above"
            summary = f"Best recommendation is {delta:.1f}% {direction} the market median of {currency} {median_price:,}."
    else:
        summary = f"Market median is {currency} {median_price:,} across {len(valid_prices)} comparable listing(s)."

    return MarketBenchmark(
        median_price=median_price,
        lowest_price=lowest_price,
        highest_price=highest_price,
        listing_count=len(valid_prices),
        currency=currency,
        listing_benchmarks=listing_benchmarks,
        best_listing_benchmark=best_benchmark,
        summary=summary,
    )


def _price_band(percent: float) -> str:
    if percent <= -25:
        return "suspiciously_low"
    if percent <= -10:
        return "below_market"
    if percent <= 10:
        return "market_average"
    if percent <= 25:
        return "above_market"
    return "premium"


def _outlier_status(percent: float) -> str:
    if percent <= -30:
        return "low_outlier"
    if percent >= 35:
        return "high_outlier"
    return "normal"
