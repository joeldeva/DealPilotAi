# DealPilot AI Project Brief

## Product Summary

DealPilot AI is an autonomous deal intelligence and negotiation-draft agent for second-hand marketplace purchases. A user enters a buying goal such as "Find me a used iPhone 14 under INR 45,000." The MVP returns normalized listings, flags suspicious or overpriced offers, scores deal quality, estimates a fair negotiation price, and generates seller-specific negotiation message drafts.

The MVP is mock-first. It must work end-to-end without API keys, external services, scraping, LLM calls, or paid/free model credits.

## Hackathon Goals

1. Deliver a stable judge-friendly demo.
2. Use Apify as the primary sponsor integration in the architecture and optional live-demo path.
3. Use Zynd AI as the agent identity and discovery layer in mock/local form first.
4. Use Superplane concepts as the workflow orchestration and production-readiness story.
5. Use LangGraph-style stateful agent orchestration.
6. Keep the product narrow, legible, and reliable.
7. Avoid all unnecessary API calls and credit usage.

## Exact MVP Scope

The MVP includes:

- A clean web UI where the user enters a buying goal, budget, location, and optional condition preferences.
- A mock listing collector that returns realistic marketplace-like listings from local fixtures.
- A normalized listing model with price, title, image URL or placeholder, seller signals, condition, location, source, and timestamps.
- Deal scoring based on deterministic rules.
- Suspicion detection using deterministic flags, not an LLM.
- Fair price and negotiation target estimation using deterministic heuristics.
- Negotiation draft generation using local templates.
- A LangGraph-style backend workflow represented as explicit nodes and state transitions.
- API contracts for search, analysis, listing details, and negotiation drafts.
- Optional Apify live mode design, disabled by default.
- Optional Zynd AI registration design, disabled by default.
- Optional Superplane event/export design, disabled by default.

The MVP does not include real seller messaging, account login, payment flows, production scraping, background schedules, browser automation, or automatic external API calls.

## Primary Demo Flow

1. User enters: "Find me a used iPhone 14 under INR 45,000."
2. UI calls the backend in mock mode.
3. Backend creates a search run and executes the agent workflow:
   - parse buying goal
   - collect mock listings
   - normalize listings
   - detect suspicious listings
   - estimate fair price
   - score deals
   - generate negotiation drafts
   - compose result summary
4. UI shows ranked listings with:
   - deal score
   - estimated fair price
   - suggested first offer
   - risk badges
   - negotiation draft
   - trace of agent steps for judge visibility
5. Optional demo switch shows "Live Apify available but disabled" unless a human explicitly enables and confirms live mode.

## Target Users

- Marketplace buyers who want help deciding whether a listing is worth pursuing.
- Hackathon judges evaluating agent workflow, sponsor integration, product clarity, and responsible credit usage.

## Success Criteria

- The app works fully offline with deterministic mock data.
- The demo can be repeated without consuming credits.
- Sponsor integrations are credible and clearly represented.
- The UI communicates why each deal is good, risky, or overpriced.
- Live mode cannot run accidentally.

## Non-Goals

- Do not contact sellers.
- Do not scrape restricted/private platforms directly.
- Do not build a general shopping crawler.
- Do not build a full production workflow engine.
- Do not build a real Zynd registry client path until mock mode is stable.
- Do not call Gemini, OpenAI, Claude, or any other LLM provider in the MVP.
- Do not run Apify actors during development unless a human explicitly authorizes a controlled live demo later.

