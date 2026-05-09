# Zynd AI Workshop Integration Notes

Video reviewed:

- Title: `Zynd AI Botathon Workshop`
- YouTube URL: `https://youtu.be/oDpUyn1EanY`
- Public captions/transcript: not exposed by YouTube at review time

Because a transcript was not available, the integration below is based on the public video metadata plus the official Zynd documentation for services, agent cards, webhooks, and deployer flow.

## What Zynd Wants To See

Zynd is not a normal per-request API integration. It is an identity, discovery, and invocation layer for agents/services.

Important Zynd concepts mapped into DealPilot:

- Agent/service discoverability
- `/.well-known/agent.json` metadata
- capabilities, tags, category, and endpoints
- `/webhook/sync` style invocation through a service wrapper
- `/health` liveness requirement
- service keypair uploaded separately during deploy
- no developer private key inside the project folder
- deployer package below 50 MB

## Implemented In DealPilot

Main hosted app:

- `GET /server/.well-known/agent.json`
- `GET /server/api/agent-card`
- `GET /server/api/zynd/status`

Zynd deploy package:

```text
zynd/
  service.py
  service.config.json
  requirements.txt
  .env.example
  .well-known/agent.json
  README.md
```

## Zynd Service Behavior

The service accepts a buying goal:

```json
{"content":"Find me a used iPhone 14 under INR 45000"}
```

It calls the hosted DealPilot backend:

```text
POST https://dealpilot-ai-phi.vercel.app/server/api/demo/full-run
```

Then it returns:

- best listing
- deal score
- risk level
- negotiation target
- opening negotiation draft
- questions to ask seller
- credit-safety flags

## Credit Safety

The Zynd wrapper never enables live Apify or Gemini by default:

```json
{
  "use_live_apify": false,
  "confirm_live_run": false,
  "use_live_llm": false,
  "confirm_live_llm": false
}
```

This means Zynd calls can demonstrate agent discovery/invocation without spending Apify or LLM credits.

## Manual Deployment Flow

1. Open `https://deployer.zynd.ai`.
2. Choose `Service`.
3. Upload the `zynd/` folder.
4. Upload the service keypair JSON separately.
5. Deploy.
6. Wait for `/health` to return 200.
7. Invoke `/webhook/sync` with a buying goal.

## Demo Pitch Line

DealPilot AI exposes a Zynd-ready service wrapper so other agents can discover and invoke it as a buyer-side marketplace intelligence service. The default Zynd path remains mock-safe and does not trigger Apify or Gemini quota.
