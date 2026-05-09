# DealPilot AI Agents

## Agent Design

DealPilot AI uses a LangGraph-style workflow with small deterministic agents. In the MVP, these are local functions coordinated by a graph runner. They can later be replaced or enhanced with real LangGraph nodes without changing the API contract.

No agent is allowed to call external APIs unless live mode is explicitly enabled and confirmed.

## Shared State

All agents operate on `DealPilotState`:

```json
{
  "search_id": "search_mock_001",
  "mode": "mock",
  "goal_text": "Find me a used iPhone 14 under INR 45000",
  "parsed_goal": {},
  "raw_listings": [],
  "normalized_listings": [],
  "analyses": [],
  "drafts": [],
  "errors": [],
  "trace": [],
  "cache": {
    "cache_key": "iphone-14|bengaluru|45000|mock",
    "hit": false
  }
}
```

Each node appends a trace entry:

```json
{
  "node": "score_deals",
  "status": "completed",
  "started_at": "ISO-8601",
  "completed_at": "ISO-8601",
  "summary": "Scored 8 listings using local heuristic weights."
}
```

## Workflow Graph

```text
START
  -> GoalParserAgent
  -> ListingCollectorAgent
  -> ListingNormalizerAgent
  -> RiskDetectorAgent
  -> PriceEstimatorAgent
  -> DealScorerAgent
  -> NegotiationDraftAgent
  -> ResponseComposerAgent
END
```

Future branching:

```text
ListingCollectorAgent
  -> cache_hit ? normalize_listings : collect_from_mock_or_confirmed_live_apify
RiskDetectorAgent
  -> severe_risk ? mark_not_recommended : continue_to_pricing
```

## Agent Responsibilities

### GoalParserAgent

Purpose:

- Extract product, budget, currency, location, and preferences from the user's goal.

MVP method:

- Rule-based parsing with simple keyword matching and budget extraction.

Inputs:

- `goal_text`
- optional `budget`, `currency`, `location`

Outputs:

- `parsed_goal`

External calls:

- None.

### ListingCollectorAgent

Purpose:

- Retrieve candidate listings.

MVP method:

- Load local mock fixtures based on product/category.

Future Apify method:

- Use Apify actor only from a confirmed live-run endpoint.
- Read results from the actor's dataset with strict item limits.

Inputs:

- `parsed_goal`
- `mode`
- safety limits

Outputs:

- `raw_listings`
- cache metadata

External calls:

- None in mock mode.
- Apify only in confirmed live mode.

### ListingNormalizerAgent

Purpose:

- Convert source-specific listing payloads into a stable internal schema.

MVP method:

- Local mapping from mock fixture fields.
- Defensive defaults for missing title, price, location, seller rating, and condition.

Outputs:

- `normalized_listings`

External calls:

- None.

### RiskDetectorAgent

Purpose:

- Detect suspicious, incomplete, or risky listings.

MVP risk signals:

- Price far below estimated market range.
- Missing image.
- Missing or vague description.
- New seller account.
- Low seller rating.
- Urgent language.
- External payment request.
- IMEI/serial/bill unavailable for electronics.
- Duplicate listing title and image.

Outputs:

- `risk_score`
- `risk_flags`

External calls:

- None.

### PriceEstimatorAgent

Purpose:

- Estimate fair market price, suggested opening offer, and walkaway price.

MVP method:

- Use local market baseline by product.
- Adjust for condition, age, accessories, warranty/bill, location, and risk.

Example:

```text
fair_price = baseline * condition_multiplier - risk_penalty + accessory_bonus
opening_offer = fair_price * 0.90
walkaway_price = min(user_budget, fair_price * 1.08)
```

External calls:

- None.

### DealScorerAgent

Purpose:

- Rank listings for the user.

MVP score weights:

- 35% price attractiveness.
- 25% condition and completeness.
- 20% seller trust.
- 15% risk penalty.
- 5% location convenience.

Output:

- `deal_score` from 0 to 100.
- human-readable explanation.

External calls:

- None.

### NegotiationDraftAgent

Purpose:

- Generate seller-specific message drafts.

MVP method:

- Local templates selected by listing profile and desired tone.
- No LLM calls.

Draft rules:

- Be polite.
- Do not misrepresent facts.
- Mention specific listing signals.
- Anchor below fair price.
- Include a clear but non-binding offer.
- Never send the message automatically.

External calls:

- None.

### ResponseComposerAgent

Purpose:

- Produce the final API response for the frontend.

Outputs:

- ranked listings
- summary
- best deal
- risk warnings
- negotiation drafts
- agent trace
- integration mode status

External calls:

- None.

## Zynd AI Agent Identity Plan

DealPilot AI will expose a Zynd-style entity card:

```json
{
  "name": "dealpilot-ai",
  "description": "Autonomous deal intelligence and negotiation-draft agent for second-hand marketplace purchases.",
  "category": "commerce",
  "tags": ["marketplace", "negotiation", "deal-intelligence", "apify"],
  "capabilities": [
    {"name": "deal_search", "category": "agent"},
    {"name": "listing_risk_analysis", "category": "analysis"},
    {"name": "negotiation_draft", "category": "commerce"}
  ],
  "endpoints": {
    "health": "/api/health",
    "agent_card": "/.well-known/agent.json",
    "invoke": "/api/searches"
  },
  "status": "mock"
}
```

`ZYND_ENABLED=false` by default. When enabled in a later milestone, registration and heartbeat must be manually started and must not run during normal local development.

## Superplane Workflow Plan

The workflow maps cleanly to a Superplane-style canvas:

```text
Trigger: search.created
  -> Component: parse_goal
  -> Component: collect_listings
  -> Component: normalize_listings
  -> Component: detect_risks
  -> Component: estimate_price
  -> Component: score_deals
  -> Component: generate_drafts
  -> Component: publish_result
```

MVP implementation:

- Record local events named `search.created`, `node.completed`, `node.failed`, and `search.completed`.
- Export a static canvas definition for the demo.
- Do not run Superplane services.

