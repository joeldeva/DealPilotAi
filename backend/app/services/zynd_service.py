import importlib.util
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import get_settings


CAPABILITIES = [
    "marketplace_search",
    "deal_analysis",
    "scam_risk_detection",
    "decision_ranking",
    "negotiation_strategy",
]

ENDPOINTS = [
    "/api/demo/full-run",
    "/api/search",
    "/api/analyze",
    "/api/negotiate",
]

ZYND_TAGS = [
    "marketplace",
    "deal-analysis",
    "risk-signals",
    "negotiation",
    "apify",
]


class ZyndService:
    """Local Zynd-style identity boundary.

    This service never calls Zynd by default. It exposes a local agent card and
    reports whether the app is configured for future manual registration.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.called = False

    def get_local_agent_card(self) -> dict[str, Any]:
        service_base = "https://dealpilot-ai-phi.vercel.app/server"
        return {
            "name": self.settings.zynd_agent_name,
            "description": (
                "Autonomous deal intelligence and negotiation agent for second-hand marketplace purchases."
            ),
            "version": "0.1.0",
            "status": "local_mock",
            "category": "commerce",
            "tags": ZYND_TAGS,
            "summary": "Buyer-side marketplace agent that ranks used-product deals, detects risk signals, and drafts ethical negotiation strategies.",
            "capabilities": CAPABILITIES,
            "endpoints": {
                "dealpilot_full_run": f"{service_base}/api/demo/full-run",
                "search": f"{service_base}/api/search",
                "analyze": f"{service_base}/api/analyze",
                "negotiate": f"{service_base}/api/negotiate",
                "health": f"{service_base}/health",
                "agent_card": f"{service_base}/.well-known/agent.json",
                "zynd_wrapper_sync": "https://<zynd-service>.deployer.zynd.ai/webhook/sync",
            },
            "local_backend_endpoints": ENDPOINTS,
            "pricing": {
                "model": "free_demo",
                "currency": "USD",
                "per_call": "$0.00",
            },
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "zynd_ready": True,
            "sponsor_integration": "Zynd AI agent identity and discoverability layer",
            "credit_safety": {
                "zynd_called": False,
                "requires_manual_enable": True,
                "service_wrapper_available": True,
                "deployer_required_for_real_registration": True,
            },
        }

    def register_agent_if_enabled(self) -> dict[str, Any]:
        if not self.settings.zynd_enabled:
            return {
                "registered": False,
                "zynd_called": False,
                "reason": "ZYND_ENABLED is false. Local agent card only.",
            }
        return {
            "registered": False,
            "zynd_called": False,
            "reason": "Zynd registration is intentionally not executed in this MVP step.",
        }

    def status(self) -> dict[str, Any]:
        sdk_available = importlib.util.find_spec("zyndai_agent") is not None
        keypair_configured = bool(
            self.settings.zynd_developer_keypair_path
            and Path(self.settings.zynd_developer_keypair_path).expanduser().exists()
        )
        ready = self.settings.zynd_enabled and sdk_available and keypair_configured
        return {
            "zynd_enabled": self.settings.zynd_enabled,
            "sdk_available": sdk_available,
            "keypair_configured": keypair_configured,
            "agent_name": self.settings.zynd_agent_name,
            "mode": "ready_for_registration" if ready else "local_mock",
            "zynd_called": False,
        }

    # Backward-compatible alias for the existing well-known endpoint.
    def entity_card(self) -> dict[str, Any]:
        return self.get_local_agent_card()
