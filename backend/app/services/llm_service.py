import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import get_settings


AUDIT_DIR = Path(__file__).resolve().parents[1] / "data" / "audit"
GEMINI_AUDIT_PATH = AUDIT_DIR / "gemini_calls.jsonl"


class LLMService:
    """Credit-safe optional Gemini boundary.

    No Gemini package is imported and no network call is made unless every live
    gate is true: GEMINI_LIVE_MODE, API key, use_live_llm, and confirm_live_llm.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.called = False

    def generate_with_optional_llm(
        self,
        prompt: str,
        fallback_text: str,
        use_live_llm: bool = False,
        confirm_live_llm: bool = False,
        purpose: str = "general",
    ) -> dict[str, str | bool]:
        if not self.settings.gemini_live_mode:
            return self._fallback(fallback_text, "GEMINI_LIVE_MODE is false.", purpose, prompt, use_live_llm, confirm_live_llm)
        if not use_live_llm:
            return self._fallback(fallback_text, "Request did not enable live LLM.", purpose, prompt, use_live_llm, confirm_live_llm)
        if not confirm_live_llm:
            return self._fallback(fallback_text, "Live LLM was not confirmed.", purpose, prompt, use_live_llm, confirm_live_llm)
        if not self.settings.gemini_api_key:
            return self._fallback(fallback_text, "GEMINI_API_KEY is missing.", purpose, prompt, use_live_llm, confirm_live_llm)

        try:
            text = self._call_gemini(prompt)
            self.called = True
            self._write_audit_event(
                purpose=purpose,
                prompt=prompt,
                use_live_llm=use_live_llm,
                confirm_live_llm=confirm_live_llm,
                llm_called=True,
                mode="gemini_live",
                reason="Gemini call completed.",
            )
            return {"text": text or fallback_text, "llm_called": True, "mode": "gemini_live"}
        except (OSError, HTTPError, URLError, TimeoutError, ValueError, KeyError, json.JSONDecodeError) as exc:
            return self._fallback(
                fallback_text,
                "Gemini call failed; deterministic fallback used.",
                purpose,
                prompt,
                use_live_llm,
                confirm_live_llm,
                error_type=type(exc).__name__,
                mode="gemini_failed_fallback",
            )

    def status(self) -> dict[str, bool | str | int]:
        return {
            "gemini_live_mode": self.settings.gemini_live_mode,
            "api_key_configured": bool(self.settings.gemini_api_key),
            "model": self.settings.gemini_model,
            "timeout_seconds": self.settings.gemini_timeout_seconds,
            "max_output_tokens": self.settings.gemini_max_output_tokens,
            "audit_enabled": self.settings.gemini_audit_enabled,
            "called": self.called,
            "warning": "Gemini live mode is disabled by default to protect quota.",
        }

    def list_audit_events(self, limit: int = 50) -> dict[str, Any]:
        safe_limit = min(max(limit, 1), 200)
        if not GEMINI_AUDIT_PATH.exists():
            return {"events": [], "count": 0}
        events = []
        for line in GEMINI_AUDIT_PATH.read_text(encoding="utf-8").splitlines()[-safe_limit:]:
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        events.reverse()
        return {"events": events, "count": len(events)}

    def clear_audit_events(self) -> dict[str, int]:
        if GEMINI_AUDIT_PATH.exists():
            GEMINI_AUDIT_PATH.unlink()
            return {"audit_events_deleted": 1}
        return {"audit_events_deleted": 0}

    def _fallback(
        self,
        fallback_text: str,
        reason: str,
        purpose: str,
        prompt: str,
        use_live_llm: bool,
        confirm_live_llm: bool,
        error_type: str | None = None,
        mode: str = "deterministic_fallback",
    ) -> dict[str, str | bool]:
        self._write_audit_event(
            purpose=purpose,
            prompt=prompt,
            use_live_llm=use_live_llm,
            confirm_live_llm=confirm_live_llm,
            llm_called=False,
            mode=mode,
            reason=reason,
            error_type=error_type,
        )
        return {
            "text": fallback_text,
            "llm_called": False,
            "mode": mode,
            "reason": reason,
        }

    def _call_gemini(self, prompt: str) -> str:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.settings.gemini_model}:generateContent?key={self.settings.gemini_api_key}"
        )
        payload: dict[str, Any] = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt,
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": self.settings.gemini_max_output_tokens,
            },
        }
        request = Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=self.settings.gemini_timeout_seconds) as response:
            data = json.loads(response.read().decode("utf-8"))
        candidates = data.get("candidates", [])
        parts = candidates[0]["content"]["parts"] if candidates else []
        return str(parts[0].get("text", "")).strip() if parts else ""

    def _write_audit_event(
        self,
        purpose: str,
        prompt: str,
        use_live_llm: bool,
        confirm_live_llm: bool,
        llm_called: bool,
        mode: str,
        reason: str,
        error_type: str | None = None,
    ) -> None:
        if not self.settings.gemini_audit_enabled:
            return
        AUDIT_DIR.mkdir(parents=True, exist_ok=True)
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "purpose": purpose,
            "model": self.settings.gemini_model,
            "prompt_hash": hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:12],
            "prompt_chars": len(prompt),
            "use_live_llm": use_live_llm,
            "confirm_live_llm": confirm_live_llm,
            "gemini_live_mode": self.settings.gemini_live_mode,
            "api_key_configured": bool(self.settings.gemini_api_key),
            "llm_called": llm_called,
            "mode": mode,
            "reason": reason,
            "error_type": error_type,
        }
        with GEMINI_AUDIT_PATH.open("a", encoding="utf-8") as file:
            file.write(json.dumps(event) + "\n")
