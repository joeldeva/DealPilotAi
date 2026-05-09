# DealPilot AI

Team: Neural Negotiators

DealPilot AI is an autonomous deal intelligence agent that researches marketplace listings, detects risky offers, ranks the best deals, and generates personalized negotiation strategies to help users buy smarter and safer.

## One-Line Pitch

DealPilot AI is an autonomous deal intelligence agent that researches marketplace listings, detects risky offers, ranks the best deals, and generates personalized negotiation strategies to help users buy smarter and safer.

## Problem

Buying second-hand products is high-friction and risky. Buyers have to compare unclear listings, estimate fair market value, spot scams, understand seller trust signals, and negotiate without making false claims or unsafe payment decisions.

For products like used phones, consoles, and laptops, a cheap listing is not always a good deal. Missing bill information, urgent-sale language, advance-payment requests, damaged-device wording, or vague descriptions can turn a low price into a bad purchase.

## Solution

DealPilot AI turns a buyer goal into a structured agent workflow:

1. Understand the buyer intent and budget.
2. Search marketplace listings.
3. Normalize listing data.
4. Score deal quality.
5. Detect scam and safety risks.
6. Rank the best options.
7. Draft ethical seller-specific negotiation messages.

The MVP works fully in mock-safe mode without API keys or external API calls.

## Why This Is Agentic

DealPilot behaves like a focused buying agent rather than a static search page. It takes a goal, decomposes it into subtasks, runs each specialized agent step, preserves an event trace, and returns an explainable recommendation.

Implemented agent pipeline:

```text
Intent Understanding
  -> Marketplace Search
  -> Listing Normalization
  -> Deal Analysis
  -> Scam Risk Detection
  -> Decision Ranking
  -> Negotiation Strategy
  -> Final Recommendation
```

Each step produces structured output used by later steps. The final recommendation is based on both value and risk, not just lowest price.

## Core Workflow

Example user goal:

```text
Find me a used iPhone 14 under INR 45,000 with good battery health
```

DealPilot returns:

- parsed buyer intent
- ranked listings
- deal score
- scam risk score and flags
- fair price estimate
- negotiation target price
- best recommendation
- seller questions
- walkaway conditions
- ethical negotiation draft
- workflow event trace
- credit-safety status

## Architecture

```text
frontend/ Next.js + TypeScript + Tailwind dashboard
  -> backend/ FastAPI API
    -> mock data service
    -> credit-safe Apify adapter
    -> deterministic agent pipeline
    -> optional Gemini adapter, disabled by default
    -> local Zynd agent card
    -> local Superplane-style workflow events
```

Backend agents:

- `intent_parser.py`: extracts product, model, budget, currency, preferences, and urgency.
- `deal_analyzer.py`: scores value, condition, seller quality, description quality, and price position.
- `scam_detector.py`: flags urgent-sale language, advance-payment requests, vague listings, missing documents, and suspicious pricing.
- `decision_ranker.py`: ranks options with `final_score = deal_score - (risk_score * 0.6)`.
- `negotiation_agent.py`: drafts ethical messages, seller questions, and walkaway conditions.
- `orchestrator.py`: coordinates the full run and returns the agent trace.

## Sponsor Integrations

### Apify

Implemented as a credit-safe marketplace data adapter. Mock data is used by default. Live Apify can only run when:

- `APIFY_LIVE_MODE=true`
- `APIFY_API_TOKEN` is configured
- `APIFY_ACTOR_ID` is configured
- optional source actor IDs are configured for OLX, eBay, Facebook, or Google
- request body includes `confirm_live_run=true`
- the frontend confirmation checkbox is selected

Results are cached locally and item count is hard-capped at 20.

### Zynd AI

Implemented as a local agent identity layer. DealPilot exposes:

- `GET /api/agent-card`
- `GET /.well-known/agent.json`
- `GET /api/zynd/status`

Zynd registration is disabled by default and no Zynd API call is made during the MVP demo.

A real Zynd-ready service package is available in `zynd/` for manual deployment through `deployer.zynd.ai`. See [ZYND_DEPLOYMENT.md](ZYND_DEPLOYMENT.md). This wrapper is separate from the main app and is not started automatically.

