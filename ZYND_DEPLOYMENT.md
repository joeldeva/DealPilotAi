# Zynd AI Deployment Package

DealPilot includes a separate Zynd-ready service package in `zynd/`.

This is for real Zynd deployment/discovery. It is intentionally separate from the main FastAPI backend so the normal demo remains stable and mock-safe.

## What Is Included

```text
zynd/
  service.py
  service.config.json
  requirements.txt
  .env.example
  .well-known/agent.json
  README.md
```

## How It Works

The Zynd service wrapper accepts a buying goal through `/webhook/sync`, calls the hosted DealPilot backend at:

```text
POST /api/demo/full-run
```

and returns a compact recommendation with:

- best listing
- deal score
- risk score
- negotiation target
- seller questions
- credit-safety flags

The wrapper always sends safe flags:

```json
{
  "use_live_apify": true,
  "confirm_live_run": true,
  "apify_source": "olx",
  "use_live_llm": false,
  "confirm_live_llm": false
}
```

For final real-data mode, the wrapper can request Apify through the hosted DealPilot backend using `ZYND_USE_LIVE_APIFY=true` and `ZYND_CONFIRM_LIVE_RUN=true`. Gemini remains disabled. To run a no-credit Zynd smoke test, set `ZYND_USE_LIVE_APIFY=false`.

## Required Before Real Zynd Deployment

1. Deploy the main DealPilot backend.
2. Set `DEALPILOT_API_BASE_URL` in `zynd/.env`.
3. For real-data Zynd invocation, set `ZYND_USE_LIVE_APIFY=true`, `ZYND_CONFIRM_LIVE_RUN=true`, `ZYND_APIFY_SOURCE=olx`, and `ZYND_MAX_ITEMS=10`.
4. Get or generate a Zynd service keypair.
5. Upload the `zynd/` folder and keypair through `deployer.zynd.ai`.

Do not upload:

- developer private keys
- `~/.zynd/developer.json`
- `.venv`
- `__pycache__`
- `node_modules`

## Zynd Deployer Flow

1. Open `https://deployer.zynd.ai`.
2. Select `Service`.
3. Upload the `zynd/` folder as the project folder.
4. Upload the service keypair JSON separately.
5. Deploy.
6. Wait until `/health` returns 200.
7. Invoke:

```bash
curl -X POST https://your-zynd-service.deployer.zynd.ai/webhook/sync \
  -H "Content-Type: application/json" \
  -d '{"content":"Find me a used iPhone 14 under INR 45000"}'
```

## Why This Is Efficient

Zynd should be used for identity, discovery, and service invocation. It should not be called on every normal frontend page load.

Normal users use the DealPilot frontend and backend directly. Zynd users or agents can discover DealPilot and invoke it through the Zynd service wrapper.

## Current Status

- Local agent card: implemented in the main backend.
- Zynd-ready service package: implemented in `zynd/`.
- Hosted DealPilot backend target: `https://dealpilot-ai-phi.vercel.app/server`.
- Real Zynd deployment: manual step, not run automatically.
- Zynd API calls from main app: none.
