# DealPilot AI Productization Plan

DealPilot is moving from hackathon demo toward a real buyer-side product in controlled stages.

## Current Product Step

Implemented now:

- local SQLite report persistence
- every full agent run can be saved as a deal report
- report summaries are available through backend APIs
- frontend shows recent saved deal reports
- Superplane-style local canvas export
- mock-safe mode remains the default
- no external APIs are called for persistence

This turns DealPilot from a one-off demo into the beginning of a reusable deal history product.

## New Local Product APIs

- `GET /api/reports`
- `GET /api/reports/{report_id}`
- `DELETE /api/reports/{report_id}`
- `POST /api/reports/clear`

The database file is local:

```text
backend/app/data/dealpilot.sqlite3
```

It is ignored by git.

## Next Product Milestones

1. Saved searches and watchlists.
2. User accounts.
3. Product-specific valuation tables.
4. Controlled Apify ingestion history.
5. Listing deduplication.
6. Audit logs for live runs.
7. Notification rules.
8. Postgres/Supabase migration.
9. Zynd registration flow.
10. Superplane deployment workflow.

## Safety Position

Real product work must preserve these defaults:

- no live Apify unless explicitly enabled and confirmed
- no Gemini unless explicitly enabled and confirmed
- no real seller messaging
- no automatic external calls on startup
- local-first development before cloud services
