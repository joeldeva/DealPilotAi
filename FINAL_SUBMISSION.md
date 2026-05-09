# Final Submission

## Project Name

DealPilot AI

## Team Name

Neural Negotiators

## One-line Description

DealPilot AI is an autonomous deal intelligence agent that researches marketplace listings, detects risky offers, ranks the best deals, and generates personalized negotiation strategies to help users buy smarter and safer.

## Problem

Online second-hand marketplaces are risky and inefficient. Buyers face overpriced listings, scam risk signals, fake urgency, vague descriptions, missing documentation, and weak negotiation confidence.

Buying a used phone, console, or laptop often requires several manual decisions:

- Is this price fair?
- Is the seller trustworthy enough?
- Is the listing suspiciously cheap or overpriced?
- What should I ask before paying?
- What is a reasonable negotiation offer?

DealPilot AI turns that messy buying process into a structured agentic workflow.

## Solution

DealPilot AI acts as an autonomous buyer-side agent. A user enters a buying goal, such as:

```text
Find me a used iPhone 14 under INR 45,000
```

The prototype then:

1. Parses the buyer intent.
2. Searches marketplace-style listings in demo mode.
3. Normalizes listing data.
4. Analyzes deal quality.
5. Detects scam and safety risk signals.
6. Ranks the strongest opportunities.
7. Drafts ethical negotiation messages.

The current hackathon prototype runs in mock-safe demo mode by default, so it works without API keys and avoids accidental credit usage.

## Sponsor Integrations

### Apify

Apify is the core marketplace intelligence layer for crawling and extracting listing data.

Implemented in the prototype:

- credit-safe Apify adapter
- live mode disabled by default
- manual confirmation required
- max item cap
- local cache fallback
- mock fallback when live conditions are not met

The demo uses mock listings by default. A future controlled live run can use Apify after explicit environment setup and UI confirmation.

### Zynd AI

Zynd AI is the agent identity and discoverability layer.

Implemented in the prototype:

- local DealPilot agent card
- capability list
- local endpoints for agent metadata
- SDK-ready adapter boundary

Future scope:

- register DealPilot as a discoverable service through Zynd when credentials and deployment are configured.

### Superplane

Superplane is the workflow-readiness layer.

Implemented in the prototype:

- local event-driven orchestration trace
- workflow events for request, search, analysis, risk detection, ranking, negotiation, and completion
- frontend timeline showing the agentic workflow

No Superplane service is run in demo mode.

### GitHub Copilot

GitHub Copilot was used as a development accelerator for frontend implementation, backend APIs, agent logic, documentation, debugging, and test generation.

## AI Agent Workflow

```text
Intent Understanding -> Marketplace Search -> Deal Analysis -> Scam Risk Detection -> Decision Ranking -> Negotiation Strategy
```

Agent behavior:

- Intent Understanding extracts product, model, budget, currency, and preferences.
- Marketplace Search returns normalized listings from mock data by default.
- Deal Analysis scores product match, price fit, seller quality, condition, and description quality.
- Scam Risk Detection flags risk signals such as fake urgency, advance-payment language, vague descriptions, missing bill/warranty, and unusually low pricing.
- Decision Ranking combines deal score and risk score so risky listings do not win just because they are cheap.
- Negotiation Strategy generates ethical draft messages, seller questions, target price, and walkaway conditions.

## Technical Stack

- Next.js
- TypeScript
- Tailwind CSS
- FastAPI
- Python
- Pydantic
- Apify adapter
- LangGraph-style orchestration
- Zynd AI SDK-ready adapter
- Superplane-style event workflow
- GitHub Copilot

## Impact

DealPilot AI can expand beyond electronics into:

- vehicles
- furniture
- real estate rentals
- B2B procurement
- local commerce
- collectible marketplaces
- high-value used goods

The broader opportunity is buyer-side decision support: helping users understand value, risk signals, negotiation strategy, and next best actions before they spend money.

## What Is Implemented Now

- full-stack prototype
- Vercel Services deployment config
- polished one-page demo dashboard
- mock-safe demo flow
- deterministic agent pipeline
- ranked marketplace-style results
- risk signal detection
- negotiation draft generation
- credit-safety panel
- Apify live-mode guardrails
- Zynd local agent card
- Zynd-ready service deployment package
- Superplane-style local event trace
- Superplane-style local canvas export
- final documentation and demo script

## What Is Not Claimed

- not a production deployment
- not a real scam guarantee
- not real seller messaging
- not automatic marketplace scraping in default mode
- not live API usage unless manually configured and confirmed

## Copy-Paste Short Submission

DealPilot AI by Neural Negotiators is an autonomous deal intelligence agent for second-hand marketplace purchases. A user enters a goal like "Find me a used iPhone 14 under INR 45,000," and the prototype runs an agentic workflow that searches demo listings, analyzes deal quality, detects risk signals, ranks the best opportunities, and drafts ethical negotiation messages. Apify is implemented as the controlled marketplace intelligence layer, Zynd AI is represented through a local agent card plus a Zynd-ready service package, Superplane is represented through local event traces and a workflow canvas export, and GitHub Copilot is represented as the development accelerator. The MVP is mock-safe by default, works without API keys, and clearly shows that no external credits are consumed in demo mode.