### Superplane

Implemented as local workflow-event simulation. DealPilot emits events for the full pipeline:

```text
USER_REQUEST_RECEIVED -> INTENT_PARSED -> MARKETPLACE_SEARCH_COMPLETED
-> DEAL_ANALYSIS_COMPLETED -> SCAM_RISK_DETECTION_COMPLETED
-> DECISION_RANKING_COMPLETED -> NEGOTIATION_GENERATED -> DEMO_RUN_COMPLETED
```

DealPilot also exports a local Superplane-style canvas at:

```text
GET /api/superplane/canvas
```

No Superplane service is installed, run, or called.

### GitHub Copilot

Represented in the product story and sponsor badges as development acceleration for the hackathon build.

## Tech Stack

Frontend:

- Next.js
- TypeScript
- Tailwind CSS
- lucide-react icons

Backend:

- Python
- FastAPI
- Pydantic
- deterministic rule-based agents
- local JSON fixtures

Integrations:

- Apify Python client available for controlled live mode
- Gemini optional adapter, disabled by default
- Zynd local agent card
- Superplane-style local workflow trace

## Setup Instructions

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Optional frontend environment:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Hosting Instructions

For the final judging link, use the Vercel Services path documented in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md):

- Frontend service: `frontend/` at `/`
- FastAPI service: `backend/main.py` at `/server`
- Frontend env: `NEXT_PUBLIC_API_BASE_URL=/server`
- Backend env: `FRONTEND_ORIGINS=https://your-vercel-app.vercel.app`

The hosted homepage includes a proof panel that reads `/health`, `/api/apify/status`, `/api/gemini/status`, `/api/zynd/status`, `/api/superplane/status`, and `/api/superplane/canvas`. This lets judges see sponsor integration readiness and credit-safety flags on the live UI.

On Vercel Services, those backend checks are available under `/server`, for example:

```text
https://your-vercel-app.vercel.app/server/health
https://your-vercel-app.vercel.app/server/api/demo/full-run
```

Keep these hosted defaults for public judging:

```env
APIFY_LIVE_MODE=false
GEMINI_LIVE_MODE=false
ZYND_ENABLED=false
SUPERPLANE_ENABLED=false
```

## Mock-Safe Demo Instructions

Mock mode is the default and consumes no credits.

1. Start the backend.
2. Start the frontend.
3. Open `http://localhost:3000`.
4. Use a quick demo chip:
   - Used iPhone 14 under INR 45,000
   - Used PS5 under INR 35,000
   - Used MacBook under INR 60,000
5. Show the best recommendation, ranked results, risk flags, negotiation panel, workflow trace, and credit-safety panel.

PowerShell mock API test:

