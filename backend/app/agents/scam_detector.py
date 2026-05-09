from app.models.analysis import DealAnalysis, ParsedIntent, RiskAnalysis
from app.models.listing import Listing


def detect_scam_risk(parsed_intent: ParsedIntent, listing: Listing, deal_analysis: DealAnalysis) -> RiskAnalysis:
    title = listing.title.lower()
    description = listing.description.lower()
    text = f"{title} {description} {listing.condition.lower()}"
    flags: list[str] = []
    score = 0

    score += _flag_if_any(text, ["urgent sale", "only today", "need money fast"], 15, "urgency_pressure", flags)
    score += _flag_if_any(text, ["pay advance", "advance payment", "token amount"], 30, "advance_payment_request", flags)
    score += _flag_if_any(text, ["no bill"], 15, "no_bill", flags)
    score += _flag_if_any(text, ["no warranty"], 8, "no_warranty", flags)
    score += _flag_if_any(text, ["shipping only", "courier only", "no pickup"], 20, "shipping_only", flags)
    score += _flag_if_any(text, ["upi first", "bank transfer first", "outside app", "external payment"], 25, "external_payment_language", flags)
    score += _flag_if_any(text, ["damaged", "repair", "repaired", "fault", "cracked"], 15, "damage_or_repair_history", flags)

    if listing.seller_rating is None:
        score += 15
        flags.append("seller_rating_missing")
    elif listing.seller_rating < 3.5:
        score += 12
        flags.append("low_seller_rating")

    if listing.price < deal_analysis.fair_price_estimate * 0.7:
        score += 25
        flags.append("price_far_below_fair_value")

    if len(listing.description.strip()) < 45:
        score += 15
        flags.append("vague_description")

    if _title_description_mismatch(parsed_intent, title, description):
        score += 20
        flags.append("title_description_mismatch")

    risk_score = max(0, min(100, score))
    if risk_score <= 30:
        risk_level = "low"
    elif risk_score <= 65:
        risk_level = "medium"
    else:
        risk_level = "high"

    if not flags:
        flags.append("no_major_risk_signals")

    return RiskAnalysis(
        listing_id=listing.id,
        risk_level=risk_level,
        risk_score=risk_score,
        risk_flags=flags,
        explanation=_explanation(risk_level, flags),
        safety_advice=_safety_advice(parsed_intent, flags),
    )


def _flag_if_any(text: str, terms: list[str], weight: int, flag: str, flags: list[str]) -> int:
    if any(term in text for term in terms):
        flags.append(flag)
        return weight
    return 0


def _title_description_mismatch(parsed_intent: ParsedIntent, title: str, description: str) -> bool:
    target_terms = [term for term in parsed_intent.target_model.lower().split() if len(term) > 1]
    if not target_terms:
        return False
    title_mentions = any(term in title for term in target_terms)
    description_mentions = any(term in description for term in target_terms)
    return title_mentions and not description_mentions and len(description) < 80


def _explanation(risk_level: str, flags: list[str]) -> str:
    if risk_level == "low":
        return "Low risk based on available mock listing signals, but still verify the item before payment."
    if risk_level == "medium":
        return f"Medium risk: {', '.join(flags[:3]).replace('_', ' ')} should be checked before negotiating seriously."
    return f"High risk: {', '.join(flags[:4]).replace('_', ' ')} make this listing unsafe without strong verification."


def _safety_advice(parsed_intent: ParsedIntent, flags: list[str]) -> list[str]:
    advice = [
        "Meet in a public place and prefer local pickup.",
        "Test the device before making payment.",
        "Avoid advance payment or token transfers.",
        "Ask for bill, box, warranty status, and matching seller ID where appropriate.",
    ]

    if parsed_intent.product_type == "phone":
        advice.extend(
            [
                "Check battery health in settings.",
                "Verify IMEI/serial number and ensure the device is not activation locked.",
            ]
        )
    elif parsed_intent.target_model.lower() == "ps5" or parsed_intent.product_type == "console":
        advice.extend(
            [
                "Test both controllers, HDMI output, disc drive if applicable, and overheating behavior.",
                "Confirm included games and accessories before agreeing on price.",
            ]
        )
    elif parsed_intent.product_type == "laptop":
        advice.extend(
            [
                "Check battery cycle count, charger condition, display, keyboard, and trackpad.",
                "Confirm repairs or service history before payment.",
            ]
        )
    elif parsed_intent.product_type == "camera":
        advice.extend(
            [
                "Check shutter count, lens fungus, autofocus, sensor dust, and included accessories.",
            ]
        )

    if "no_bill" in flags:
        advice.append("Treat missing bill as a negotiation and verification risk.")
    if "shipping_only" in flags:
        advice.append("Prefer in-person inspection over shipping-only deals.")

    return advice
