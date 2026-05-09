"""Zynd-ready DealPilot service wrapper.

This file is intentionally separate from the main FastAPI app. It is meant for
manual deployment through the Zynd deployer with a service keypair.

No Zynd API call happens by importing this file. Running it directly starts a
Zynd service process, which should only be done during an intentional Zynd
deployment/test.
"""

from __future__ import annotations

import json
import os
from typing import Any

import requests
from zyndai_agent.service import ServiceConfig, ZyndService


DEFAULT_GOAL = "Find me a used iPhone 14 under INR 45000"


def _dealpilot_api_base() -> str | None:
    value = os.getenv("DEALPILOT_API_BASE_URL", "").strip().rstrip("/")
    return value or None


def _parse_goal(input_text: str) -> str:
    text = input_text.strip()
    if not text:
        return DEFAULT_GOAL

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return text

    if isinstance(payload, dict):
        goal = payload.get("user_goal") or payload.get("goal") or payload.get("content")
        if isinstance(goal, str) and goal.strip():
            return goal.strip()
    return text


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _safe_full_run_payload(user_goal: str) -> dict[str, Any]:
    use_live_apify = _env_bool("ZYND_USE_LIVE_APIFY", False)
    confirm_live_run = _env_bool("ZYND_CONFIRM_LIVE_RUN", False)
    return {
        "user_goal": user_goal,
        "use_live_apify": use_live_apify,
        "confirm_live_run": use_live_apify and confirm_live_run,
        "apify_source": os.getenv("ZYND_APIFY_SOURCE", "google"),
        "use_live_llm": False,
        "confirm_live_llm": False,
        "save_report": True,
        "max_items": min(max(int(os.getenv("ZYND_MAX_ITEMS", "10")), 1), 20),
    }


def _summarize_dealpilot_response(response: dict[str, Any]) -> dict[str, Any]:
    best = response.get("best_recommendation") or {}
    listing = best.get("listing") or {}
    deal = best.get("deal_analysis") or {}
    risk = best.get("risk_analysis") or {}
    ranking = best.get("ranking") or {}
    negotiation = best.get("negotiation") or {}
    safety = response.get("credit_safety") or {}

    return {
        "service": "DealPilot AI",
        "mode": "zynd_service_wrapper",
        "user_goal": response.get("user_goal"),
        "data_source": response.get("data_source"),
        "best_listing": {
            "title": listing.get("title"),
            "price": listing.get("price"),
            "currency": listing.get("currency"),
            "location": listing.get("location"),
            "source": listing.get("source"),
        },
        "recommendation": {
            "label": ranking.get("recommendation_label"),
            "deal_score": deal.get("deal_score"),
            "risk_level": risk.get("risk_level"),
            "risk_score": risk.get("risk_score"),
            "negotiation_target_price": negotiation.get("target_price"),
        },
        "negotiation_draft": negotiation.get("opening_message"),
        "questions_to_ask_seller": negotiation.get("questions_to_ask_seller", []),
        "credit_safety": {
            "apify_called": safety.get("apify_called", False),
            "llm_called": safety.get("llm_called", False),
            "zynd_called": True,
            "superplane_called": safety.get("superplane_called", False),
        },
    }


def handle_request(input_text: str) -> str:
    """Handle a Zynd service invocation.

    The wrapper calls the deployed DealPilot backend only when invoked by a
    Zynd request. It always sends safe mock-mode flags to prevent accidental
    Apify/Gemini quota usage from service discovery or judge tests.
    """

    user_goal = _parse_goal(input_text)
    api_base = _dealpilot_api_base()

    if not api_base:
        return json.dumps(
            {
                "service": "DealPilot AI",
                "mode": "zynd_service_wrapper_not_connected",
                "message": "Set DEALPILOT_API_BASE_URL to the hosted FastAPI backend before invoking the service.",
                "received_goal": user_goal,
                "credit_safety": {
                    "apify_called": False,
                    "llm_called": False,
                    "zynd_called": True,
                    "superplane_called": False,
                },
            }
        )

    try:
        response = requests.post(
            f"{api_base}/api/demo/full-run",
            json=_safe_full_run_payload(user_goal),
            timeout=25,
        )
        response.raise_for_status()
        return json.dumps(_summarize_dealpilot_response(response.json()))
    except Exception as exc:
        return json.dumps(
            {
                "service": "DealPilot AI",
                "mode": "zynd_service_wrapper_error",
                "error": str(exc),
                "received_goal": user_goal,
                "credit_safety": {
                    "apify_called": False,
                    "llm_called": False,
                    "zynd_called": True,
                    "superplane_called": False,
                },
            }
        )


if __name__ == "__main__":
    port = int(os.getenv("ZYND_WEBHOOK_PORT", os.getenv("PORT", "5020")))
    entity_url = os.getenv("ZYND_ENTITY_URL")

    config = ServiceConfig(
        name="DealPilot AI",
        description="Autonomous deal intelligence and negotiation service for second-hand marketplace purchases.",
        category="commerce",
        tags=["marketplace", "deal-analysis", "negotiation", "risk-signals", "apify"],
        summary="Analyzes second-hand marketplace buying goals and returns ranked deal recommendations with risk signals and negotiation drafts.",
        service_endpoint=entity_url,
        openapi_url=None,
        webhook_host="0.0.0.0",
        webhook_port=port,
        registry_url=os.getenv("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
        entity_pricing=None,
    )

    service = ZyndService(config)
    service.set_handler(handle_request)

    print(f"DealPilot AI Zynd service running on port {port}")
    print("Use /webhook/sync with a buying goal to invoke the service.")

    while True:
        command = input()
        if command.strip().lower() == "exit":
            break
