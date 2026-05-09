# DealPilot AI Zynd Service

This folder is the upload package for Zynd deployer.

## Purpose

Expose DealPilot AI as a discoverable Zynd service:

- incoming Zynd call: `/webhook/sync`
- service handler: `service.py`
- backend target: `https://dealpilot-ai-phi.vercel.app/server/api/demo/full-run`
- response: compact deal recommendation, risk posture, negotiation draft, and safety flags

## Files

```text
service.py
service.config.json
requirements.txt
.env.example
.well-known/agent.json
```

Before upload, create a local `.env` from `.env.example`:

```env
DEALPILOT_API_BASE_URL=https://dealpilot-ai-phi.vercel.app/server
```

Do not include developer private keys. Upload the Zynd service keypair separately in the deployer UI.

## Safe Defaults

The wrapper always invokes DealPilot in safe mode:

```json
{
  "use_live_apify": true,
  "confirm_live_run": true,
  "use_live_llm": false,
  "confirm_live_llm": false
}
```

For the final real-data demo, `.env.example` enables Apify live mode through the hosted DealPilot backend with `ZYND_MAX_ITEMS=10`. Gemini remains disabled. If you need a no-credit Zynd test, set `ZYND_USE_LIVE_APIFY=false`.

## Test Payload

After deployment:

```bash
curl -X POST https://your-zynd-service.deployer.zynd.ai/webhook/sync \
  -H "Content-Type: application/json" \
  -d '{"content":"Find me a used iPhone 14 under INR 45000"}'
```

Expected result includes:

- `service`: `DealPilot AI`
- `mode`: `zynd_service_wrapper`
- `best_listing`
- `recommendation`
- `negotiation_draft`
- `credit_safety`
