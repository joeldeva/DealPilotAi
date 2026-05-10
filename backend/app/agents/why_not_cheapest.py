from app.models.analysis import WhyNotCheapest
from app.models.api import RankedDeal


def explain_why_not_cheapest(ranked_results: list[RankedDeal]) -> WhyNotCheapest:
    if not ranked_results:
        return WhyNotCheapest(explanation="No ranked listings were available for cheapest-listing comparison.")

    best = ranked_results[0]
    cheapest = min(ranked_results, key=lambda item: item.listing.price)
    cheapest_selected = cheapest.listing.id == best.listing.id

    factors: list[str] = []
    if cheapest.risk_analysis.risk_flags:
        factors.append(f"Risk signals: {', '.join(cheapest.risk_analysis.risk_flags[:4])}.")
    if cheapest.risk_analysis.risk_score > best.risk_analysis.risk_score:
        factors.append(
            f"Cheapest risk score is {cheapest.risk_analysis.risk_score}/100 versus {best.risk_analysis.risk_score}/100 for the selected deal."
        )
    if cheapest.deal_analysis.price_position == "suspiciously_low":
        factors.append("Cheapest listing is priced far below expected value, so verification matters more than discount.")
    if cheapest.listing.seller_rating is None:
        factors.append("Cheapest listing is missing seller rating.")
    if cheapest.ranking.recommendation_label in {"Avoid", "Negotiate Carefully"}:
        factors.append(f"Cheapest listing was labelled {cheapest.ranking.recommendation_label}.")

    if cheapest_selected:
        explanation = (
            "DealPilot selected the cheapest listing because it also had the strongest balance of deal score, risk score, "
            "and negotiation upside. The buyer should still complete the product-specific checklist before payment."
        )
        if not factors:
            factors.append("Cheapest listing also ranked best overall after risk adjustment.")
    else:
        explanation = (
            "DealPilot did not pick the cheapest listing because the final ranking discounts price when risk signals, missing "
            "seller information, or suspiciously low pricing reduce buyer confidence."
        )
        if not factors:
            factors.append("Selected listing had a stronger risk-adjusted final score than the cheapest option.")

    return WhyNotCheapest(
        cheapest_listing_id=cheapest.listing.id,
        cheapest_listing_title=cheapest.listing.title,
        cheapest_price=cheapest.listing.price,
        best_listing_id=best.listing.id,
        best_listing_title=best.listing.title,
        best_price=best.listing.price,
        cheapest_selected=cheapest_selected,
        explanation=explanation,
        decision_factors=factors[:5],
    )
