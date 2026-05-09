from datetime import datetime, timezone
from typing import Any

from app.config import get_settings


class SuperplaneService:
    """Superplane-style local workflow canvas exporter.

    This does not install, run, or call Superplane. It describes the DealPilot
    workflow in a format that can be mapped to a future Superplane canvas.
    """

    def __init__(self) -> None:
        self.settings = get_settings()

    def status(self) -> dict[str, Any]:
        return {
            "superplane_enabled": self.settings.superplane_enabled,
            "local_workflow_events_enabled": self.settings.workflow_events_enabled,
            "mode": "local_canvas_export",
            "superplane_called": False,
            "canvas_available": True,
            "explanation": "DealPilot exports a local Superplane-style workflow canvas without calling Superplane.",
        }

    def canvas(self) -> dict[str, Any]:
        return {
            "name": "DealPilot AI Deal Intelligence Workflow",
            "version": "0.1.0",
            "mode": "local_canvas_export",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "superplane_called": False,
            "description": "Local Superplane-style canvas for user request -> search -> analysis -> risk -> ranking -> negotiation -> saved report.",
            "triggers": [
                {
                    "id": "dealpilot_user_goal_submitted",
                    "event_type": "USER_REQUEST_RECEIVED",
                    "source": "POST /api/demo/full-run",
                    "description": "A buyer submits a marketplace buying goal.",
                }
            ],
            "components": [
                self._component(
                    "intent_understanding",
                    "Intent Understanding",
                    "INTENT_PARSED",
                    ["/api/demo/full-run"],
                    ["user_goal"],
                    ["parsed_intent"],
                ),
                self._component(
                    "marketplace_search",
                    "Marketplace Search",
                    "MARKETPLACE_SEARCH_COMPLETED",
                    ["/api/search", "/api/apify/status"],
                    ["parsed_intent", "apify_source", "credit_safety_flags"],
                    ["normalized_listings", "data_source"],
                ),
                self._component(
                    "deal_analysis",
                    "Deal Analysis",
                    "DEAL_ANALYSIS_COMPLETED",
                    ["/api/analyze"],
                    ["normalized_listings", "parsed_intent"],
                    ["deal_analysis"],
                ),
                self._component(
                    "scam_risk_detection",
                    "Scam Risk Detection",
                    "SCAM_RISK_DETECTION_COMPLETED",
                    ["/api/analyze"],
                    ["normalized_listings", "deal_analysis"],
                    ["risk_analysis", "safety_advice"],
                ),
                self._component(
                    "decision_ranking",
                    "Decision Ranking",
                    "DECISION_RANKING_COMPLETED",
                    ["/api/demo/full-run"],
                    ["deal_analysis", "risk_analysis"],
                    ["ranked_results", "best_recommendation", "avoid_listings"],
                ),
                self._component(
                    "negotiation_strategy",
                    "Negotiation Strategy",
                    "NEGOTIATION_GENERATED",
                    ["/api/negotiate"],
                    ["best_recommendation", "risk_analysis"],
                    ["negotiation_draft", "questions_to_ask_seller", "walkaway_conditions"],
                ),
                self._component(
                    "saved_report",
                    "Saved Deal Report",
                    "DEMO_RUN_COMPLETED",
                    ["/api/reports"],
                    ["full_run_response"],
                    ["report_id", "saved_at"],
                ),
            ],
            "connections": [
                {"from": "dealpilot_user_goal_submitted", "to": "intent_understanding"},
                {"from": "intent_understanding", "to": "marketplace_search"},
                {"from": "marketplace_search", "to": "deal_analysis"},
                {"from": "deal_analysis", "to": "scam_risk_detection"},
                {"from": "scam_risk_detection", "to": "decision_ranking"},
                {"from": "decision_ranking", "to": "negotiation_strategy"},
                {"from": "negotiation_strategy", "to": "saved_report"},
            ],
            "events": [
                "USER_REQUEST_RECEIVED",
                "INTENT_PARSED",
                "MARKETPLACE_SEARCH_STARTED",
                "MARKETPLACE_SEARCH_COMPLETED",
                "DEAL_ANALYSIS_STARTED",
                "DEAL_ANALYSIS_COMPLETED",
                "SCAM_RISK_DETECTION_COMPLETED",
                "DECISION_RANKING_COMPLETED",
                "NEGOTIATION_GENERATED",
                "DEMO_RUN_COMPLETED",
            ],
            "credit_safety": {
                "apify_live_mode_default": False,
                "gemini_live_mode_default": False,
                "zynd_enabled_default": False,
                "superplane_enabled_default": False,
                "superplane_called": False,
                "note": "This canvas export is local metadata only.",
            },
        }

    def _component(
        self,
        component_id: str,
        name: str,
        emits_event: str,
        local_endpoints: list[str],
        inputs: list[str],
        outputs: list[str],
    ) -> dict[str, Any]:
        return {
            "id": component_id,
            "name": name,
            "type": "local_component",
            "emits_event": emits_event,
            "local_endpoints": local_endpoints,
            "inputs": inputs,
            "outputs": outputs,
            "runtime": "DealPilot FastAPI local workflow",
        }
