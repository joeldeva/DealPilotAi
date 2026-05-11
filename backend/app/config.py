from functools import lru_cache
from pydantic import BaseModel
import os
from pathlib import Path


class Settings(BaseModel):
    app_name: str = "DealPilot AI"
    default_mode: str = "mock"
    frontend_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    apify_live_mode: bool = False
    apify_api_token: str | None = None
    apify_actor_id: str | None = None
    apify_default_source: str = "google"
    apify_olx_actor_id: str | None = None
    apify_ebay_actor_id: str | None = None
    apify_amazon_actor_id: str | None = None
    apify_facebook_actor_id: str | None = None
    apify_google_actor_id: str | None = None
    apify_max_items: int = 10
    apify_max_total_charge_usd: float = 1.0
    apify_cache_enabled: bool = True
    apify_cache_ttl_minutes: int = 1440
    apify_live_run_audit_enabled: bool = True
    gemini_live_mode: bool = False
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_timeout_seconds: int = 20
    gemini_max_output_tokens: int = 220
    gemini_audit_enabled: bool = True
    zynd_enabled: bool = False
    zynd_agent_name: str = "DealPilot AI"
    zynd_agent_description: str = "Autonomous deal intelligence and negotiation agent"
    zynd_developer_keypair_path: str | None = None
    superplane_enabled: bool = False
    workflow_events_enabled: bool = True
    dealpilot_admin_username: str = "admin"
    dealpilot_admin_password: str = "secret"
    dealpilot_encryption_key: str = "dealpilot-secret-vault-key-32bytes-min!"


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _load_local_env_files() -> None:
    """Load repo .env files without overriding process environment variables."""

    if _env_bool("DEALPILOT_SKIP_DOTENV", False):
        return

    backend_dir = Path(__file__).resolve().parents[1]
    repo_dir = backend_dir.parent
    values: dict[str, str] = {}

    for path in (repo_dir / ".env", backend_dir / ".env"):
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                values[key] = value

    for key, value in values.items():
        if not os.environ.get(key):
            os.environ[key] = value


@lru_cache
def get_settings() -> Settings:
    _load_local_env_files()
    return Settings(
        frontend_origins=os.getenv("FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"),
        apify_live_mode=_env_bool("APIFY_LIVE_MODE", False),
        apify_api_token=os.getenv("APIFY_API_TOKEN") or os.getenv("APIFY_TOKEN") or None,
        apify_actor_id=os.getenv("APIFY_ACTOR_ID") or None,
        apify_default_source=os.getenv("APIFY_DEFAULT_SOURCE", "google"),
        apify_olx_actor_id=os.getenv("APIFY_OLX_ACTOR_ID") or None,
        apify_ebay_actor_id=os.getenv("APIFY_EBAY_ACTOR_ID") or None,
        apify_amazon_actor_id=os.getenv("APIFY_AMAZON_ACTOR_ID") or None,
        apify_facebook_actor_id=os.getenv("APIFY_FACEBOOK_ACTOR_ID") or None,
        apify_google_actor_id=os.getenv("APIFY_GOOGLE_ACTOR_ID") or None,
        apify_max_items=int(os.getenv("APIFY_MAX_ITEMS", "10")),
        apify_max_total_charge_usd=float(os.getenv("APIFY_MAX_TOTAL_CHARGE_USD", "1.0")),
        apify_cache_enabled=_env_bool("APIFY_CACHE_ENABLED", True),
        apify_cache_ttl_minutes=int(os.getenv("APIFY_CACHE_TTL_MINUTES", "1440")),
        apify_live_run_audit_enabled=_env_bool("APIFY_LIVE_RUN_AUDIT_ENABLED", True),
        gemini_live_mode=_env_bool("GEMINI_LIVE_MODE", False),
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        gemini_timeout_seconds=int(os.getenv("GEMINI_TIMEOUT_SECONDS", "20")),
        gemini_max_output_tokens=int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "220")),
        gemini_audit_enabled=_env_bool("GEMINI_AUDIT_ENABLED", True),
        zynd_enabled=_env_bool("ZYND_ENABLED", False),
        zynd_agent_name=os.getenv("ZYND_AGENT_NAME", "DealPilot AI"),
        zynd_agent_description=os.getenv(
            "ZYND_AGENT_DESCRIPTION",
            "Autonomous deal intelligence and negotiation agent",
        ),
        zynd_developer_keypair_path=os.getenv("ZYND_DEVELOPER_KEYPAIR_PATH") or None,
        superplane_enabled=_env_bool("SUPERPLANE_ENABLED", False),
        workflow_events_enabled=_env_bool("WORKFLOW_EVENTS_ENABLED", True),
        dealpilot_admin_username=os.getenv("DEALPILOT_ADMIN_USERNAME", "admin"),
        dealpilot_admin_password=os.getenv("DEALPILOT_ADMIN_PASSWORD", "secret"),
        dealpilot_encryption_key=os.getenv("DEALPILOT_ENCRYPTION_KEY", "dealpilot-secret-vault-key-32bytes-min!"),
    )
