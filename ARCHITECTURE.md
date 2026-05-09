# DealPilot AI Architecture

## Architecture Principles

- Mock-first: every feature must work without API keys or external services.
- No automatic external calls: imports, startup, health checks, and page loads must not call Apify, LLMs, Zynd AI, or Superplane.
- Deterministic core: scoring, risk detection, price estimation, and drafts use local rules and templates for the MVP.
- Optional live mode: external integrations are isolated behind explicit configuration flags, runtime guards, and manual confirmation.
- Traceable workflow: every run records agent steps for the demo and future production observability.

## Proposed Stack

- Frontend: Next.js with TypeScript.
- Backend: FastAPI with Python.
- Agent workflow: local LangGraph-style orchestrator, implemented as explicit workflow nodes first; real LangGraph can be added only if needed.
- Storage for MVP: in-memory store plus local JSON fixtures.
- External integrations: adapter interfaces with mock implementations as the default.

This stack fits the references: Apify and Zynd have Python SDK patterns, LangGraph is Python-first, and the UI can stay fast in Next.js.

## Folder Structure

```text
dealpilot-ai/
  PROJECT_BRIEF.md
  ARCHITECTURE.md
  MVP_PLAN.md
  AGENTS.md
  CREDIT_SAFETY.md
  frontend/
    app/
    components/
    lib/
    styles/
  backend/
    app/
      main.py
      api/
        routes/
      agents/
        graph.py
        state.py
        nodes/
      integrations/
        apify/
          client.py
          mock_client.py
        zynd/
          identity.py
          mock_registry.py
        superplane/
          events.py
      services/
        scoring.py
        pricing.py
        risk.py
        negotiation.py
      models/
        listing.py
        search.py
        analysis.py
      storage/
        memory.py
      data/
        mock_listings.json
        demo_scenarios.json
      tests/
  reference-repos/
```

Application code is intentionally not created in this planning step.

## Runtime Modes

### Mock Mode

Default mode. Uses local fixtures and deterministic logic.

Required defaults:

- `APIFY_LIVE_MODE=false`
- `GEMINI_LIVE_MODE=false`
- `ZYND_ENABLED=false`
- `SUPERPLANE_ENABLED=false`

### Live Mode

Optional controlled demo mode. Live mode is allowed only when:

1. The relevant environment flag is true.
2. Required API keys are present.
3. The request includes an explicit `mode=live`.
4. The user completes a manual confirmation step.
5. Safety limits are enforced before any call is made.

## API Endpoints

### Health and Metadata

- `GET /api/health`
  - Returns service status and active mode flags.
  - Must not call external services.

- `GET /.well-known/agent.json`
  - Returns a local DealPilot AI entity card for Zynd-style discovery.
  - In mock mode, returns unsigned or locally signed static metadata only.

### Demo Fixtures

- `GET /api/demo/scenarios`
  - Returns preset goals for the demo.
  - Source: local JSON.

### Search and Analysis

- `POST /api/searches`
  - Body:
    ```json
    {
      "goal": "Find me a used iPhone 14 under INR 45000",
      "location": "Bengaluru",
      "budget": 45000,
      "currency": "INR",
      "mode": "mock"
    }
    ```
  - Creates a search run and executes the agent workflow.
  - Defaults to mock mode.

- `GET /api/searches/{search_id}`
  - Returns run status, result summary, listings, agent trace, and mode.

- `POST /api/searches/{search_id}/rerank`
  - Reranks already fetched listings using local scoring weights.
  - Does not fetch new external data.

### Listing Details

- `GET /api/listings/{listing_id}`
  - Returns normalized listing, scoring details, risk flags, and draft messages.

- `POST /api/listings/{listing_id}/negotiation-draft`
  - Generates or regenerates a local template-based negotiation draft.
  - Body can include tone: `polite`, `firm`, or `fast_close`.

### Controlled Live Apify

