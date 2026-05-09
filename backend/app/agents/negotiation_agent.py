from app.models.analysis import DealAnalysis, ParsedIntent, RiskAnalysis
from app.models.listing import Listing
from app.models.negotiation import NegotiationDraft
from app.services.llm_service import LLMService


def generate_negotiation_draft(
    parsed_intent: ParsedIntent,
    listing: Listing,
    deal_analysis: DealAnalysis,
    risk_analysis: RiskAnalysis,
    recommendation_label: str,
    tone: str = "polite",
) -> NegotiationDraft:
    target = deal_analysis.negotiation_target_price
    maximum = _maximum_recommended_price(parsed_intent, deal_analysis, risk_analysis)
    verification_phrase = _verification_phrase(parsed_intent, risk_analysis)
    risk_phrase = _risk_phrase(risk_analysis)

    opening = (
        f"Hi {listing.seller_name}, I am interested in your {listing.title}. "
        f"Based on similar used-market pricing and the listing details, would you be open to "
        f"{_money(target, parsed_intent.currency)} {verification_phrase}?"
    )

    strategy = _strategy(recommendation_label, risk_analysis)
    followup = (
        f"Thanks for considering it. If {_money(target, parsed_intent.currency)} is too low, "
        f"I can consider moving closer to {_money(maximum, parsed_intent.currency)} after the key checks are verified."
    )

    justification_points = [
        f"Listed price is {_money(listing.price, parsed_intent.currency)}",
        f"Estimated fair price is {_money(deal_analysis.fair_price_estimate, parsed_intent.currency)}",
        f"Deal label: {recommendation_label}",
        f"Risk posture: {risk_analysis.risk_level}",
    ]
    if risk_phrase:
        justification_points.append(risk_phrase)

    return NegotiationDraft(
        listing_id=listing.id,
        opening_message=opening,
        target_price=target,
        maximum_recommended_price=maximum,
        counter_offer_strategy=strategy,
        tone=tone,
        justification_points=justification_points,
        followup_message=followup,
        questions_to_ask_seller=_questions(parsed_intent),
        walkaway_conditions=_walkaway_conditions(parsed_intent, risk_analysis, maximum),
    )


def _maximum_recommended_price(
    parsed_intent: ParsedIntent,
    deal_analysis: DealAnalysis,
    risk_analysis: RiskAnalysis,
) -> int:
    risk_multiplier = 0.96 if risk_analysis.risk_level == "medium" else 0.9 if risk_analysis.risk_level == "high" else 1.05
    maximum = int(deal_analysis.fair_price_estimate * risk_multiplier)
    if parsed_intent.max_budget:
        maximum = min(maximum, parsed_intent.max_budget)
    if parsed_intent.currency == "INR":
        maximum = int(round(maximum / 500) * 500)
    return max(maximum, deal_analysis.negotiation_target_price)


def _verification_phrase(parsed_intent: ParsedIntent, risk_analysis: RiskAnalysis) -> str:
    if parsed_intent.product_type == "phone":
        base = "if battery health, IMEI, bill, and condition check out"
    elif parsed_intent.target_model.lower() == "ps5" or parsed_intent.product_type == "console":
        base = "if the console, controllers, and bill check out during testing"
    elif parsed_intent.product_type == "laptop":
        base = "if battery cycles, charger, display, keyboard, and bill check out"
    elif parsed_intent.product_type == "camera":
        base = "if shutter count, lens condition, and bill check out"
    else:
        base = "if the item condition and ownership details check out"

    if risk_analysis.risk_level != "low":
        return f"{base} and there is no advance payment"
    return base


def _risk_phrase(risk_analysis: RiskAnalysis) -> str | None:
    meaningful_flags = [flag for flag in risk_analysis.risk_flags if flag != "no_major_risk_signals"]
    if not meaningful_flags:
        return None
    return f"Verify these risk signals first: {', '.join(meaningful_flags[:3]).replace('_', ' ')}"


