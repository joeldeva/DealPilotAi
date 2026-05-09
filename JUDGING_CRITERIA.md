# Judging Criteria Mapping

## Quality of Idea

DealPilot AI addresses a common, practical problem: second-hand buyers struggle to identify fair, safe, negotiable listings. The idea is easy to understand in a live demo and has clear value for phones, consoles, laptops, cameras, and other high-ticket used products.

Strengths:

- clear buyer pain point
- useful autonomous-agent framing
- risk-aware ranking instead of simple price sorting
- ethical negotiation drafts instead of manipulative seller contact
- strong sponsor fit with Apify, Zynd AI, Superplane, and GitHub Copilot

## Technical Implementation

Implemented MVP:

- full-stack Next.js and FastAPI application
- typed frontend and Pydantic backend models
- mock-first service architecture
- deterministic multi-agent pipeline
- local JSON listing data
- credit-safe Apify adapter
- optional Gemini adapter disabled by default
- local Zynd agent card
- Zynd-ready service deployment package
- local Superplane-style workflow events
- local Superplane-style canvas export
- polished dashboard UI
- Vercel Services deployment configuration

Technical highlights:

- agent pipeline produces structured intermediate outputs
- ranking combines deal score and scam risk
- external calls are gated and disabled by default
- full-run response exposes credit-safety proof
- hosted proof panel exposes integration status on the live UI
- local safety script verifies Apify blocked paths

## Sustainability / Potential

The project has a realistic path beyond the MVP:

- expand marketplace sources through controlled Apify actors
- add historical pricing and product-specific valuation
- persist saved searches and user preferences
- build inspection checklists for phones, consoles, laptops, and cameras
- register the agent through Zynd AI for discovery
- map local events into Superplane orchestration
- add budget-limited LLM enhancements for richer explanations

The mock-first design is also sustainable for development because it avoids wasting sponsor credits during iteration.

## Design

The frontend is designed as a premium AI commerce-agent dashboard:

- dark hero area
- clear search input and quick demo chips
- data-mode controls
- sponsor badges
- workflow timeline
- best recommendation area
- ranked listing cards
- risk and deal badges
- negotiation panel
- credit-safety panel
- responsive layout

The UI is judge-friendly because it tells the story quickly: goal -> agent workflow -> ranked result -> risk reasoning -> negotiation strategy -> sponsor integration proof.
