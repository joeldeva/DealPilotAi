# Final Demo Checklist

## Before the Demo

- Keep `.env.example` safe:
  - `APIFY_LIVE_MODE=true` for the hosted final demo
  - `GEMINI_LIVE_MODE=false`
  - `ZYND_ENABLED=false`
  - `SUPERPLANE_ENABLED=false`
- Use one controlled live Apify run, then rely on Apify cache for repeat demos.
- Do not enable Gemini during the default demo.
- Confirm frontend dependencies are installed.
- Confirm backend virtual environment is ready.

## Backend Start Command

```powershell
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Expected backend URL:

```text
http://localhost:8000
```

## Frontend Start Command

```powershell
cd frontend
npm install
npm run dev
```

Expected frontend URL:

```text
http://localhost:3000
```

## Health Check

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Expected:

- `status: ok`
- `APIFY_LIVE_MODE: false`
- `GEMINI_LIVE_MODE: false`
- `ZYND_ENABLED: false`
- `SUPERPLANE_ENABLED: false`

## Hosted Vercel Check

After deploying with Vercel Services, the backend is available under `/server`:

```powershell
Invoke-RestMethod https://your-vercel-app.vercel.app/server/health
Invoke-RestMethod https://your-vercel-app.vercel.app/server/api/apify/status
Invoke-RestMethod https://your-vercel-app.vercel.app/server/api/zynd/status
Invoke-RestMethod https://your-vercel-app.vercel.app/server/api/superplane/status
Invoke-RestMethod https://your-vercel-app.vercel.app/server/api/superplane/canvas
```

Open the hosted frontend:

```text
https://your-vercel-app.vercel.app
```

Confirm the hosted proof panel appears and all default live-call flags are false.

## Mock Demo Run

PowerShell API test:

```powershell
$body = @{
  user_goal = "Find me a used iPhone 14 under INR 45000"
  use_live_apify = $false
  confirm_live_run = $false
  use_live_llm = $false
  confirm_live_llm = $false
  max_items = 10
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:8000/api/demo/full-run" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- `ranked_results` is not empty
- `best_recommendation` exists
- `data_source: mock_fallback`
- `credit_safety.apify_called: false`
- `credit_safety.llm_called: false`
- `credit_safety.zynd_called: false`
- `credit_safety.superplane_called: false`

## UI Demo Steps

1. Open `http://localhost:3000`.
2. Point to the hero:
   - DealPilot AI
   - Autonomous Deal Intelligence & Negotiation Agent
3. Point to data mode:
   - Real-data mode
   - Apify live/cache enabled
   - max items capped at 10
   - Gemini off
4. Click `Used iPhone 14 under INR 45,000`.
5. Show agent workflow timeline.
6. Show parsed buyer intent.
7. Show best recommendation.
8. Show ranked listing cards.
9. Show deal score, risk level, risk flags, and safety advice.
10. Show negotiation strategy:
    - opening message
    - follow-up message
    - questions to ask seller
    - walkaway conditions
11. Show sponsor badges.
12. Show credit-safety panel.

## What To Say During Demo

"DealPilot AI is a buyer-side agent for second-hand marketplaces. It takes a buying goal and runs an agentic workflow: intent understanding, marketplace search, deal analysis, scam risk signal detection, decision ranking, and negotiation strategy."

"The hosted prototype uses protected real-data mode: Apify live data on the controlled first run, then cache replay for repeat demos. Gemini, Zynd API calls, and Superplane API calls remain off."

"Apify is the controlled marketplace intelligence layer. Zynd AI is represented through a local agent card and a Zynd-ready service wrapper for deployer-based discovery. Superplane is represented through local workflow events and a canvas export. GitHub Copilot accelerated the build."

"The risk analysis is a set of risk signals, not a guarantee. The negotiation message is only a draft; DealPilot does not contact sellers."

## Screenshot Checklist

Capture:

- hero and search input
- data mode controls
- sponsor badges
- agent workflow timeline
- best recommendation card
- ranked listing with deal/risk score
- negotiation strategy panel
- credit-safety panel showing false external-call flags

Suggested filenames:

```text
screenshots/dealpilot-homepage.png
screenshots/dealpilot-results.png
screenshots/dealpilot-credit-safety.png
```

## Backup Plan If Live Apify Fails

Use mock demo mode.

Say:

"For credit safety, the prototype defaults to mock-safe mode. The Apify adapter is implemented with live-mode gates, max item caps, caching, and fallback behavior. If live Apify is unavailable or not confirmed, DealPilot returns mock fallback data so the demo remains stable."

Then show:

- `data_source: mock_fallback`
- `apify_called: false`
- ranked results still render
- workflow trace still completes

## Confirm Credit Safety Flags In Mock Mode

Before presenting, confirm the credit-safety panel shows:

- Apify called: `false`
- Apify cache used: `false`
- LLM called: `false`
- Zynd called: `false`
- Superplane called: `false`
- Source: `Apify live` on the controlled first run or `Apify cache` on replay

## Final Pre-Submission Checks

Run:

```powershell
cd frontend
npm run lint
npm run build
```

Run:

```powershell
cd ..
python backend/app/scripts/test_apify_safety.py
```

Expected:

- frontend type check passes
- frontend build passes
- Apify safety tests pass
- no external API calls are made
