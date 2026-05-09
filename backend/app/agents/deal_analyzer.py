from app.models.analysis import DealAnalysis, ParsedIntent
from app.models.listing import Listing
from app.services.llm_service import LLMService


BASELINE_PRICES = {
    "iphone14": 42000,
    "iphone": 42000,
    "ps5": 34000,
    "macbook": 58000,
    "laptop": 52000,
    "camera": 45000,
    "phone": 30000,
}

GOOD_CONDITION_KEYWORDS = {"like new", "excellent", "good", "mint", "clean", "single owner"}
POOR_CONDITION_KEYWORDS = {"fair", "damaged", "repair", "fault", "cracked", "needs repair", "issue"}
DOCUMENT_KEYWORDS = {"bill", "box", "warranty", "invoice", "charger", "accessories"}
URGENT_KEYWORDS = {"urgent sale", "only today", "need money", "need money fast"}


def analyze_deal(parsed_intent: ParsedIntent, listing: Listing) -> DealAnalysis:
    text = f"{listing.title} {listing.description} {listing.condition}".lower()
    fair_price = _estimate_fair_price(parsed_intent, listing)
    product_match_score, product_match_flag = _product_match(parsed_intent, listing)
    seller_quality_score = _seller_score(listing)
    condition_score = _condition_score(text)
    description_quality_score = _description_score(listing.description)
    price_position = _price_position(listing.price, fair_price)

    score = 50
    value_flags: list[str] = []

    if product_match_score >= 85:
        score += 20
        value_flags.append("strong_product_match")
    elif product_match_score >= 45:
        score += 8
        value_flags.append("partial_product_match")
    else:
        score -= 12
        value_flags.append("weak_product_match")

    if parsed_intent.max_budget:
        if listing.price <= parsed_intent.max_budget:
            score += 15
            value_flags.append("within_budget")
            if listing.price <= parsed_intent.max_budget * 0.9:
                score += 10
                value_flags.append("10_to_20_percent_below_budget")
        else:
            score -= 20
            value_flags.append("over_budget")

    if listing.seller_rating is None:
        score -= 10
        value_flags.append("missing_seller_rating")
    elif listing.seller_rating >= 4.5:
        score += 10
        value_flags.append("high_seller_rating")
    elif listing.seller_rating >= 3.5:
        score += 5
        value_flags.append("acceptable_seller_rating")
    else:
        score -= 10
        value_flags.append("low_seller_rating")

    if any(keyword in text for keyword in GOOD_CONDITION_KEYWORDS):
        score += 10
        value_flags.append("good_condition_signals")
    if any(keyword in text for keyword in POOR_CONDITION_KEYWORDS):
        score -= 15
        value_flags.append("poor_condition_signals")

    if description_quality_score < 45:
        score -= 10
        value_flags.append("vague_description")
    else:
        value_flags.append("useful_description")

    if any(keyword in text for keyword in DOCUMENT_KEYWORDS):
        score += 8
        value_flags.append("documents_or_accessories_mentioned")

    if price_position == "suspiciously_low":
        score -= 20
        value_flags.append("suspiciously_low_price")
    elif price_position == "excellent":
        score += 12
        value_flags.append("excellent_price_position")
    elif price_position == "overpriced":
        score -= 12
        value_flags.append("overpriced")

    if any(keyword in text for keyword in URGENT_KEYWORDS):
        score -= 8
        value_flags.append("urgent_sale_language")

    deal_score = max(0, min(100, score))
    negotiation_target = _negotiation_target(listing.price, fair_price, parsed_intent.currency)
    reasoning = _reasoning(deal_score, price_position, product_match_flag, listing, parsed_intent)

    return DealAnalysis(
        listing_id=listing.id,
        deal_score=deal_score,
        fair_price_estimate=fair_price,
        negotiation_target_price=negotiation_target,
        price_position=price_position,
        product_match_score=product_match_score,
        seller_quality_score=seller_quality_score,
        condition_score=condition_score,
        description_quality_score=description_quality_score,
        reasoning=reasoning,
        value_flags=value_flags,
    )


