from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4
from typing import Any

from app.config import get_settings
from app.models.api import WorkflowEvent
from app.services.superplane_service import SuperplaneService


EVENT_TYPES = {
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
}

_EVENTS: list[WorkflowEvent] = []
_LOCK = Lock()


def emit_event(
    event_type: str,
    status: str,
    details: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> WorkflowEvent | None:
    settings = get_settings()
    if not settings.workflow_events_enabled:
        return None
    normalized_type = event_type if event_type in EVENT_TYPES else "DEMO_RUN_COMPLETED"
    event = WorkflowEvent(
        id=str(uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
        event_type=normalized_type,
        status=status,
        details=details,
        metadata=metadata or {},
    )
    with _LOCK:
        _EVENTS.append(event)
    return event


def get_events() -> list[WorkflowEvent]:
    with _LOCK:
        return list(_EVENTS)


def clear_events() -> dict[str, int]:
    with _LOCK:
        count = len(_EVENTS)
        _EVENTS.clear()
    return {"events_cleared": count}


def get_superplane_status() -> dict[str, Any]:
    return SuperplaneService().status()
