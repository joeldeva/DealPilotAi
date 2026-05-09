from pydantic import BaseModel, Field


class ParsedIntent(BaseModel):
    product_type: str
    target_model: str
    max_budget: int | None = None
    currency: str = "INR"
    must_have_features: list[str] = Field(default_factory=list)
    avoid_features: list[str] = Field(default_factory=list)
    location_preference: str | None = None
    urgency_level: str = "normal"
    confidence: float = Field(ge=0, le=1)
    parsed_summary: str


class DealAnalysis(BaseModel):
    listing_id: str
    deal_score: int = Field(ge=0, le=100)
    fair_price_estimate: int
    negotiation_target_price: int
    price_position: str
    product_match_score: int = Field(ge=0, le=100)
    seller_quality_score: int = Field(ge=0, le=100)
    condition_score: int = Field(ge=0, le=100)
    description_quality_score: int = Field(ge=0, le=100)
    reasoning: str
    value_flags: list[str]


class RiskAnalysis(BaseModel):
    listing_id: str
    risk_level: str
    risk_score: int = Field(ge=0, le=100)
    risk_flags: list[str]
    explanation: str
    safety_advice: list[str]


class RankingAnalysis(BaseModel):
    listing_id: str
    rank: int
    final_score: float
    recommendation_label: str
    ranking_reason: str
