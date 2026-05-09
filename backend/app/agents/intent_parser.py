import re

from app.models.analysis import ParsedIntent


MODEL_PATTERNS = [
    (r"\biphone\s*14\b", "phone", "iPhone 14", 0.96),
    (r"\biphone\b", "phone", "iPhone", 0.78),
    (r"\bps5\b|\bplaystation\s*5\b", "console", "PS5", 0.95),
    (r"\bmacbook\s+air\s+m1\b", "laptop", "MacBook Air M1", 0.95),
    (r"\bmacbook\b", "laptop", "MacBook", 0.86),
    (r"\blaptop\b", "laptop", "Laptop", 0.72),
    (r"\bcamera\b|\bdslr\b|\bmirrorless\b", "camera", "Camera", 0.72),
    (r"\bphone\b|\bsmartphone\b|\bmobile\b", "phone", "Phone", 0.68),
]

MUST_HAVE_PATTERNS = [
    (r"good battery health|battery health", "good battery health"),
    (r"\bbill\b|invoice", "bill available"),
    (r"\bbox\b", "original box"),
    (r"warranty", "warranty"),
    (r"controller", "controller included"),
    (r"charger", "charger included"),
]

AVOID_PATTERNS = [
    (r"no repair|without repair", "repair history"),
    (r"no damage|without damage", "damage"),
    (r"no advance|without advance", "advance payment"),
]


def parse_intent(user_goal: str) -> ParsedIntent:
    text = user_goal.strip()
    normalized = text.lower()
    product_type = "marketplace_item"
    target_model = "Used item"
    confidence = 0.55

    for pattern, detected_type, detected_model, detected_confidence in MODEL_PATTERNS:
        if re.search(pattern, normalized, flags=re.IGNORECASE):
            product_type = detected_type
            target_model = detected_model
            confidence = detected_confidence
            break

    budget, currency = _extract_budget_and_currency(text)
    must_have = _extract_matches(normalized, MUST_HAVE_PATTERNS)
    avoid = _extract_matches(normalized, AVOID_PATTERNS)
    location = _extract_location(text)
    urgency = _extract_urgency(normalized)

    budget_text = f" under {currency} {budget:,}" if budget else ""
    feature_text = f" with {', '.join(must_have)}" if must_have else ""
    location_text = f" near {location}" if location else ""
    parsed_summary = f"Looking for {target_model}{budget_text}{feature_text}{location_text}."

    return ParsedIntent(
        product_type=product_type,
        target_model=target_model,
        max_budget=budget,
        currency=currency,
        must_have_features=must_have,
        avoid_features=avoid,
        location_preference=location,
        urgency_level=urgency,
        confidence=confidence,
        parsed_summary=parsed_summary,
    )


def _extract_budget_and_currency(text: str) -> tuple[int | None, str]:
    normalized = text.replace(",", "")
    currency = "INR"
    if "$" in normalized or re.search(r"\busd\b", normalized, flags=re.IGNORECASE):
        currency = "USD"
    if "\u20b9" in normalized or re.search(r"\binr\b|\brs\.?\b", normalized, flags=re.IGNORECASE):
        currency = "INR"

    candidates = re.findall(r"(?:\u20b9|rs\.?|inr|\$|usd)?\s*(\d{4,7})", normalized, flags=re.IGNORECASE)
    numbers = [int(value) for value in candidates]
    return (max(numbers), currency) if numbers else (None, currency)


def _extract_matches(text: str, patterns: list[tuple[str, str]]) -> list[str]:
    matches: list[str] = []
    for pattern, label in patterns:
        if re.search(pattern, text, flags=re.IGNORECASE) and label not in matches:
            matches.append(label)
    return matches


def _extract_location(text: str) -> str | None:
    match = re.search(r"\b(?:in|near|around)\s+([A-Za-z][A-Za-z\s]{2,30})", text)
    if not match:
        return None
    location = match.group(1).strip()
    location = re.split(r"\b(?:under|with|and|for)\b", location, maxsplit=1, flags=re.IGNORECASE)[0].strip()
    return location or None


def _extract_urgency(text: str) -> str:
    if any(term in text for term in ["today", "asap", "urgent", "quickly", "this week"]):
        return "high"
    if any(term in text for term in ["soon", "next week"]):
        return "medium"
    return "normal"
