# Hackathon Submission Copy

## Project Name

DealPilot AI

## Team Name

Neural Negotiators

## Short Description

DealPilot AI is an autonomous deal intelligence agent that researches second-hand marketplace listings, detects risky offers, ranks the best deals, and generates ethical negotiation strategies.

## Long Description

DealPilot AI helps users buy smarter and safer on second-hand marketplaces. A user enters a goal such as "Find me a used iPhone 14 under INR 45,000." The agent parses the intent, searches marketplace-style listings, normalizes the data, scores deal quality, detects scam risk signals, ranks the best options, and drafts a seller-specific negotiation message.

The MVP is built as a full-stack protected real-data demo. The hosted version uses Apify live/cache mode for marketplace collection, keeps max items capped, and keeps Gemini disabled unless explicitly confirmed. The system includes a credit-safe Apify adapter, a local Zynd AI agent card plus Zynd-ready service wrapper, Superplane-style local workflow events for production-readiness, and an optional Gemini enhancement path.

## Problem Solved

Second-hand buyers often do not know whether a listing is fairly priced, safe, or worth negotiating. Cheap listings can hide scam signals, missing documents, poor condition, or unsafe payment requests. DealPilot AI reduces this uncertainty by combining deal analysis, risk detection, ranking, and negotiation guidance in one workflow.

## How AI Is Used

The MVP uses deterministic AI-agent logic rather than default external LLM calls. The agent pipeline includes:

- intent understanding
- marketplace search
- listing normalization
- deal analysis
- scam risk detection
- decision ranking
- negotiation strategy
- final recommendation

The optional Gemini adapter can later polish explanations and negotiation messages, but it is disabled by default to protect quota.

## Apify Integration

Apify is implemented as the marketplace intelligence layer. The backend includes a credit-safe Apify adapter that can run an actor only when all safety gates pass:

- `APIFY_LIVE_MODE=true`
- token configured
- actor ID configured
- request-level live flag
- request-level confirmation
- max item cap
- cache miss

The hosted final demo uses Apify live/cache mode. If a live actor fails, the backend falls back safely so the demo remains stable.

## Zynd AI Integration

DealPilot exposes a local agent card that represents the app as a discoverable autonomous service. The agent card includes capabilities, endpoints, sponsor integration notes, and credit-safety metadata.

DealPilot also has a deployed Zynd service wrapper:

```text
https://deployer.zynd.ai/service/dealpilot-ai-79621b
```

The service accepts `POST /webhook/sync` with a buying goal, invokes the hosted DealPilot backend, and returns a compact recommendation with best listing, deal score, risk score, negotiation target, seller questions, and credit-safety flags. A successful invocation returned `data_source=apify_live`, `mode=zynd_service_wrapper`, and `credit_safety.zynd_called=true`.

## Superplane Integration

The MVP uses local Superplane-style workflow events and a local workflow canvas export to show production-ready orchestration structure. Events trace the request from intent parsing through search, analysis, risk detection, ranking, negotiation generation, and completion. No Superplane service or API is called during the demo.

## GitHub Copilot Usage

GitHub Copilot is represented as a development acceleration sponsor in the UI and project story. It supports the hackathon build process while the application itself remains independently runnable.

## Tech Stack

Frontend:

- Next.js
- TypeScript
- Tailwind CSS
- lucide-react

Backend:

- Python
- FastAPI
- Pydantic
- local JSON mock data
- deterministic rule-based agents

Integrations:

- Apify adapter with live-mode safety gates
- local Zynd agent card
- local Superplane-style workflow events
- optional Gemini adapter disabled by default

## Future Potential

DealPilot can grow into a real buyer-side marketplace copilot with controlled Apify collection, persistent user watchlists, richer price intelligence, saved negotiation history, product-specific inspection checklists, Zynd discovery, Superplane orchestration, and strict budget-limited LLM enhancements.

## Deployment

The project is prepared for Vercel Services:

- Next.js frontend at `/`
- FastAPI backend at `/server`
- hosted proof panel showing integration readiness and credit safety
