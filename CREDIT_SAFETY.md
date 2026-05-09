# DealPilot AI Credit Safety

DealPilot AI is mock-safe by default. The MVP is designed to run, demo, and be judged without consuming Apify, Gemini, Zynd, Superplane, or other external API credits.

## Final Safety Status

Implemented now:

- mock mode is the default path
- Apify integration exists but is disabled by default
- Gemini enhancement exists but is disabled by default
- Zynd exposes a local agent card only
- Superplane-style events are simulated locally
- no external API call is made on backend startup
- no external API call is made on frontend page load
- no external API call is made by default demo buttons
- no real seller messaging is implemented

## Required Default Environment

These defaults must remain in `.env.example`:

```text
APIFY_LIVE_MODE=false
APIFY_API_TOKEN=
APIFY_ACTOR_ID=
APIFY_DEFAULT_SOURCE=google
APIFY_OLX_ACTOR_ID=
APIFY_EBAY_ACTOR_ID=
APIFY_FACEBOOK_ACTOR_ID=
APIFY_GOOGLE_ACTOR_ID=
APIFY_MAX_ITEMS=10
APIFY_MAX_TOTAL_CHARGE_USD=1.00
APIFY_CACHE_ENABLED=true
APIFY_CACHE_TTL_MINUTES=1440
APIFY_LIVE_RUN_AUDIT_ENABLED=true

GEMINI_LIVE_MODE=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
GEMINI_TIMEOUT_SECONDS=20
GEMINI_MAX_OUTPUT_TOKENS=220
GEMINI_AUDIT_ENABLED=true

ZYND_ENABLED=false
ZYND_AGENT_NAME=DealPilot AI
ZYND_DEVELOPER_KEYPAIR_PATH=

SUPERPLANE_ENABLED=false
WORKFLOW_EVENTS_ENABLED=true
```

## No Automatic API Calls

External calls must never happen during:

- Python module import
- FastAPI app startup
- `/health`
- frontend page load
- mock demo button click
- local safety tests
- event timeline rendering
- agent card rendering

Live integrations are only allowed inside explicitly gated request paths.

## Apify Safety

Apify is blocked unless all gates pass:

1. `APIFY_LIVE_MODE=true`
2. `APIFY_API_TOKEN` is configured
3. `APIFY_ACTOR_ID` is configured
4. request has `use_live_apify=true`
5. request has `confirm_live_run=true`
6. frontend confirmation checkbox is selected when using the UI
7. cache does not already contain a fresh result

Source-specific Apify actor IDs are supported:

- `APIFY_OLX_ACTOR_ID`
- `APIFY_EBAY_ACTOR_ID`
- `APIFY_FACEBOOK_ACTOR_ID`
- `APIFY_GOOGLE_ACTOR_ID`

If a selected source does not have its own actor ID, DealPilot falls back to `APIFY_ACTOR_ID`. If no actor is available, it returns mock fallback data.

If any gate is missing, the backend returns mock data with:

```json
{
  "data_source": "mock_fallback",
  "credit_safety": {
    "apify_called": false
  }
}
```

### Max Item Cap

Default:

```text
APIFY_MAX_ITEMS=10
```

Hard cap:

```text
20 items
```

Even if the UI or API requests more, the backend clamps the live run to 20 or lower.

### Max Charge Cap

Default:

```text
APIFY_MAX_TOTAL_CHARGE_USD=1.00
```

DealPilot passes this cap to the Apify actor call when a confirmed live run is attempted. Keep the value low for first tests.

### Live Run Audit Log

Default:

```text
APIFY_LIVE_RUN_AUDIT_ENABLED=true
```

Local audit location:

```text
backend/app/data/audit/apify_live_runs.jsonl
```

Audit entries record:

- timestamp
- query
- source
- actor configured status
- actor ID hash, not the full actor ID
- max item request and actual cap
- max charge cap
- confirmation status
- outcome
- whether Apify was called
- returned data source
- error type if a live run failed

Audit endpoints:

- `GET /api/apify/audit`
- `POST /api/apify/audit/clear`

### Cache Strategy

Apify cache location:

```text
backend/app/data/cache/
```

Cache rules:

- cache is enabled by default
- default TTL is 1440 minutes
- same-query fresh cache returns `data_source: "apify_cache"`
- cache hits set `apify_called=false`
- cache reads do not call Apify
- cache can be cleared with `POST /api/apify/cache/clear`

### Failure Fallback

Any Apify error returns mock fallback instead of crashing:

- missing credentials
- missing actor ID
- network failure
- actor failure
- dataset parsing issue
- timeout
- unexpected response shape

## Gemini Safety

Gemini is blocked unless all gates pass:

1. `GEMINI_LIVE_MODE=true`
2. `GEMINI_API_KEY` is configured
3. request has `use_live_llm=true`
4. request has `confirm_live_llm=true`
5. frontend LLM confirmation checkbox is selected when using the UI

If any gate is missing, deterministic fallback text is used and the response includes:

```json
{
  "llm_called": false
}
```

The default agent intelligence does not require any LLM.

### Gemini Audit Log

Default:

```text
GEMINI_AUDIT_ENABLED=true
```

Local audit location:

```text
backend/app/data/audit/gemini_calls.jsonl
```

Audit entries record:

- timestamp
- purpose
- model
- prompt hash, not prompt text
- prompt character count
- live mode and confirmation flags
- API key configured status
- whether Gemini was called
- fallback/live mode
- failure type when applicable

Audit endpoints:

- `GET /api/gemini/status`
- `GET /api/gemini/audit`
- `POST /api/gemini/audit/clear`

## Zynd Safety

`ZYND_ENABLED=false` by default.

Implemented behavior:

- `GET /api/agent-card` returns a local agent card
- `GET /.well-known/agent.json` returns the same local identity card
- `GET /api/zynd/status` reports local/mock status
- no registration call is made
- no heartbeat is started
- credentials are not required

Future Zynd registration must be a deliberate manual action.

## Superplane Safety

`SUPERPLANE_ENABLED=false` by default.

Implemented behavior:

- workflow events are stored locally in memory
- `/api/superplane/status` reports `mode: "local_event_simulation"`
- `/api/superplane/canvas` exports local workflow metadata only
- `superplane_called=false`
- no Superplane process, container, service, or API call is used

## Mock Fallback Strategy

Fallback order:

1. fresh cached Apify result, if the request is eligible and cache exists
2. product-specific mock fixture
3. category-level mock fixture
4. empty result with an explanation and no external call

Mock data currently covers:

- used iPhone 14 under INR 45,000
- used PS5 under INR 35,000
- used MacBook under INR 60,000

## Validation

Run the local Apify safety test:

```powershell
python backend/app/scripts/test_apify_safety.py
```

Expected:

- all safety gate tests pass
- Apify client import is not attempted
- `apify_called=false`
- no Apify API call is made

Check runtime status:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/api/apify/status
Invoke-RestMethod http://localhost:8000/api/zynd/status
Invoke-RestMethod http://localhost:8000/api/superplane/status
```

## Controlled Live Run Rule

Only run live Apify after a human deliberately:

1. verifies mock demo first
2. sets token and actor ID
3. sets `APIFY_LIVE_MODE=true`
4. keeps `APIFY_MAX_ITEMS=10`
5. selects live Apify in the UI
6. checks the credit confirmation box
7. runs one search
8. switches `APIFY_LIVE_MODE=false` again after the test

Never run repeated live tests without checking cache and the returned `credit_safety` fields.
