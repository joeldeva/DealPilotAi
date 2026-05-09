# DealPilot AI MVP Plan

## MVP Definition

The MVP is a mock-first deal analysis web app. It demonstrates the complete agent workflow without spending credits:

- Input: buying goal, budget, location, preferences.
- Output: ranked listings, deal scores, risk flags, fair price estimates, suggested offers, and negotiation drafts.
- Integrations: Apify, Zynd AI, and Superplane represented through clean adapters and demo-safe planning, with live paths disabled by default.

## What To Build First

1. Backend API skeleton with mock data only.
2. Deterministic agent workflow and trace output.
3. Deal scoring, risk detection, price estimation, and negotiation template services.
4. Frontend single-page demo UI.
5. Local mock fixtures for two or three product goals.
6. Integration status panel showing mock/live flags and safety limits.
7. Documentation and `.env.example` after app code is stable.

## Demo Scenarios

Use deterministic fixtures for:

- "Find me a used iPhone 14 under INR 45,000."
- "Find me a used PS5 under INR 35,000."
- "Find me a used MacBook Air M1 under INR 55,000."

Each scenario should include:

- 6 to 10 mock listings.
- At least one very good deal.
- At least one overpriced listing.
- At least one suspicious listing.
- At least one listing with missing information.

## 48-Hour Execution Roadmap

### Hours 0-4: Foundation

- Create backend and frontend folders.
- Define Pydantic models and TypeScript response types.
- Add mock fixtures.
- Add mode configuration with safe defaults.
- Implement `GET /api/health` and `GET /api/demo/scenarios`.

### Hours 4-10: Agent Workflow

- Implement the LangGraph-style state object.
- Implement workflow nodes:
  - parse goal
  - collect mock listings
  - normalize listings
  - risk detection
  - fair price estimation
  - deal scoring
  - negotiation draft generation
  - response composition
- Add trace entries for every node.

### Hours 10-18: API Surface

- Implement `POST /api/searches`.
- Implement `GET /api/searches/{search_id}`.
- Implement `GET /api/listings/{listing_id}`.
- Implement `POST /api/listings/{listing_id}/negotiation-draft`.
- Implement Apify live-run preview endpoint that performs no external call.

### Hours 18-28: Frontend Demo

- Build a clean single-screen search experience.
- Add result cards with score, price, risk, and draft message.
- Add sortable ranked results.
- Add a trace/timeline panel for agent steps.
- Add integration status panel: Apify, Zynd AI, Superplane.

### Hours 28-36: Sponsor Integration Story

- Add local Zynd-style entity card endpoint.
- Add Superplane-style local event log/export shape.
- Add Apify adapter interface and mock implementation.
- Add visible live-mode guardrails in UI.

### Hours 36-42: Stability

- Add focused tests for scoring, risk flags, and mode safety.
- Add malformed input handling.
- Add empty result fallback.
- Add deterministic demo reset.

### Hours 42-48: Demo Polish

- Improve UI copy and visual hierarchy.
- Add README and `.env.example`.
- Prepare judge script.
- Verify no startup path calls external APIs.
- Verify all live flags are false by default.

## What NOT To Build In The MVP

- No real seller messaging.
- No marketplace account login.
- No private/restricted platform scraping.
- No background scheduled crawlers.
- No automatic Apify actor runs.
- No LLM API calls.
- No real Zynd registry registration by default.
- No Superplane service execution.
- No database unless in-memory storage becomes a blocker.
- No browser extension.
- No multi-user auth.
- No payment, checkout, escrow, or transaction flow.
- No complex ML pricing model.

## Mock-First Development Approach

All external integration interfaces must start with mock implementations:

- Apify mock returns local listing fixtures.
- LLM mock is replaced by deterministic templates and rules.
- Zynd mock returns local entity metadata.
- Superplane mock records local workflow events.

The UI and backend should not need credentials to run. API keys only unlock optional live demo paths after explicit configuration and confirmation.

## Demo Fallback Plan

If anything fails during the demo:

- Use `mode=mock`.
- Use local demo scenarios.
- Display cached or fixture listings.
- Show deterministic fallback scores.
- Show template-based negotiation drafts.
- Show integration status as "configured for optional live mode, currently disabled."

If live Apify fails after manual confirmation:

- Return the last cached result for the same cache key if present.
- Otherwise return local mock fixtures with a warning: "Live Apify unavailable; showing mock fallback."
- Never retry indefinitely.
- Never increase item limits automatically.

## Implementation Priorities

1. Safety and no-credit operation.
2. End-to-end demo flow.
3. Clear agent trace.
4. Useful deal ranking.
5. Sponsor integration credibility.
6. UI polish.