def _estimate_fair_price(parsed_intent: ParsedIntent, listing: Listing) -> int:
    key = listing.product_key.lower()
    model = parsed_intent.target_model.lower()
    if "iphone 14" in model or key == "iphone14":
        baseline = BASELINE_PRICES["iphone14"]
    elif "ps5" in model or key == "ps5":
        baseline = BASELINE_PRICES["ps5"]
    elif "macbook" in model or key == "macbook":
        baseline = BASELINE_PRICES["macbook"]
    elif parsed_intent.product_type in BASELINE_PRICES:
        baseline = BASELINE_PRICES[parsed_intent.product_type]
    else:
        baseline = int(listing.price * 0.92)

    condition = listing.condition.lower()
    if "like new" in condition or "mint" in condition:
        return int(baseline * 1.04)
    if "excellent" in condition:
        return baseline
    if "good" in condition:
        return int(baseline * 0.94)
    if "fair" in condition:
        return int(baseline * 0.84)
    if "repair" in condition or "damaged" in condition:
        return int(baseline * 0.65)
    return baseline


def _product_match(parsed_intent: ParsedIntent, listing: Listing) -> tuple[int, str]:
    title = listing.title.lower()
    description = listing.description.lower()
    combined = f"{title} {description}"
    target = parsed_intent.target_model.lower()
    target_terms = [term for term in target.replace("-", " ").split() if len(term) > 1]
    matched_terms = sum(1 for term in target_terms if term in combined)

    if target_terms and matched_terms == len(target_terms):
        return 95, "exact model match"
    if target_terms and matched_terms:
        return 65, "partial model match"
    if parsed_intent.product_type in combined or listing.product_key in target.replace(" ", ""):
        return 55, "category match"
    return 20, "weak match"


def _seller_score(listing: Listing) -> int:
    if listing.seller_rating is None:
        return 35
    return max(0, min(100, int(listing.seller_rating * 20)))


def _condition_score(text: str) -> int:
    if any(keyword in text for keyword in ["like new", "mint", "excellent"]):
        return 92
    if any(keyword in text for keyword in ["good", "clean", "single owner"]):
        return 78
    if any(keyword in text for keyword in ["repair", "damaged", "cracked", "fault"]):
        return 30
    if "fair" in text:
        return 50
    return 60


def _description_score(description: str) -> int:
    length = len(description.strip())
    if length >= 120:
        return 90
    if length >= 70:
        return 72
    if length >= 45:
        return 55
    return 30


def _price_position(price: int, fair_price: int) -> str:
    if fair_price <= 0:
        return "fair"
    ratio = price / fair_price
    if ratio < 0.7:
        return "suspiciously_low"
    if ratio <= 0.9:
        return "excellent"
    if ratio <= 1.08:
        return "fair"
    return "overpriced"


def _negotiation_target(price: int, fair_price: int, currency: str) -> int:
    discount = 0.15 if price > fair_price else 0.1
    target = int(price * (1 - discount))
    floor = int(fair_price * 0.7)
    target = max(target, floor)
    if currency == "INR":
        return max(500, int(round(target / 500) * 500))
    return max(1, int(round(target)))


def _reasoning(
    deal_score: int,
    price_position: str,
    product_match_flag: str,
    listing: Listing,
    parsed_intent: ParsedIntent,
) -> str:
    budget_phrase = (
        f"against the {parsed_intent.currency} {parsed_intent.max_budget:,} budget"
        if parsed_intent.max_budget
        else "against the buyer goal"
    )
    if deal_score >= 80:
        return (
            f"Strong candidate: {product_match_flag}, {price_position} price position, "
            f"and seller/condition signals look favorable {budget_phrase}."
        )
    if deal_score >= 60:
        return (
            f"Shortlist with checks: {listing.title} has {price_position} pricing and enough matching signals, "
            "but verify documents and condition before committing."
        )
    return (
        f"Lower priority: {price_position} pricing or trust signals weaken this listing despite matching parts of the goal."
    )


def polish_deal_reasoning(
    parsed_intent: ParsedIntent,
    listing: Listing,
    deal_analysis: DealAnalysis,
    llm_service: LLMService,
    use_live_llm: bool = False,
    confirm_live_llm: bool = False,
) -> tuple[str, bool]:
    prompt = (
        "Rewrite this deal explanation in one concise buyer-friendly sentence. "
        "Do not add facts. Keep it ethical and practical.\n\n"
        f"Buyer intent: {parsed_intent.parsed_summary}\n"
        f"Listing: {listing.title}, price {listing.currency} {listing.price}, condition {listing.condition}\n"
        f"Deal score: {deal_analysis.deal_score}/100\n"
        f"Risk-neutral reasoning: {deal_analysis.reasoning}"
    )
    result = llm_service.generate_with_optional_llm(
        prompt=prompt,
        fallback_text=deal_analysis.reasoning,
        use_live_llm=use_live_llm,
        confirm_live_llm=confirm_live_llm,
        purpose="deal_reasoning_polish",
    )
    return str(result["text"]), bool(result["llm_called"])