```powershell
$body = @{
  user_goal = "Find me a used iPhone 14 under INR 45000"
  use_live_apify = $false
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:8000/api/demo/full-run" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

Expected credit status:

```json
{
  "apify_called": false,
  "llm_called": false,
  "zynd_called": false,
  "superplane_called": false
}
```

## Optional Live Apify Instructions

Live Apify is optional and should be used only for one controlled test after the mock demo is stable.

Preparation:

1. Confirm mock mode works first.
2. Set `APIFY_API_TOKEN`.
3. Set `APIFY_ACTOR_ID`, or a source-specific actor such as `APIFY_OLX_ACTOR_ID`.
4. Set `APIFY_LIVE_MODE=true`.
5. Keep `APIFY_MAX_ITEMS=10`.
6. Restart the backend.
7. In the UI, enable "Use live Apify data".
8. Check "I understand this may consume Apify credits".
9. Run one search.
10. Use cached results for future demos.
11. Set `APIFY_LIVE_MODE=false` again after the test.

PowerShell environment example:

```powershell
$env:APIFY_API_TOKEN = "your-token"
$env:APIFY_ACTOR_ID = "your-actor-id"
$env:APIFY_DEFAULT_SOURCE = "olx"
$env:APIFY_OLX_ACTOR_ID = "your-olx-actor-id"
$env:APIFY_EBAY_ACTOR_ID = "your-ebay-actor-id"
$env:APIFY_FACEBOOK_ACTOR_ID = "your-facebook-actor-id"
$env:APIFY_GOOGLE_ACTOR_ID = "your-google-actor-id"
$env:APIFY_LIVE_MODE = "true"
$env:APIFY_MAX_ITEMS = "10"
$env:APIFY_MAX_TOTAL_CHARGE_USD = "1.00"
$env:APIFY_LIVE_RUN_AUDIT_ENABLED = "true"
```

Controlled live API request, only after the environment and intent are verified:

```powershell
$body = @{
  user_goal = "Find me a used iPhone 14 under INR 45000"
  use_live_apify = $true
  confirm_live_run = $true
  max_items = 10
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:8000/api/demo/full-run" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

Never run repeated live tests without checking cache and `credit_safety`.

Return to mock mode:

```powershell
$env:APIFY_LIVE_MODE = "false"
```

Then restart the backend.

## Credit Safety

Default environment:

```text
APIFY_LIVE_MODE=false
GEMINI_LIVE_MODE=false
ZYND_ENABLED=false
SUPERPLANE_ENABLED=false
WORKFLOW_EVENTS_ENABLED=true
```

Safety rules:

- No automatic external API calls on import, startup, health check, frontend page load, or demo button click.
- Apify is disabled unless live mode, credentials, and request confirmation are all present.
- Gemini is disabled unless live mode, API key, use flag, and confirmation are all present.
- Zynd serves only a local agent card unless explicitly configured later.
- Superplane is simulated with local workflow events only.
- Apify results are cached under `backend/app/data/cache/`.
- Apify item count is capped by `APIFY_MAX_ITEMS` and hard-capped at 20.
- Apify confirmed live runs use `APIFY_MAX_TOTAL_CHARGE_USD` as a per-run charge cap.
- Apify live-eligible attempts are audited locally under `backend/app/data/audit/`.
- Gemini fallback/live decisions are audited locally under `backend/app/data/audit/`.
- Any failed live integration path falls back to mock data instead of crashing the demo.

Run the Apify safety-gate test without consuming credits:

```powershell
python backend/app/scripts/test_apify_safety.py
```

## Originality And Attribution

DealPilot AI's submitted implementation is the code in this repository's `frontend/`, `backend/`, and `zynd/` folders. Reference repositories are excluded from deployment and are not copied into the submitted product.

The project uses public/open tools and sponsor SDK patterns as integration references, but the agent pipeline, UI, API layer, credit-safety gates, mock data, local workflow events, Zynd wrapper, and documentation are written for this project.

## API Endpoints

- `GET /health`
- `GET /api/apify/status`
- `POST /api/apify/cache/clear`
- `GET /api/agent-card`
- `GET /.well-known/agent.json`
- `GET /api/zynd/status`
- `GET /api/superplane/status`
- `GET /api/superplane/canvas`
- `GET /api/demo/events`
- `POST /api/demo/events/clear`
- `GET /api/demo/mock-products`
- `POST /api/search`
- `POST /api/analyze`
- `POST /api/negotiate`
- `POST /api/demo/full-run`

## Future Scope

Implemented now:

- mock-first full-stack MVP
- deterministic multi-agent workflow
- polished dashboard UI
- credit-safe Apify adapter
- local Zynd agent card
- local Superplane-style events
- optional Gemini adapter disabled by default
- local SQLite saved deal reports

Future production scope:

- controlled marketplace source expansion
- stronger product-specific valuation models
- user accounts and saved watchlists
- persistent database
- audit logs for live runs
- Zynd registration flow
- Superplane workflow deployment
- richer LLM explanations with strict budget limits
- buyer-side notification workflows

## Submission Screenshots

Recommended screenshots:

1. Homepage with hero, search input, sponsor badges, data-mode controls, and credit-safety panel.
2. Mock iPhone run showing best recommendation, ranked listing, risk flags, workflow trace, and negotiation strategy.

Suggested filenames:

```text
screenshots/dealpilot-homepage.png
screenshots/dealpilot-ranked-results.png
```
