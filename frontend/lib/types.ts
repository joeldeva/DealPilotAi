export type Listing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  description: string;
  seller_name: string;
  seller_rating: number | null;
  image_url: string;
  listing_url: string;
  source: string;
  condition: string;
  posted_time: string;
  data_source: string;
  product_key: string;
};

export type ParsedIntent = {
  product_type: string;
  target_model: string;
  max_budget: number | null;
  currency: string;
  must_have_features: string[];
  avoid_features: string[];
  location_preference: string | null;
  urgency_level: string;
  confidence: number;
  parsed_summary: string;
};

export type DealAnalysis = {
  listing_id: string;
  deal_score: number;
  fair_price_estimate: number;
  negotiation_target_price: number;
  price_position: "excellent" | "fair" | "overpriced" | "suspiciously_low" | string;
  product_match_score: number;
  seller_quality_score: number;
  condition_score: number;
  description_quality_score: number;
  reasoning: string;
  value_flags: string[];
};

export type RiskAnalysis = {
  listing_id: string;
  risk_level: "low" | "medium" | "high";
  risk_score: number;
  risk_flags: string[];
  explanation: string;
  safety_advice: string[];
};

export type NegotiationDraft = {
  listing_id: string;
  opening_message: string;
  target_price: number;
  maximum_recommended_price: number;
  counter_offer_strategy: string;
  tone: string;
  justification_points: string[];
  followup_message: string;
  questions_to_ask_seller: string[];
  walkaway_conditions: string[];
};

export type RankingAnalysis = {
  listing_id: string;
  rank: number;
  final_score: number;
  recommendation_label: "Best Overall" | "Good Deal" | "Negotiate Carefully" | "Avoid" | "Overpriced" | string;
  ranking_reason: string;
};

export type RankedDeal = {
  listing: Listing;
  deal_analysis: DealAnalysis;
  risk_analysis: RiskAnalysis;
  ranking: RankingAnalysis;
  negotiation: NegotiationDraft;
};

export type AgentTraceStep = {
  step: string;
  status: string;
  details: string;
  summary: string;
};

export type WorkflowEvent = {
  id: string;
  timestamp: string;
  event_type: string;
  status: string;
  details: string | null;
  metadata: Record<string, unknown>;
};

export type CreditSafety = {
  apify_live_mode: boolean;
  apify_called: boolean;
  apify_cache_used: boolean;
  llm_live_mode: boolean;
  llm_called: boolean;
  live_llm_confirmed: boolean;
  zynd_called: boolean;
  superplane_called: boolean;
  max_items_requested: number;
  max_items_used: number;
  live_run_confirmed: boolean;
};

export type FullRunRequest = {
  user_goal: string;
  use_live_apify: boolean;
  confirm_live_run: boolean;
  apify_source?: "olx" | "ebay" | "facebook" | "google";
  max_items: number;
  use_live_llm: boolean;
  confirm_live_llm: boolean;
  save_report?: boolean;
};

export type FullRunResponse = {
  report_id: string | null;
  saved_at: string | null;
  user_goal: string;
  parsed_intent: ParsedIntent;
  data_source: "mock_fallback" | "apify_cache" | "apify_live";
  listings_analyzed: number;
  ranked_results: RankedDeal[];
  best_recommendation: RankedDeal | null;
  avoid_listings: string[];
  agent_trace: AgentTraceStep[];
  workflow_events: WorkflowEvent[];
  credit_safety: CreditSafety;
  mode_flags: Record<string, boolean>;
};

export type DealReportSummary = {
  report_id: string;
  created_at: string;
  user_goal: string;
  product_type: string;
  target_model: string;
  max_budget: number | null;
  data_source: string;
  best_listing_title: string | null;
  best_listing_price: number | null;
  best_deal_score: number | null;
  best_risk_level: string | null;
  apify_called: boolean;
  llm_called: boolean;
};

export type DealReportListResponse = {
  reports: DealReportSummary[];
  count: number;
};

export type SuperplaneCanvasComponent = {
  id: string;
  name: string;
  type: string;
  emits_event: string;
  local_endpoints: string[];
  inputs: string[];
  outputs: string[];
  runtime: string;
};

export type SuperplaneCanvas = {
  name: string;
  version: string;
  mode: string;
  generated_at: string;
  superplane_called: boolean;
  description: string;
  components: SuperplaneCanvasComponent[];
  connections: Array<{ from: string; to: string }>;
  events: string[];
  credit_safety: {
    superplane_called: boolean;
    note: string;
  };
};

export type HealthStatus = {
  status: string;
  mode: string;
  credit_safety: CreditSafety;
  flags: Record<string, boolean | string>;
};

export type ApifyStatus = {
  apify_live_mode: boolean;
  token_configured: boolean;
  actor_configured: boolean;
  cache_enabled: boolean;
  max_items: number;
  warning: string;
  sources?: Record<string, boolean | string>;
};

export type GeminiStatus = {
  gemini_live_mode: boolean;
  api_key_configured: boolean;
  model: string;
  llm_called: false;
  mode: string;
};

export type ZyndStatus = {
  zynd_enabled: boolean;
  sdk_available: boolean;
  keypair_configured: boolean;
  agent_name: string;
  mode: string;
  zynd_called: false;
};

export type SuperplaneStatus = {
  superplane_enabled: boolean;
  local_workflow_events_enabled: boolean;
  mode: string;
  superplane_called: false;
  canvas_available: boolean;
  explanation: string;
};

export type HostedStatus = {
  health: HealthStatus;
  apify: ApifyStatus;
  gemini: GeminiStatus;
  zynd: ZyndStatus;
  superplane: SuperplaneStatus;
  canvas: SuperplaneCanvas;
};
