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
  "use_live_apify": false,
  "confirm_live_run": false,
  "use_live_llm": false,
  "confirm_live_llm": false
}
```

So Zynd service calls do not consume Apify or Gemini credits by default.

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
