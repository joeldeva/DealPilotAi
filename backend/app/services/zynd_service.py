import importlib.util
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


class ZyndService:
    """Local Zynd-style identity boundary.

    This service never calls Zynd by default. It exposes a local agent card and
    reports whether the app is configured for future manual registration.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.called = False

    def get_local_agent_card(self) -> dict[str, Any]:
        return {
            "name": self.settings.zynd_agent_name,
            "description": (
                "Autonomous deal intelligence and negotiation agent for second-hand marketplace purchases."
            ),
            "version": "0.1.0",
            "status": "local_mock",
            "capabilities": CAPABILITIES,
            "endpoints": ENDPOINTS,
            "sponsor_integration": "Zynd AI agent identity and discoverability layer",
            "credit_safety": {
                "zynd_called": False,
                "requires_manual_enable": True,
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
