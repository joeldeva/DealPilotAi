from pydantic import BaseModel


class NegotiationDraft(BaseModel):
    listing_id: str
    opening_message: str
    target_price: int
    maximum_recommended_price: int
    counter_offer_strategy: str
    tone: str
    justification_points: list[str]
    followup_message: str
    questions_to_ask_seller: list[str]
    walkaway_conditions: list[str]
