# DealPilot AI 3-Minute Demo Script

## 0:00 - Problem

"Second-hand marketplace buying is stressful. A buyer sees a cheap phone, console, or laptop, but they still need to know if the price is fair, whether the seller looks trustworthy, what questions to ask, and how to negotiate safely. Most buyers do this manually across messy listing descriptions."

"DealPilot AI solves this by acting as an autonomous deal intelligence and negotiation agent."

## 0:30 - User Enters Buying Goal

Show the DealPilot AI dashboard.

Say:

"I can enter a buying goal in natural language, such as: Find me a used iPhone 14 under INR 45,000 with good battery health."

Click the iPhone quick demo chip or type the goal and run the demo.

Point out:

- mock-safe mode is selected
- live Apify is off
- Gemini enhancement is off
- credit-safety panel shows no external calls

## 1:00 - Agent Researches Listings

Show the workflow timeline.

Say:

"The agent first parses the buying intent, then searches marketplace-style listings. For the MVP, this runs from local mock data so the demo is stable and no credits are consumed. The Apify adapter is implemented, but it is guarded behind live mode and manual confirmation."

Point out:

- parsed product
- budget
- data source: `mock_fallback`
- workflow events

## 1:30 - Agent Analyzes Deals and Risk

Scroll to ranked listings.

Say:

"Each listing is scored by specialist agents. The deal analyzer checks product match, price against budget, seller rating, condition, bill or warranty signals, and description quality. The scam detector checks advance-payment language, urgency pressure, vague descriptions, missing documents, damaged wording, and suspiciously low pricing."

Point out:

- deal score
- risk level
- risk score
- risk flags
- safety advice

## 2:00 - Agent Recommends Best Deal

Show the best recommendation card.

Say:

"The decision ranker does not just pick the cheapest listing. It combines deal quality with risk using a final score, so a high-risk listing cannot easily win just because it is cheap."

Point out:

- recommendation label
- fair price estimate
- negotiation target
- final ranking
- avoid listings if present

## 2:30 - Agent Generates Negotiation Message

Open or point to the negotiation panel.

Say:

"The negotiation agent drafts an ethical seller message. It does not fake claims, does not manipulate the seller, and does not contact anyone directly. It gives the buyer a reasoned opening offer, follow-up message, seller questions, and walkaway conditions."

Point out:

- opening message
- questions to ask seller
- walkaway conditions
- target price

## 2:50 - Sponsor Integration Summary

Show sponsor badges and credit-safety panel.

Say:

"Apify is the marketplace intelligence layer and is ready for a controlled live run with max-item caps and caching. Zynd AI is represented through a local discoverable agent card. Superplane is represented through local event-driven workflow traces that map to production orchestration. GitHub Copilot helped accelerate development."

"The important safety point is that the default demo consumes no credits. Apify, Gemini, Zynd, and Superplane all report false for live calls unless a human explicitly enables and confirms a live path."

End with:

"DealPilot AI helps buyers make second-hand purchases smarter, safer, and more negotiable."
