from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agents.orchestrator import DealPilotOrchestrator
from app.config import get_settings
from app.models.api import AgentCard, AnalyzeRequest, DealReportListResponse, FullRunResponse, NegotiationRequest, SearchRequest, SuperplaneStatus, WorkflowEvent, ZyndStatus
from app.services.mock_data_service import MockDataService
from app.services.apify_service import ApifyService
from app.services.llm_service import LLMService
from app.services.storage_service import StorageService
from app.services.superplane_service import SuperplaneService
from app.services.zynd_service import ZyndService
from app.services.workflow_events import clear_events, get_events, get_superplane_status

import secrets
from fastapi import Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials


settings = get_settings()
mock_data_service = MockDataService()
orchestrator = DealPilotOrchestrator(mock_data_service)
apify_service = ApifyService(mock_data_service)
llm_service = LLMService()
storage_service = StorageService()
superplane_service = SuperplaneService()

security = HTTPBasic()

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, settings.dealpilot_admin_username)
    correct_password = secrets.compare_digest(credentials.password, settings.dealpilot_admin_password)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

app = FastAPI(title="DealPilot AI", version="0.1.0", dependencies=[Depends(verify_credentials)])


def _cors_origins() -> list[str]:
    origins = [origin.strip() for origin in settings.frontend_origins.split(",") if origin.strip()]
    return origins or ["http://localhost:3000", "http://127.0.0.1:3000"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "mode": settings.default_mode,
        "credit_safety": {
            "apify_live_mode": settings.apify_live_mode,
            "apify_called": False,
            "apify_cache_used": False,
            "llm_live_mode": settings.gemini_live_mode,
            "llm_called": False,
            "live_llm_confirmed": False,
            "zynd_called": False,
            "superplane_called": False,
            "max_items_requested": settings.apify_max_items,
            "max_items_used": min(settings.apify_max_items, 20),
            "live_run_confirmed": False,
        },
        "flags": {
            "APIFY_LIVE_MODE": settings.apify_live_mode,
            "GEMINI_LIVE_MODE": settings.gemini_live_mode,
            "GEMINI_MODEL": settings.gemini_model,
            "ZYND_ENABLED": settings.zynd_enabled,
            "SUPERPLANE_ENABLED": settings.superplane_enabled,
            "WORKFLOW_EVENTS_ENABLED": settings.workflow_events_enabled,
        },
    }


@app.get("/.well-known/agent.json")
def agent_card() -> dict:
    return ZyndService().get_local_agent_card()


@app.get("/api/agent-card", response_model=AgentCard)
def api_agent_card() -> dict:
    return ZyndService().get_local_agent_card()


@app.get("/api/zynd/status", response_model=ZyndStatus)
def zynd_status() -> dict:
    return ZyndService().status()


@app.get("/api/superplane/status", response_model=SuperplaneStatus)
def superplane_status() -> dict:
    return get_superplane_status()


@app.get("/api/superplane/canvas")
def superplane_canvas() -> dict:
    return superplane_service.canvas()


@app.get("/api/demo/events", response_model=list[WorkflowEvent])
def demo_events() -> list:
    return get_events()


@app.post("/api/demo/events/clear")
def clear_demo_events() -> dict:
    return clear_events()


@app.get("/api/demo/mock-products")
def mock_products() -> list[dict[str, str]]:
    return mock_data_service.list_products()


@app.get("/api/demo/evidence")
def demo_evidence() -> dict:
    return {
        "phase_2_features": [
            "market_benchmark_scoring",
            "product_specific_safety_checklist",
            "why_not_cheapest_reasoning",
            "real_data_evidence_label",
        ],
        "agent_card": "/api/agent-card",
        "well_known_agent": "/.well-known/agent.json",
        "latest_reports": storage_service.list_reports(limit=3),
    }


@app.get("/api/reports", response_model=DealReportListResponse)
def list_reports(limit: int = 20) -> DealReportListResponse:
    reports = storage_service.list_reports(limit=limit)
    return DealReportListResponse(reports=reports, count=len(reports))


@app.get("/api/reports/{report_id}", response_model=FullRunResponse)
def get_report(report_id: str) -> dict:
    report = storage_service.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Deal report not found.")
    return report


@app.delete("/api/reports/{report_id}")
def delete_report(report_id: str) -> dict:
    deleted = storage_service.delete_report(report_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Deal report not found.")
    return {"deleted": True, "report_id": report_id}


@app.post("/api/reports/clear")
def clear_reports() -> dict:
    return storage_service.clear_reports()


@app.get("/api/apify/status")
def apify_status() -> dict:
    return apify_service.status()


@app.post("/api/apify/cache/clear")
def clear_apify_cache() -> dict:
    return apify_service.clear_cache()


@app.get("/api/apify/audit")
def apify_audit(limit: int = 50) -> dict:
    return apify_service.list_audit_events(limit=limit)


@app.post("/api/apify/audit/clear")
def clear_apify_audit() -> dict:
    return apify_service.clear_audit_events()


@app.get("/api/gemini/status")
def gemini_status() -> dict:
    return llm_service.status()


@app.get("/api/gemini/audit")
def gemini_audit(limit: int = 50) -> dict:
    return llm_service.list_audit_events(limit=limit)


@app.post("/api/gemini/audit/clear")
def clear_gemini_audit() -> dict:
    return llm_service.clear_audit_events()


@app.post("/api/search")
def search(request: SearchRequest):
    return orchestrator.search(
        request.user_goal,
        use_live_apify=request.use_live_apify,
        confirm_live_run=request.confirm_live_run,
        apify_source=request.apify_source,
        max_items=request.max_items,
    )


@app.post("/api/analyze")
def analyze(request: AnalyzeRequest):
    return orchestrator.analyze_listing(request.user_goal, request.listing)


@app.post("/api/negotiate")
def negotiate(request: NegotiationRequest):
    ranked = orchestrator.analyze_listing(request.user_goal, request.listing)
    return ranked.negotiation


@app.post("/api/demo/full-run")
def full_run(request: SearchRequest):
    return orchestrator.full_run(
        request.user_goal,
        use_live_apify=request.use_live_apify,
        confirm_live_run=request.confirm_live_run,
        apify_source=request.apify_source,
        max_items=request.max_items,
        use_live_llm=request.use_live_llm,
        confirm_live_llm=request.confirm_live_llm,
        save_report=request.save_report,
    )
