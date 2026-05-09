import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.models.api import DealReportSummary, FullRunResponse


def _runtime_data_dir() -> Path:
    configured = os.getenv("DEALPILOT_RUNTIME_DATA_DIR")
    if configured:
        return Path(configured)
    if os.getenv("VERCEL"):
        return Path("/tmp/dealpilot-ai")
    return Path(__file__).resolve().parents[1] / "data"


DATA_DIR = _runtime_data_dir()
DB_PATH = DATA_DIR / "dealpilot.sqlite3"


class StorageService:
    """Local SQLite storage for productized DealPilot reports.

    This is intentionally local-first: no cloud database, no network calls, and
    no background sync. It lets the prototype behave like a real product while
    preserving the mock-safe default.
    """

    def __init__(self, db_path: Path = DB_PATH) -> None:
        self.db_path = db_path
        self._ensure_schema()

    def save_report(self, response: FullRunResponse) -> dict[str, str]:
        report_id = response.report_id or f"report_{uuid4().hex[:16]}"
        created_at = response.saved_at or datetime.now(timezone.utc).isoformat()
        stored_response = response.model_copy(update={"report_id": report_id, "saved_at": created_at})
        payload = stored_response.model_dump(mode="json")

        best = response.best_recommendation
        with self._connect() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO deal_reports (
                    report_id,
                    created_at,
                    user_goal,
                    product_type,
                    target_model,
                    max_budget,
                    data_source,
                    best_listing_title,
                    best_listing_price,
                    best_deal_score,
                    best_risk_level,
                    apify_called,
                    llm_called,
                    payload_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report_id,
                    created_at,
                    response.user_goal,
                    response.parsed_intent.product_type,
                    response.parsed_intent.target_model,
                    response.parsed_intent.max_budget,
                    response.data_source,
                    best.listing.title if best else None,
                    best.listing.price if best else None,
                    best.deal_analysis.deal_score if best else None,
                    best.risk_analysis.risk_level if best else None,
                    int(response.credit_safety.apify_called),
                    int(response.credit_safety.llm_called),
                    json.dumps(payload),
                ),
            )
        return {"report_id": report_id, "created_at": created_at}

    def list_reports(self, limit: int = 20) -> list[DealReportSummary]:
        safe_limit = min(max(limit, 1), 100)
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT
                    report_id,
                    created_at,
                    user_goal,
                    product_type,
                    target_model,
                    max_budget,
                    data_source,
                    best_listing_title,
                    best_listing_price,
                    best_deal_score,
                    best_risk_level,
                    apify_called,
                    llm_called
                FROM deal_reports
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (safe_limit,),
            ).fetchall()

        return [
            DealReportSummary(
                report_id=row["report_id"],
                created_at=row["created_at"],
                user_goal=row["user_goal"],
                product_type=row["product_type"],
                target_model=row["target_model"],
                max_budget=row["max_budget"],
                data_source=row["data_source"],
                best_listing_title=row["best_listing_title"],
                best_listing_price=row["best_listing_price"],
                best_deal_score=row["best_deal_score"],
                best_risk_level=row["best_risk_level"],
                apify_called=bool(row["apify_called"]),
                llm_called=bool(row["llm_called"]),
            )
            for row in rows
        ]

    def get_report(self, report_id: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload_json FROM deal_reports WHERE report_id = ?",
                (report_id,),
            ).fetchone()
        if row is None:
            return None
        return json.loads(row["payload_json"])

    def delete_report(self, report_id: str) -> bool:
        with self._connect() as connection:
            cursor = connection.execute("DELETE FROM deal_reports WHERE report_id = ?", (report_id,))
            return cursor.rowcount > 0

    def clear_reports(self) -> dict[str, int]:
        with self._connect() as connection:
            cursor = connection.execute("DELETE FROM deal_reports")
            return {"reports_deleted": cursor.rowcount}

    def _connect(self) -> sqlite3.Connection:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS deal_reports (
                    report_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    user_goal TEXT NOT NULL,
                    product_type TEXT NOT NULL,
                    target_model TEXT NOT NULL,
                    max_budget INTEGER,
                    data_source TEXT NOT NULL,
                    best_listing_title TEXT,
                    best_listing_price INTEGER,
                    best_deal_score INTEGER,
                    best_risk_level TEXT,
                    apify_called INTEGER NOT NULL DEFAULT 0,
                    llm_called INTEGER NOT NULL DEFAULT 0,
                    payload_json TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_deal_reports_created_at ON deal_reports(created_at DESC)"
            )
