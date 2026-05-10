from typing import Any
from pydantic import BaseModel, Field

from .analysis import (
    DealAnalysis,
    MarketBenchmark,
    ParsedIntent,
    ProductSafetyChecklist,
    RankingAnalysis,
    RealDataEvidence,
    RiskAnalysis,
    WhyNotCheapest,
)
from .listing import Listing
from .negotiation import NegotiationDraft


class SearchRequest(BaseModel):
    user_goal: str = Field(default="Find me a used iPhone 14 under INR 45000")
    mode: str = "mock"
    use_live_apify: bool = False
    confirm_live_run: bool = False
    apify_source: str | None = None
    max_items: int = 10
    use_live_llm: bool = False
    confirm_live_llm: bool = False
    save_report: bool = True


class AnalyzeRequest(BaseModel):
    user_goal: str
    listing: Listing


class NegotiationRequest(BaseModel):
    user_goal: str
    listing: Listing
    deal_analysis: DealAnalysis | None = None
    risk_analysis: RiskAnalysis | None = None
    tone: str = "polite"


class RankedDeal(BaseModel):
    listing: Listing
    deal_analysis: DealAnalysis
    risk_analysis: RiskAnalysis
    ranking: RankingAnalysis
    negotiation: NegotiationDraft


class CreditSafety(BaseModel):
    apify_live_mode: bool = False
    apify_called: bool = False
    apify_cache_used: bool = False
    llm_live_mode: bool = False
    llm_called: bool = False
    live_llm_confirmed: bool = False
    zynd_called: bool = False
    superplane_called: bool = False
    max_items_requested: int = 10
    max_items_used: int = 10
    live_run_confirmed: bool = False


class AgentTraceStep(BaseModel):
    step: str
    status: str
    details: str
    summary: str


class AgentCard(BaseModel):
    name: str
    description: str
    version: str
    status: str
    category: str | None = None
    tags: list[str] = Field(default_factory=list)
    summary: str | None = None
    capabilities: list[str]
    endpoints: Any
    pricing: dict[str, Any] | None = None
    updated_at: str | None = None
    zynd_ready: bool = False
    sponsor_integration: str
    credit_safety: dict[str, Any]


class ZyndStatus(BaseModel):
    zynd_enabled: bool
    sdk_available: bool
    keypair_configured: bool
    agent_name: str
    mode: str
    zynd_called: bool = False


class WorkflowEvent(BaseModel):
    id: str
    timestamp: str
    event_type: str
    status: str
    details: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SuperplaneStatus(BaseModel):
    superplane_enabled: bool
    local_workflow_events_enabled: bool
    mode: str
    superplane_called: bool = False
    canvas_available: bool = True
    explanation: str


class SearchResponse(BaseModel):
    user_goal: str
    parsed_intent: ParsedIntent
    data_source: str = "mock_fallback"
    listings: list[Listing]
    detected_budget: int | None = None
    detected_product: str
    credit_safety: CreditSafety = Field(default_factory=CreditSafety)


class FullRunResponse(BaseModel):
    report_id: str | None = None
    saved_at: str | None = None
    user_goal: str
    parsed_intent: ParsedIntent
    data_source: str = "mock_fallback"
    listings_analyzed: int
    ranked_results: list[RankedDeal]
    best_recommendation: RankedDeal | None = None
    avoid_listings: list[str] = Field(default_factory=list)
    market_benchmark: MarketBenchmark | None = None
    product_safety_checklist: ProductSafetyChecklist | None = None
    why_not_cheapest: WhyNotCheapest | None = None
    real_data_evidence: RealDataEvidence | None = None
    agent_trace: list[AgentTraceStep]
    workflow_events: list[WorkflowEvent] = Field(default_factory=list)
    credit_safety: CreditSafety = Field(default_factory=CreditSafety)
    mode_flags: dict[str, Any]


class DealReportSummary(BaseModel):
    report_id: str
    created_at: str
    user_goal: str
    product_type: str
    target_model: str
    max_budget: int | None = None
    data_source: str
    best_listing_title: str | None = None
    best_listing_price: int | None = None
    best_deal_score: int | None = None
    best_risk_level: str | None = None
    apify_called: bool = False
    llm_called: bool = False


class DealReportListResponse(BaseModel):
    reports: list[DealReportSummary]
    count: int
