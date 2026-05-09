from app.models.analysis import DealAnalysis, RankingAnalysis, RiskAnalysis
from app.models.listing import Listing


AnalyzedListing = tuple[Listing, DealAnalysis, RiskAnalysis]


def rank_listings(analyzed: list[AnalyzedListing]) -> tuple[list[tuple[Listing, DealAnalysis, RiskAnalysis, RankingAnalysis]], str | None, list[str], str]:
    scored: list[tuple[float, Listing, DealAnalysis, RiskAnalysis]] = []
    for listing, deal_analysis, risk_analysis in analyzed:
        final_score = deal_analysis.deal_score - (risk_analysis.risk_score * 0.6)
        if risk_analysis.risk_level == "high":
            final_score = min(final_score, 58)
        scored.append((round(final_score, 2), listing, deal_analysis, risk_analysis))

    scored.sort(key=lambda item: item[0], reverse=True)

    ranked: list[tuple[Listing, DealAnalysis, RiskAnalysis, RankingAnalysis]] = []
    avoid_ids: list[str] = []

    for index, (final_score, listing, deal_analysis, risk_analysis) in enumerate(scored, start=1):
        label = _label(final_score, deal_analysis, risk_analysis)
        if label == "Avoid":
            avoid_ids.append(listing.id)
        ranking = RankingAnalysis(
            listing_id=listing.id,
            rank=index,
            final_score=final_score,
            recommendation_label=label,
            ranking_reason=_ranking_reason(label, deal_analysis, risk_analysis),
        )
        ranked.append((listing, deal_analysis, risk_analysis, ranking))

    best_id = ranked[0][0].id if ranked else None
    summary = _summary(ranked, avoid_ids)
    return ranked, best_id, avoid_ids, summary


def _label(final_score: float, deal_analysis: DealAnalysis, risk_analysis: RiskAnalysis) -> str:
    if risk_analysis.risk_level == "high" or risk_analysis.risk_score >= 66:
        return "Avoid"
    if deal_analysis.price_position == "overpriced":
        return "Overpriced"
    if final_score >= 78:
        return "Best Overall"
    if final_score >= 62:
        return "Good Deal"
    if final_score >= 42:
        return "Negotiate Carefully"
    return "Avoid"


def _ranking_reason(label: str, deal_analysis: DealAnalysis, risk_analysis: RiskAnalysis) -> str:
    if label == "Best Overall":
        return "Highest balance of deal quality, seller trust, condition, and manageable risk."
    if label == "Good Deal":
        return "Good value if verification checks pass."
    if label == "Negotiate Carefully":
        return "Potential value exists, but risk or missing information should shape the offer."
    if label == "Overpriced":
        return "Price is above the fair estimate or stated budget."
    return f"Risk level is {risk_analysis.risk_level} with score {risk_analysis.risk_score}/100."


def _summary(
    ranked: list[tuple[Listing, DealAnalysis, RiskAnalysis, RankingAnalysis]],
    avoid_ids: list[str],
) -> str:
    if not ranked:
        return "No listings were available to rank."
    best = ranked[0]
    return (
        f"Best recommendation is {best[0].title} with final score {best[3].final_score:.1f}. "
        f"{len(avoid_ids)} listing(s) were marked avoid due to risk or weak value."
    )
