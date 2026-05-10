from app.agents.deal_analyzer import analyze_deal, polish_deal_reasoning
from app.agents.decision_ranker import rank_listings
from app.agents.intent_parser import parse_intent
from app.agents.market_benchmark import calculate_market_benchmark
from app.agents.negotiation_agent import generate_negotiation_draft, polish_opening_message
from app.agents.product_safety_checklist import build_product_safety_checklist
from app.agents.scam_detector import detect_scam_risk
from app.agents.source_intelligence import (
    build_platform_signals,
    build_source_breakdown,
    detect_duplicate_signals,
    source_intelligence_summary,
)
from app.agents.why_not_cheapest import explain_why_not_cheapest
from app.config import get_settings
from app.models.api import AgentTraceStep, CreditSafety, FullRunResponse, RankedDeal, SearchResponse
from app.models.analysis import ParsedIntent, RealDataEvidence
from app.models.listing import Listing
from app.services.apify_service import ApifyService
from app.services.llm_service import LLMService
from app.services.mock_data_service import MockDataService
from app.services.storage_service import StorageService
from app.services.workflow_events import emit_event, get_events


class DealPilotOrchestrator:
    def __init__(self, mock_data_service: MockDataService | None = None) -> None:
        self.mock_data_service = mock_data_service or MockDataService()
        self.apify_service = ApifyService(self.mock_data_service)
        self.llm_service = LLMService()
        self.storage_service = StorageService()
        self.settings = get_settings()

    def search(
        self,
        user_goal: str,
        use_live_apify: bool = False,
        confirm_live_run: bool = False,
        apify_source: str | None = None,
        max_items: int = 10,
    ) -> SearchResponse:
        parsed_intent = parse_intent(user_goal)
        product, budget, _ = self.mock_data_service.search(user_goal)
        apify_result = self._collect_listings(user_goal, use_live_apify, confirm_live_run, max_items, apify_source)
        return SearchResponse(
            user_goal=user_goal,
            parsed_intent=parsed_intent,
            data_source=apify_result["data_source"],
            listings=apify_result["listings"],
            detected_budget=parsed_intent.max_budget or budget,
            detected_product=product,
            credit_safety=self._credit_safety(apify_result, llm_called=False, live_llm_confirmed=False),
        )

    def full_run(
        self,
        user_goal: str,
        use_live_apify: bool = False,
        confirm_live_run: bool = False,
        apify_source: str | None = None,
        max_items: int = 10,
        use_live_llm: bool = False,
        confirm_live_llm: bool = False,
        save_report: bool = True,
    ) -> FullRunResponse:
        trace: list[AgentTraceStep] = []
        emit_event(
            "USER_REQUEST_RECEIVED",
            "completed",
            "User submitted a DealPilot full-run request.",
            {"use_live_apify": use_live_apify, "confirm_live_run": confirm_live_run, "max_items": max_items, "apify_source": apify_source},
        )

        parsed_intent = parse_intent(user_goal)
        emit_event(
            "INTENT_PARSED",
            "completed",
            f"Parsed target model {parsed_intent.target_model} with budget {parsed_intent.max_budget}.",
            {"product_type": parsed_intent.product_type, "currency": parsed_intent.currency},
        )
        trace.append(
            self._trace(
                "Intent Understanding",
                f"Parsed {parsed_intent.target_model}, budget={parsed_intent.max_budget}, currency={parsed_intent.currency}.",
            )
        )

        emit_event(
            "MARKETPLACE_SEARCH_STARTED",
            "started",
            "Marketplace collection step started.",
            {"live_requested": use_live_apify},
        )
        apify_result = self._collect_listings(user_goal, use_live_apify, confirm_live_run, max_items, apify_source)
        listings: list[Listing] = apify_result["listings"]
        emit_event(
            "MARKETPLACE_SEARCH_COMPLETED",
            "completed",
            f"Retrieved {len(listings)} listing(s) from {apify_result['data_source']}.",
            {"data_source": apify_result["data_source"], "apify_called": apify_result["apify_called"]},
        )
        trace.append(
            self._trace(
                "Marketplace Search",
                f"{apify_result['message']} Retrieved {len(listings)} listing(s) from {apify_result['data_source']}.",
            )
        )

        trace.append(
            self._trace(
                "Listing Normalization",
                "Mapped marketplace fields into the stable DealPilot listing schema.",
            )
        )

        analyzed = []
        emit_event(
            "DEAL_ANALYSIS_STARTED",
            "started",
            "Deal analysis and risk detection started.",
            {"listing_count": len(listings)},
        )
        for listing in listings:
            deal = analyze_deal(parsed_intent, listing)
            risk = detect_scam_risk(parsed_intent, listing, deal)
            analyzed.append((listing, deal, risk))
        emit_event(
            "DEAL_ANALYSIS_COMPLETED",
            "completed",
            f"Completed deterministic deal analysis for {len(analyzed)} listing(s).",
            {"listing_count": len(analyzed)},
        )
        emit_event(
            "SCAM_RISK_DETECTION_COMPLETED",
            "completed",
            "Completed deterministic scam risk checks.",
            {
                "high_risk_count": sum(1 for _, _, risk in analyzed if risk.risk_level == "high"),
                "medium_risk_count": sum(1 for _, _, risk in analyzed if risk.risk_level == "medium"),
            },
        )

        trace.append(
            self._trace(
                "Deal Analysis",
                f"Scored {len(analyzed)} listing(s) for product fit, price, seller quality, condition, and description quality.",
            )
        )
        trace.append(
            self._trace(
                "Scam Risk Detection",
                "Checked urgency, advance-payment language, missing documents, low price, condition, and seller trust signals.",
            )
        )

        ranked_tuples, best_id, avoid_ids, ranking_summary = rank_listings(analyzed)
        emit_event(
            "DECISION_RANKING_COMPLETED",
            "completed",
            ranking_summary,
            {"best_deal_id": best_id, "avoid_listing_ids": avoid_ids},
        )
        trace.append(self._trace("Decision Ranking", ranking_summary))

        ranked_results: list[RankedDeal] = []
        for listing, deal, risk, ranking in ranked_tuples:
            negotiation = generate_negotiation_draft(
                parsed_intent=parsed_intent,
                listing=listing,
                deal_analysis=deal,
                risk_analysis=risk,
                recommendation_label=ranking.recommendation_label,
            )
            ranked_results.append(
                RankedDeal(
                    listing=listing,
                    deal_analysis=deal,
                    risk_analysis=risk,
                    ranking=ranking,
                    negotiation=negotiation,
                )
            )
        emit_event(
            "NEGOTIATION_GENERATED",
            "completed",
            f"Generated negotiation strategies for {len(ranked_results)} ranked listing(s).",
            {"draft_count": len(ranked_results)},
        )

        llm_called = False
        if ranked_results:
            polished_reasoning, reasoning_llm_called = polish_deal_reasoning(
                parsed_intent=parsed_intent,
                listing=ranked_results[0].listing,
                deal_analysis=ranked_results[0].deal_analysis,
                llm_service=self.llm_service,
                use_live_llm=use_live_llm,
                confirm_live_llm=confirm_live_llm,
            )
            ranked_results[0].deal_analysis.reasoning = polished_reasoning
            polished_message, message_llm_called = polish_opening_message(
                parsed_intent=parsed_intent,
                listing=ranked_results[0].listing,
                draft=ranked_results[0].negotiation,
                llm_service=self.llm_service,
                use_live_llm=use_live_llm,
                confirm_live_llm=confirm_live_llm,
            )
            ranked_results[0].negotiation.opening_message = polished_message
            llm_called = reasoning_llm_called or message_llm_called

        trace.append(
            self._trace(
                "Negotiation Strategy",
                (
                    "Generated ethical offer drafts with optional Gemini polishing."
                    if llm_called
                    else "Generated ethical offer drafts, verification questions, and walkaway conditions using deterministic fallback."
                ),
            )
        )
        trace.append(
            self._trace(
                "Final Recommendation",
                f"Best deal: {best_id or 'none'}. Avoid list: {', '.join(avoid_ids) if avoid_ids else 'none'}.",
            )
        )

        best_recommendation = ranked_results[0] if ranked_results else None
        market_benchmark = calculate_market_benchmark(
            listings,
            best_listing_id=best_recommendation.listing.id if best_recommendation else None,
        )
        product_safety_checklist = build_product_safety_checklist(parsed_intent)
        why_not_cheapest = explain_why_not_cheapest(ranked_results)
        source_breakdown = build_source_breakdown(ranked_results)
        duplicate_signals = detect_duplicate_signals(ranked_results)
        platform_signals = build_platform_signals(ranked_results)
        source_summary = source_intelligence_summary(source_breakdown, duplicate_signals)
        scan_mode = "deep_scan" if max_items > 10 or apify_result["max_items_used"] > 10 else "standard"
        trace.append(self._trace("Market Benchmark", market_benchmark.summary))
        trace.append(self._trace("Source Intelligence", source_summary))
        trace.append(self._trace("Buyer Safety Checklist", product_safety_checklist.summary))
        emit_event(
            "DEMO_RUN_COMPLETED",
            "completed",
            "DealPilot full-run completed in local workflow event simulation mode.",
            {
                "listings_analyzed": len(ranked_results),
                "best_deal_id": best_id,
                "superplane_called": False,
            },
        )

        credit_safety = self._credit_safety(
            apify_result,
            llm_called=llm_called,
            live_llm_confirmed=confirm_live_llm if use_live_llm else False,
        )
        real_data_evidence = RealDataEvidence(
            data_source=apify_result["data_source"],
            apify_called=credit_safety.apify_called,
            apify_cache_used=credit_safety.apify_cache_used,
            listings_analyzed=len(ranked_results),
            live_run_confirmed=credit_safety.live_run_confirmed,
            evidence_label=self._evidence_label(apify_result["data_source"], credit_safety.apify_called, credit_safety.apify_cache_used),
        )

        response = FullRunResponse(
            user_goal=user_goal,
            parsed_intent=parsed_intent,
            data_source=apify_result["data_source"],
            listings_analyzed=len(ranked_results),
            ranked_results=ranked_results,
            best_recommendation=best_recommendation,
            avoid_listings=avoid_ids,
            market_benchmark=market_benchmark,
            product_safety_checklist=product_safety_checklist,
            why_not_cheapest=why_not_cheapest,
            real_data_evidence=real_data_evidence,
            scan_mode=scan_mode,
            source_breakdown=source_breakdown,
            duplicate_signals=duplicate_signals,
            platform_signals=platform_signals,
            agent_trace=trace,
            workflow_events=get_events(),
            credit_safety=credit_safety,
            mode_flags={
                "APIFY_LIVE_MODE": self.settings.apify_live_mode,
                "GEMINI_LIVE_MODE": self.settings.gemini_live_mode,
                "GEMINI_MODEL": self.settings.gemini_model,
                "ZYND_ENABLED": self.settings.zynd_enabled,
                "SUPERPLANE_ENABLED": self.settings.superplane_enabled,
            },
        )
        if save_report:
            saved = self.storage_service.save_report(response)
            response.report_id = saved["report_id"]
            response.saved_at = saved["created_at"]
        return response

    def analyze_listing(self, user_goal: str, listing: Listing) -> RankedDeal:
        parsed_intent = parse_intent(user_goal)
        deal = analyze_deal(parsed_intent, listing)
        risk = detect_scam_risk(parsed_intent, listing, deal)
        ranked, _, _, _ = rank_listings([(listing, deal, risk)])
        _, _, _, ranking = ranked[0]
        negotiation = generate_negotiation_draft(
            parsed_intent=parsed_intent,
            listing=listing,
            deal_analysis=deal,
            risk_analysis=risk,
            recommendation_label=ranking.recommendation_label,
        )
        return RankedDeal(
            listing=listing,
            deal_analysis=deal,
            risk_analysis=risk,
            ranking=ranking,
            negotiation=negotiation,
        )

    def _collect_listings(
        self,
        user_goal: str,
        use_live_apify: bool,
        confirm_live_run: bool,
        max_items: int,
        apify_source: str | None = None,
    ) -> dict:
        return self.apify_service.search_marketplace_listings(
            query=user_goal,
            max_items=max_items,
            confirm_live_run=confirm_live_run if use_live_apify else False,
            source=apify_source,
        )

    def _credit_safety(self, apify_result: dict, llm_called: bool, live_llm_confirmed: bool) -> CreditSafety:
        return CreditSafety(
            apify_live_mode=self.settings.apify_live_mode,
            apify_called=apify_result["apify_called"],
            apify_cache_used=apify_result["apify_cache_used"],
            llm_live_mode=self.settings.gemini_live_mode,
            llm_called=llm_called,
            live_llm_confirmed=live_llm_confirmed,
            zynd_called=False,
            superplane_called=False,
            max_items_requested=apify_result["max_items_requested"],
            max_items_used=apify_result["max_items_used"],
            live_run_confirmed=apify_result["live_run_confirmed"],
        )

    def _trace(self, step: str, details: str) -> AgentTraceStep:
        return AgentTraceStep(step=step, status="completed", details=details, summary=details)

    def _evidence_label(self, data_source: str, apify_called: bool, apify_cache_used: bool) -> str:
        if data_source == "apify_live" and apify_called:
            return "Live marketplace data collected through Apify."
        if data_source == "apify_cache" or apify_cache_used:
            return "Cached Apify marketplace data reused for this run."
        return "Marketplace analysis completed with the available listing source."