def _strategy(recommendation_label: str, risk_analysis: RiskAnalysis) -> str:
    if recommendation_label == "Best Overall":
        return "Open below fair value, move only after verification, and close locally if checks pass."
    if recommendation_label == "Good Deal":
        return "Use a firm but fair opening offer and ask for proof before increasing."
    if recommendation_label == "Negotiate Carefully":
        return "Treat the offer as conditional on documents, testing, and no advance payment."
    if recommendation_label == "Overpriced":
        return "Anchor near fair value and avoid chasing the seller above the walkaway price."
    return "Do not proceed unless the seller can remove the main risk signals through verifiable proof."


def _questions(parsed_intent: ParsedIntent) -> list[str]:
    if parsed_intent.product_type == "phone":
        return [
            "What is the battery health percentage?",
            "Is the original bill and box available?",
            "Is any warranty remaining?",
            "Has the phone had any repairs or part replacements?",
            "Can the IMEI/serial number be verified in person?",
        ]
    if parsed_intent.target_model.lower() == "ps5" or parsed_intent.product_type == "console":
        return [
            "Are both controllers working without drift?",
            "Is the original bill available?",
            "Is any warranty remaining?",
            "Has the console had overheating or shutdown issues?",
            "Which games and accessories are included?",
        ]
    if parsed_intent.product_type == "laptop":
        return [
            "What is the battery cycle count and battery health?",
            "Is the original bill available?",
            "Is the original charger included?",
            "Has the laptop had any repairs?",
            "Are the display, keyboard, trackpad, and ports working properly?",
        ]
    if parsed_intent.product_type == "camera":
        return [
            "What is the shutter count?",
            "Is the bill available?",
            "Are there any lens fungus, sensor dust, or autofocus issues?",
            "Which lenses, batteries, charger, and accessories are included?",
        ]
    return [
        "Is the bill or ownership proof available?",
        "Can I inspect and test the item before payment?",
        "Are there any repairs, defects, or missing accessories?",
    ]


def _walkaway_conditions(parsed_intent: ParsedIntent, risk_analysis: RiskAnalysis, maximum: int) -> list[str]:
    conditions = [
        f"Seller will not go at or below {_money(maximum, parsed_intent.currency)}.",
        "Seller asks for advance payment before inspection.",
        "Seller refuses public-place inspection or local pickup.",
        "Item condition does not match the listing.",
    ]
    if parsed_intent.product_type == "phone":
        conditions.append("IMEI, battery health, or activation lock checks fail.")
    if parsed_intent.product_type == "laptop":
        conditions.append("Battery, display, keyboard, charger, or repair history checks fail.")
    if parsed_intent.product_type == "console":
        conditions.append("Controller drift, overheating, or warranty claims cannot be checked.")
    if risk_analysis.risk_level == "high":
        conditions.append("Any high-risk signal remains unresolved.")
    return conditions


def _money(value: int, currency: str) -> str:
    if currency == "INR":
        return f"INR {value:,}"
    if currency == "USD":
        return f"USD {value:,}"
    return f"{currency} {value:,}"


def polish_opening_message(
    parsed_intent: ParsedIntent,
    listing: Listing,
    draft: NegotiationDraft,
    llm_service: LLMService,
    use_live_llm: bool = False,
    confirm_live_llm: bool = False,
) -> tuple[str, bool]:
    prompt = (
        "Polish this negotiation draft into a concise, polite marketplace message. "
        "Do not invent facts, do not pressure the seller, and keep the target price unchanged.\n\n"
        f"Buyer intent: {parsed_intent.parsed_summary}\n"
        f"Listing: {listing.title}\n"
        f"Target price: {_money(draft.target_price, parsed_intent.currency)}\n"
        f"Draft: {draft.opening_message}"
    )
    result = llm_service.generate_with_optional_llm(
        prompt=prompt,
        fallback_text=draft.opening_message,
        use_live_llm=use_live_llm,
        confirm_live_llm=confirm_live_llm,
        purpose="negotiation_message_polish",
    )
    return str(result["text"]), bool(result["llm_called"])
