"""Verify DealPilot Apify safety gates without calling Apify.

This script intentionally exercises only blocked live-run paths. It guards the
Apify client import so a regression is visible without needing credentials or
network access.
"""

from __future__ import annotations

import builtins
import os
import sys
from pathlib import Path
from typing import Callable


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import get_settings  # noqa: E402
from app.services.apify_service import HARD_MAX_ITEMS, ApifyService  # noqa: E402


QUERY = "Find me a used iPhone 14 under ₹45000"
ENV_KEYS = {
    "APIFY_LIVE_MODE",
    "APIFY_API_TOKEN",
    "APIFY_ACTOR_ID",
    "APIFY_MAX_ITEMS",
    "APIFY_CACHE_ENABLED",
    "APIFY_CACHE_TTL_MINUTES",
    "APIFY_LIVE_RUN_AUDIT_ENABLED",
    "DEALPILOT_SKIP_DOTENV",
}


def _set_env(values: dict[str, str | None]) -> dict[str, str | None]:
    previous = {key: os.environ.get(key) for key in ENV_KEYS}
    for key in ENV_KEYS:
        if key in values:
            value = values[key]
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
    get_settings.cache_clear()
    return previous


def _restore_env(previous: dict[str, str | None]) -> None:
    for key, value in previous.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value
    get_settings.cache_clear()


def _with_apify_import_guard(fn: Callable[[], dict]) -> tuple[dict, bool]:
    original_import = builtins.__import__
    apify_import_attempted = False

    def guarded_import(name: str, *args, **kwargs):  # type: ignore[no-untyped-def]
        nonlocal apify_import_attempted
        if name == "apify_client" or name.startswith("apify_client."):
            apify_import_attempted = True
            raise RuntimeError("Unexpected Apify client import during safety-gate test.")
        return original_import(name, *args, **kwargs)

    builtins.__import__ = guarded_import
    try:
        return fn(), apify_import_attempted
    finally:
        builtins.__import__ = original_import


def run_case(name: str, env: dict[str, str | None], confirm_live_run: bool) -> None:
    previous = _set_env(
        {
            "APIFY_MAX_ITEMS": "99",
            "APIFY_CACHE_ENABLED": "true",
            "APIFY_CACHE_TTL_MINUTES": "1440",
            "APIFY_LIVE_RUN_AUDIT_ENABLED": "false",
            "DEALPILOT_SKIP_DOTENV": "true",
            **env,
        }
    )
    try:
        service = ApifyService()
        assert service._clamp_max_items(99) == HARD_MAX_ITEMS, "max_items was not hard-capped at 20"

        result, apify_import_attempted = _with_apify_import_guard(
            lambda: service.search_marketplace_listings(
                query=QUERY,
                max_items=99,
                confirm_live_run=confirm_live_run,
            )
        )

        assert result["apify_called"] is False, "Apify was marked as called"
        assert result["data_source"] == "mock_fallback", "Blocked path did not return mock fallback"
        assert result["apify_cache_used"] is False, "Blocked path should not read live cache"
        assert result["max_items_used"] <= HARD_MAX_ITEMS, "Result exceeded hard max item cap"
        assert apify_import_attempted is False, "Apify client import was attempted"
        print(f"PASS: {name}")
    finally:
        _restore_env(previous)


def main() -> None:
    cases = [
        (
            "APIFY_LIVE_MODE=false + confirm_live_run=false",
            {
                "APIFY_LIVE_MODE": "false",
                "APIFY_API_TOKEN": "dummy-token",
                "APIFY_ACTOR_ID": "dummy/actor",
            },
            False,
        ),
        (
            "APIFY_LIVE_MODE=false + confirm_live_run=true",
            {
                "APIFY_LIVE_MODE": "false",
                "APIFY_API_TOKEN": "dummy-token",
                "APIFY_ACTOR_ID": "dummy/actor",
            },
            True,
        ),
        (
            "APIFY_LIVE_MODE=true but missing token",
            {
                "APIFY_LIVE_MODE": "true",
                "APIFY_API_TOKEN": None,
                "APIFY_ACTOR_ID": "dummy/actor",
            },
            True,
        ),
        (
            "APIFY_LIVE_MODE=true but missing actor",
            {
                "APIFY_LIVE_MODE": "true",
                "APIFY_API_TOKEN": "dummy-token",
                "APIFY_ACTOR_ID": None,
            },
            True,
        ),
    ]

    for name, env, confirm_live_run in cases:
        run_case(name, env, confirm_live_run)

    print("All Apify safety gate tests passed. No Apify API call was made.")


if __name__ == "__main__":
    main()