- `POST /api/integrations/apify/live-run/preview`
  - Shows what would be sent to Apify: actor ID, query, max items, cache key, and estimated risk.
  - Must not call Apify.

- `POST /api/integrations/apify/live-run/confirm`
  - The only endpoint allowed to call Apify in future implementation.
  - Requires `APIFY_LIVE_MODE=true`, valid token, explicit confirmation text, and remaining run budget.
  - Not implemented in the first app-code milestone.

## Data Model

### BuyingGoal

```json
{
  "goal_text": "Find me a used iPhone 14 under INR 45000",
  "product": "iPhone 14",
  "category": "smartphone",
  "budget": 45000,
  "currency": "INR",
  "location": "Bengaluru",
  "condition_preferences": ["used", "good", "with bill"]
}
```

### SearchRun

```json
{
  "id": "search_mock_001",
  "mode": "mock",
  "status": "completed",
  "goal": {},
  "created_at": "ISO-8601",
  "completed_at": "ISO-8601",
  "cache_key": "iphone-14|bengaluru|45000|mock",
  "agent_trace": []
}
```

### ListingRaw

```json
{
  "source": "mock_apify_marketplace",
  "source_listing_id": "mock_iphone_001",
  "raw_title": "iPhone 14 128GB Blue",
  "raw_price": "42000",
  "raw_location": "Indiranagar",
  "raw_url": "https://example.invalid/listing/mock_iphone_001",
  "raw_payload": {}
}
```

### ListingNormalized

```json
{
  "id": "listing_001",
  "title": "iPhone 14 128GB Blue",
  "product": "iPhone 14",
  "category": "smartphone",
  "price": 42000,
  "currency": "INR",
  "condition": "good",
  "location": "Indiranagar, Bengaluru",
  "seller_name": "Amit",
  "seller_age_days": 830,
  "seller_rating": 4.6,
  "image_url": null,
  "listing_url": "https://example.invalid/listing/mock_iphone_001",
  "posted_at": "ISO-8601",
  "source": "mock"
}
```

### DealAnalysis

```json
{
  "listing_id": "listing_001",
  "fair_price_estimate": 39500,
  "suggested_opening_offer": 36500,
  "walkaway_price": 43000,
  "deal_score": 87,
  "risk_score": 18,
  "risk_flags": ["price_within_market", "seller_history_good"],
  "explanation": "Strong price for condition and seller profile."
}
```

### NegotiationDraft

```json
{
  "listing_id": "listing_001",
  "tone": "polite",
  "message": "Hi, I am interested in the iPhone 14. Since similar listings are around INR 39,500, would you consider INR 36,500 if I can pick it up soon?",
  "strategy": "Anchor below fair price while showing readiness to close."
}
```

## Agent Workflow

```text
START
  -> parse_goal
  -> collect_listings
  -> normalize_listings
  -> detect_risks
  -> estimate_fair_price
  -> score_deals
  -> generate_negotiation_drafts
  -> compose_response
END
```

Each node receives and returns a shared `DealPilotState`. The state contains the parsed goal, listings, analysis results, errors, mode, cache metadata, and trace entries.

## Integration Boundaries

### Apify

The Apify adapter exposes:

- `search_listings(goal, limits, mode)`
- `preview_live_run(goal, limits)`
- `read_cached_results(cache_key)`
- `write_cached_results(cache_key, listings)`

Default implementation: mock fixture adapter.

Future live implementation: use Apify Python client only inside the explicit confirmed live-run path. The live adapter must cap item count and fetch dataset items only after the actor run completes.

### Zynd AI

The Zynd adapter exposes:

- `get_entity_card()`
- `register_agent()` only when `ZYND_ENABLED=true`
- `heartbeat()` only when `ZYND_ENABLED=true` and manually started

Default implementation: local entity card, no registry, no heartbeat.

### Superplane

The Superplane adapter exposes:

- `record_event(event)`
- `export_canvas_definition()`

Default implementation: local event log and static workflow definition. No Superplane service is started.

