# Final Pitch

## 30-Second Pitch

DealPilot AI is an autonomous deal intelligence agent for second-hand marketplace purchases. Buyers enter a goal like "Find me a used iPhone 14 under INR 45,000," and DealPilot researches listings, detects risk signals, ranks the best deals, and drafts ethical negotiation messages. The prototype runs in mock-safe demo mode by default, with Apify ready as a controlled marketplace intelligence layer, Zynd AI for agent identity, and Superplane-style workflow tracing for production readiness.

## 60-Second Pitch

Second-hand marketplaces are full of noisy listings, fake urgency, vague descriptions, overpriced offers, and risky payment signals. Buyers often do not know what a fair price is, what questions to ask, or how to negotiate confidently.

DealPilot AI solves this as a buyer-side autonomous agent. The user enters a buying goal, and the system runs an agentic workflow: intent understanding, marketplace search, deal analysis, scam risk signal detection, decision ranking, and negotiation strategy.

The prototype ranks listings by both deal quality and risk, so the cheapest option does not automatically win. It shows fair price estimates, negotiation targets, safety advice, seller questions, and ethical message drafts.

Sponsor integration is built into the architecture: Apify for controlled marketplace intelligence, Zynd AI for agent identity and discoverability, Superplane-style local workflow events, and GitHub Copilot as the development accelerator. The demo is mock-safe by default and consumes no external credits.

## 3-Minute Pitch

Online second-hand buying is risky and inefficient. A buyer might see a used iPhone, PS5, or MacBook listed at an attractive price, but they still need to answer several questions: Is the price fair? Is the seller trustworthy? Are there risk signals? What should I ask before paying? What is a reasonable negotiation offer?

DealPilot AI turns that problem into an autonomous buyer-side workflow.

The user enters a natural-language goal, such as "Find me a used iPhone 14 under INR 45,000." DealPilot first parses the intent, including product, model, budget, currency, and preferences. Then it searches marketplace-style listings. In this hackathon prototype, the default search uses local mock data so the demo is stable and safe. Apify is implemented as the controlled live marketplace intelligence layer for future crawling and extraction, with live mode disabled unless explicitly configured and confirmed.

After search, DealPilot normalizes listing data and runs specialist agent steps. The deal analysis agent scores product match, budget fit, seller rating, condition, document signals, description quality, and price position. The scam risk detection agent flags risk signals such as fake urgency, advance-payment language, missing bill or warranty information, vague descriptions, and unusually low pricing.

The decision ranking step combines deal score and risk score, so a high-risk listing does not automatically rank first just because it is cheap. The top recommendation includes a fair price estimate, negotiation target, safety advice, seller questions, and walkaway conditions.

Finally, the negotiation strategy agent drafts an ethical seller message. It does not contact sellers, does not make fake claims, and does not manipulate. It gives the buyer a practical draft they can review and edit.

For sponsor integrations, Apify is the marketplace intelligence layer, Zynd AI is represented through a local agent card for identity and discoverability, Superplane is represented through local event-driven workflow traces, and GitHub Copilot accelerated the frontend, backend, agents, documentation, debugging, and tests.

DealPilot AI is not claiming production deployment or guaranteed scam detection. It is a focused hackathon prototype showing how an agentic workflow can help buyers make smarter, safer, and more negotiable second-hand purchases.

## Judge Q&A

### What makes this agentic?

DealPilot takes a buyer goal, decomposes it into multiple steps, runs specialist agents, passes structured outputs between stages, and returns a final recommendation with reasoning. The workflow is intent understanding -> marketplace search -> deal analysis -> scam risk detection -> decision ranking -> negotiation strategy.

### Does it call live marketplace APIs during the demo?

No. The default demo runs in mock-safe mode. Apify integration exists as a guarded adapter, but live mode requires environment configuration and explicit UI/request confirmation.

### How is Apify used?

Apify is the intended marketplace intelligence layer for crawling and extracting listing data. The prototype includes a credit-safe adapter with max item caps, cache behavior, and mock fallback.

### How is Zynd AI used?

DealPilot exposes a local agent card with name, description, capabilities, endpoints, and credit-safety metadata. This represents the agent identity and discoverability layer. Future deployment can register the service through Zynd.

### How is Superplane used?

The prototype records local event-driven workflow traces that map to a future Superplane orchestration. It does not run Superplane services during the demo.

### Is the scam detection guaranteed?

No. The prototype detects risk signals, not guaranteed fraud. It helps buyers identify warning signs and make safer decisions.

### Does DealPilot contact sellers?

No. It only generates negotiation drafts for the user to review. There is no real seller messaging in the MVP.

### Why use deterministic logic instead of only an LLM?

Deterministic logic keeps the prototype stable, explainable, reproducible, and credit-safe. Optional LLM enhancement can polish messages later, but the core workflow works without API keys.

### What is the business potential?

The same buyer-side workflow can expand to electronics, vehicles, furniture, rentals, B2B procurement, and local commerce. Any marketplace category with price uncertainty and seller risk can benefit.

### What would you build next?

Next steps are one controlled Apify live data run, persistent saved searches, stronger product valuation, audit logs, Zynd registration, Superplane workflow deployment, and carefully budgeted LLM enhancements.
