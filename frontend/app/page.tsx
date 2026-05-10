"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Github,
  History,
  Linkedin,
  Loader2,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { SearchForm } from "../components/SearchForm";
import { runFullDemo } from "../lib/api";
import type { FullRunResponse, RankedDeal } from "../lib/types";

const demoGoals = [
  "Find me a used iPhone 14 under INR 45000",
  "Find me a used PS5 under INR 35000",
  "Find me a used MacBook under INR 60000",
];

const historyStorageKey = "dealpilot.previousSearches.v2";

type SearchHistoryItem = {
  id: string;
  goal: string;
  createdAt: string;
  dataSource: FullRunResponse["data_source"];
  listingTitle: string;
  listingUrl: string;
  price: number | null;
  dealScore: number | null;
  riskLevel: string | null;
  negotiationTarget: number | null;
  reportId: string | null;
};

const workflowSteps = [
  { label: "Search", detail: "Collect marketplace listings", icon: Search },
  { label: "Analyze", detail: "Score price and condition", icon: BarChart3 },
  { label: "Risk check", detail: "Detect scam signals", icon: ShieldCheck },
  { label: "Rank", detail: "Choose the strongest deal", icon: Trophy },
  { label: "Negotiate", detail: "Draft an ethical offer", icon: MessageSquareText },
];

export default function Home() {
  const [goal, setGoal] = useState(demoGoals[0]);
  const [result, setResult] = useState<FullRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(historyStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as SearchHistoryItem[];
        setSearchHistory(Array.isArray(parsed) ? parsed.slice(0, 8) : []);
      }
    } catch {
      setSearchHistory([]);
    }
  }, []);

  const topDeal = useMemo(() => result?.best_recommendation ?? result?.ranked_results?.[0] ?? null, [result]);
  const rankedResults = result?.ranked_results ?? [];

  async function handleRun(nextGoal = goal) {
    const trimmedGoal = nextGoal.trim();
    if (!trimmedGoal) return;

    setGoal(trimmedGoal);
    setLoading(true);
    setError(null);

    try {
      const response = await runFullDemo({
        user_goal: trimmedGoal,
        use_live_apify: true,
        confirm_live_run: true,
        apify_source: "multi",
        max_items: 20,
        use_live_llm: true,
        confirm_live_llm: true,
        save_report: true,
      });
      setResult(response);
      saveSearchHistory(trimmedGoal, response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent run failed. Check the backend URL and try again.");
    } finally {
      setLoading(false);
    }
  }

  function saveSearchHistory(searchGoal: string, response: FullRunResponse) {
    const best = response.best_recommendation ?? response.ranked_results[0] ?? null;
    const item: SearchHistoryItem = {
      id: response.report_id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      goal: searchGoal,
      createdAt: response.saved_at ?? new Date().toISOString(),
      dataSource: response.data_source,
      listingTitle: best?.listing.title ?? "No listing returned",
      listingUrl: best?.listing.listing_url ?? "",
      price: best?.listing.price ?? null,
      dealScore: best?.deal_analysis.deal_score ?? null,
      riskLevel: best?.risk_analysis.risk_level ?? null,
      negotiationTarget: best?.negotiation.target_price ?? null,
      reportId: response.report_id,
    };

    setSearchHistory((current) => {
      const next = [item, ...current.filter((entry) => entry.goal !== searchGoal)].slice(0, 8);
      try {
        window.localStorage.setItem(historyStorageKey, JSON.stringify(next));
      } catch {
        // Search history is a UI convenience.
      }
      return next;
    });
  }

  function clearHistory() {
    setSearchHistory([]);
    try {
      window.localStorage.removeItem(historyStorageKey);
    } catch {
      // Ignore unavailable browser storage.
    }
  }

  return (
    <main className="min-h-screen text-slate-200">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="glass-panel-3d p-5 md:p-8">
          <nav className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-xl font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.45)]">
                D
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">DealPilot</p>
                <p className="mt-1 text-sm text-slate-400">Buyer-side commerce agent</p>
              </div>
            </div>
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-bold tracking-wider text-purple-200">
              Autonomous Agent
            </span>
          </nav>

          <section className="mx-auto max-w-4xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">Deal intelligence</p>
            <h1 className="text-4xl font-light leading-tight tracking-tight text-white md:text-6xl">
              Find the <span className="font-bold text-gradient-vibrant">perfect deal</span>, skip the risk
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
              Searches second-hand listings, detects risk signals, ranks the best options, and drafts ethical negotiation messages in seconds.
            </p>
          </section>

          <SearchForm
            goal={goal}
            demoGoals={demoGoals}
            loading={loading}
            onGoalChange={setGoal}
            onSubmit={() => handleRun(goal)}
            onQuickRun={handleRun}
          />
        </section>

        {error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-indigo-200">
            <Loader2 className="animate-spin" size={20} />
            <span>Running DealPilot agent: researching, scoring, and ranking top choices...</span>
          </div>
        ) : null}

        <section className="glass-panel-3d p-5 md:p-8" id="results">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-purple-300">Results</p>
              <h2 className="text-2xl font-bold text-white">
                {result ? <span className="text-gradient">{result.listings_analyzed} listings ranked</span> : "Run the agent to see results"}
              </h2>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-800/50 px-4 py-2 text-xs font-semibold text-slate-300">
              {sourceLabel(result?.data_source)}
            </span>
          </div>

          {result && topDeal ? (
            <div className="flex flex-col gap-6">
              <PhaseTwoInsights result={result} />
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <BestDealCard deal={topDeal} result={result} />
                <NegotiationCard deal={topDeal} />
              </section>
              <RankedResultsList deals={rankedResults} />
              <TraceSummary result={result} />
            </div>
          ) : (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-4 text-center text-slate-500">
              <Sparkles size={32} className="opacity-50" />
              <p>Initiate a search above to discover ranked marketplace results.</p>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <WorkflowPanel loading={loading} hasResult={Boolean(result)} />
          <SearchHistoryPanel history={searchHistory} loading={loading} onRun={handleRun} onClear={clearHistory} />
        </section>

        <AboutProject />
      </div>
    </main>
  );
}

function PhaseTwoInsights({ result }: { result: FullRunResponse }) {
  const benchmark = result.market_benchmark;
  const checklist = result.product_safety_checklist;
  const whyNotCheapest = result.why_not_cheapest;

  if (!benchmark && !checklist && !whyNotCheapest) return null;

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr_1fr]">
      {benchmark ? <MarketBenchmarkCard result={result} /> : null}
      {checklist ? <SafetyChecklistCard result={result} /> : null}
      {whyNotCheapest ? <WhyNotCheapestCard result={result} /> : null}
    </section>
  );
}

function MarketBenchmarkCard({ result }: { result: FullRunResponse }) {
  const benchmark = result.market_benchmark;
  if (!benchmark) return null;

  const best = benchmark.best_listing_benchmark;
  const percent = best?.price_vs_median_percent ?? 0;

  return (
    <article className="glass-panel-3d p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-cyan-300">Market benchmark</p>
          <h3 className="text-xl font-bold text-white">Price intelligence wheel</h3>
        </div>
        <BarChart3 className="text-cyan-300" size={24} />
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
        <BenchmarkWheel percent={percent} />
        <div className="w-full flex-1 space-y-3">
          <p className="text-sm leading-6 text-slate-300">{benchmark.summary}</p>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Low" value={formatInr(benchmark.lowest_price)} />
            <Metric label="Median" value={formatInr(benchmark.median_price)} highlight />
            <Metric label="High" value={formatInr(benchmark.highest_price)} />
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
            <span className="font-bold uppercase tracking-wider text-cyan-300">{best?.price_band.replaceAll("_", " ") ?? "Market band"}</span>
            <span className="mt-1 block text-slate-300">{result.real_data_evidence?.evidence_label ?? sourceLabel(result.data_source)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function BenchmarkWheel({ percent }: { percent: number }) {
  const magnitude = Math.min(100, Math.max(8, Math.round((Math.abs(percent) / 35) * 100)));
  const belowMedian = percent < 0;
  const label = percent === 0 ? "at median" : `${Math.abs(percent).toFixed(1)}% ${belowMedian ? "below" : "above"}`;
  const gradientColor = belowMedian ? "#22d3ee" : "#f59e0b";

  return (
    <div className="relative grid h-40 w-40 flex-shrink-0 place-items-center rounded-full border border-white/10 bg-slate-950/40">
      <div
        className="absolute inset-3 rounded-full"
        style={{
          background: `conic-gradient(${gradientColor} ${magnitude * 3.6}deg, rgba(148, 163, 184, 0.14) 0deg)`,
        }}
      />
      <div className="absolute inset-7 rounded-full border border-white/10 bg-[#100a18]" />
      <div className="relative text-center">
        <div className={`text-2xl font-black ${belowMedian ? "text-cyan-200" : "text-amber-200"}`}>
          {Math.abs(percent).toFixed(1)}%
        </div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function SafetyChecklistCard({ result }: { result: FullRunResponse }) {
  const checklist = result.product_safety_checklist;
  if (!checklist) return null;

  return (
    <article className="glass-panel-3d p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Buyer checklist</p>
          <h3 className="text-xl font-bold text-white">{checklist.target_model} safety checks</h3>
        </div>
        <ShieldCheck className="text-emerald-300" size={24} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {checklist.checklist_items.slice(0, 8).map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${item.priority === "high" ? "bg-emerald-300" : "bg-indigo-300"}`} />
              <span className="text-sm font-bold text-white">{item.label}</span>
            </div>
            <p className="text-xs leading-5 text-slate-400">{item.reason}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function WhyNotCheapestCard({ result }: { result: FullRunResponse }) {
  const insight = result.why_not_cheapest;
  if (!insight) return null;

  return (
    <article className="glass-panel-3d p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-pink-300">Decision logic</p>
          <h3 className="text-xl font-bold text-white">Why not cheapest?</h3>
        </div>
        <Trophy className="text-pink-300" size={24} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Metric label={insight.cheapest_selected ? "Selected deal" : "Cheapest"} value={insight.cheapest_price ? formatInr(insight.cheapest_price) : "N/A"} />
        <Metric label="Best ranked" value={insight.best_price ? formatInr(insight.best_price) : "N/A"} highlight />
      </div>

      <p className="mb-4 text-sm leading-6 text-slate-300">{insight.explanation}</p>

      <div className="space-y-2">
        {insight.decision_factors.slice(0, 4).map((factor) => (
          <div key={factor} className="rounded-lg border border-pink-500/20 bg-pink-500/10 px-3 py-2 text-xs leading-5 text-pink-50">
            {factor}
          </div>
        ))}
      </div>
    </article>
  );
}

function WorkflowPanel({ loading, hasResult }: { loading: boolean; hasResult: boolean }) {
  return (
    <section className="glass-panel-3d p-5 md:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-indigo-400">Agent workflow</p>
          <h2 className="text-xl font-bold text-white">Research, reason, decide</h2>
        </div>
        {loading ? <Loader2 className="animate-spin text-indigo-400" size={24} /> : <CheckCircle2 className="text-indigo-300" size={24} />}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const active = loading && index === 0;
          const complete = hasResult && !loading;
          return (
            <div key={step.label} className={`step-indicator flex flex-col items-center p-4 text-center ${active ? "active" : ""} ${complete ? "complete" : ""}`}>
              <Icon size={22} className="mb-3 text-indigo-300" />
              <div className="mb-1 text-sm font-bold text-slate-200">{step.label}</div>
              <div className="text-[11px] leading-tight text-slate-400">{step.detail}</div>
              {(active || complete) ? <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-indigo-400" /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SearchHistoryPanel({
  history,
  loading,
  onRun,
  onClear,
}: {
  history: SearchHistoryItem[];
  loading: boolean;
  onRun: (goal: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="glass-panel-3d flex max-h-[400px] flex-col p-5 md:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-pink-400">Local memory</p>
          <h2 className="text-xl font-bold text-white">Previous searches</h2>
        </div>
        <History className="text-pink-400" size={24} />
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {history.length ? (
          <div className="flex flex-col gap-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => onRun(item.goal)}
                disabled={loading}
                className="interactive-row w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left"
              >
                <span className="mb-1 block text-sm font-bold text-slate-200">{item.goal}</span>
                <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                  <span>
                    <strong className="text-indigo-300">{item.dealScore ? `${item.dealScore}/100` : "new"}</strong> score
                    {item.price ? ` / ${formatInr(item.price)}` : ""}
                  </span>
                  <span>{formatTimeAgo(item.createdAt)}</span>
                </div>
              </button>
            ))}
            <button className="py-3 text-center text-xs text-slate-500 transition-colors hover:text-slate-300" onClick={onClear}>
              Clear local history
            </button>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
            Search history will appear here after your first run.
          </div>
        )}
      </div>
    </section>
  );
}

function BestDealCard({ deal, result }: { deal: RankedDeal; result: FullRunResponse }) {
  const href = normalizeHref(deal.listing.listing_url);

  return (
    <article className="glass-panel-3d flex flex-col justify-between p-5 md:p-8">
      <div>
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="rounded-full border border-indigo-400/50 bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1 text-xs font-bold text-white">
            #{deal.ranking.rank} {deal.ranking.recommendation_label}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${riskClass(deal.risk_analysis.risk_level)}`}>
            {deal.risk_analysis.risk_level} risk
          </span>
        </div>
        <h3 className="mb-4 text-2xl font-bold leading-snug text-white md:text-3xl">{deal.listing.title}</h3>
        <p className="mb-6 text-sm leading-relaxed text-slate-400">{deal.deal_analysis.reasoning}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Listed" value={formatInr(deal.listing.price)} />
        <Metric label="Score" value={`${deal.deal_analysis.deal_score}/100`} highlight />
        <Metric label="Safety" value={`${deal.risk_analysis.risk_score}/100`} />
        <Metric label="Target" value={formatInr(deal.negotiation.target_price)} highlight />
      </div>

      <div className="mb-6 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
        <span>{deal.listing.location || "Unknown"}</span>
        <span>{deal.listing.source}</span>
        <span>{sourceLabel(result.data_source)}</span>
      </div>

      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20">
          Inspect original listing
          <ExternalLink size={16} />
        </a>
      ) : null}
    </article>
  );
}

function NegotiationCard({ deal }: { deal: RankedDeal }) {
  return (
    <article className="glass-panel-3d flex flex-col p-5 md:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-emerald-400">Negotiation strategy</p>
          <h2 className="text-xl font-bold text-white">Ethical offer draft</h2>
        </div>
        <MessageSquareText className="text-emerald-400" size={24} />
      </div>

      <div className="relative mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm leading-relaxed text-emerald-50">
        <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-emerald-500" />
        &quot;{deal.negotiation.opening_message}&quot;
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Metric label="Target offer" value={formatInr(deal.negotiation.target_price)} highlight />
        <Metric label="Max threshold" value={formatInr(deal.negotiation.maximum_recommended_price)} />
      </div>

      <div className="grid gap-4">
        <ListBlock title="Critical questions" items={deal.negotiation.questions_to_ask_seller.slice(0, 3)} color="indigo" />
        <ListBlock title="Walk away if" items={deal.negotiation.walkaway_conditions.slice(0, 3)} color="rose" />
      </div>
    </article>
  );
}

function RankedResultsList({ deals }: { deals: RankedDeal[] }) {
  return (
    <section className="glass-panel-3d p-5 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-sky-400">Complete analysis</p>
          <h2 className="text-xl font-bold text-white">Ranked marketplace options</h2>
        </div>
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
          {deals.length} matched
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {deals.map((deal) => {
          const href = normalizeHref(deal.listing.listing_url);
          const row = (
            <>
              <span className="w-8 text-center text-sm font-bold text-slate-500">#{deal.ranking.rank}</span>
              <div className="min-w-0 flex-1 px-4">
                <div className="truncate text-sm font-bold text-white">{deal.listing.title}</div>
                <div className="mt-1 truncate text-xs text-slate-400">
                  {deal.listing.location || "Unknown"} <span className="mx-2 opacity-50">|</span>
                  <span className="font-mono">{formatInr(deal.listing.price)}</span> list <span className="mx-2 opacity-50">|</span>
                  <span className="font-mono text-indigo-300">{formatInr(deal.negotiation.target_price)}</span> target
                </div>
              </div>
              <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/20 px-3 py-1 text-sm font-bold text-indigo-300">
                {deal.deal_analysis.deal_score}
              </span>
              <span className={`ml-3 w-20 rounded-lg border py-1.5 text-center text-xs font-bold uppercase ${riskClass(deal.risk_analysis.risk_level)}`}>
                {deal.risk_analysis.risk_level}
              </span>
            </>
          );

          return href ? (
            <a key={deal.listing.id} href={href} target="_blank" rel="noreferrer" className="interactive-row flex items-center rounded-xl border border-white/10 bg-white/5 p-3">
              {row}
            </a>
          ) : (
            <div key={deal.listing.id} className="interactive-row flex items-center rounded-xl border border-white/10 bg-white/5 p-3">
              {row}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TraceSummary({ result }: { result: FullRunResponse }) {
  const events = result.workflow_events.slice(-5);
  return (
    <section className="glass-panel-3d p-5 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-purple-400">Agent execution trace</p>
          <h2 className="text-xl font-bold text-white">System operations</h2>
        </div>
        <Clock3 className="text-purple-400" size={24} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
        {events.map((event) => (
          <div key={event.id} className="metric-card-3d">
            <span className="mb-2 block border-b border-purple-500/20 pb-2 text-[10px] font-bold uppercase tracking-wider text-purple-300">
              {event.event_type.replaceAll("_", " ")}
            </span>
            <p className="text-xs leading-relaxed text-slate-400">{event.details ?? event.status}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AboutProject() {
  return (
    <section className="glass-panel-3d p-5 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-purple-300">About DealPilot AI</p>
          <h2 className="text-2xl font-bold text-white">A buyer-side agent for safer second-hand purchases</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            DealPilot AI turns a buying goal into an agentic workflow: it searches marketplace data, normalizes listings,
            scores deal quality, detects risk signals, ranks the best opportunities, and drafts ethical negotiation
            messages. It is built for second-hand electronics today, with room to expand into vehicles, furniture,
            rentals, and local commerce.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <a
            href="https://www.linkedin.com/in/joeldeva/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-blue-400/50 hover:bg-blue-500/10"
          >
            <Linkedin size={18} />
            LinkedIn
          </a>
          <a
            href="https://github.com/joeldeva"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-purple-400/50 hover:bg-purple-500/10"
          >
            <Github size={18} />
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`metric-card-3d ${highlight ? "border-indigo-500/40 bg-indigo-500/10" : ""}`}>
      <span className={`text-[10px] font-bold uppercase ${highlight ? "text-indigo-300" : "text-slate-400"}`}>{label}</span>
      <strong className={`mt-1 block font-mono text-sm ${highlight ? "text-white" : "text-slate-200"}`}>{value}</strong>
    </div>
  );
}

function ListBlock({ title, items, color }: { title: string; items: string[]; color: "indigo" | "rose" }) {
  const colorClass = color === "indigo" ? "text-indigo-300 bg-indigo-500/10 border-indigo-500/20" : "text-rose-300 bg-rose-500/10 border-rose-500/20";
  const dotColor = color === "indigo" ? "bg-indigo-400" : "bg-rose-400";

  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider opacity-90">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
            <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotColor}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function sourceLabel(source?: FullRunResponse["data_source"]) {
  if (source === "apify_live") return "Apify live";
  if (source === "apify_cache") return "Marketplace cache";
  return source ? "Marketplace analysis" : "Ready for search";
}

function riskClass(level: string) {
  const normalized = level.toLowerCase();
  if (normalized === "high") return "bg-red-500/20 text-red-300 border-red-500/40";
  if (normalized === "medium") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
}

function normalizeHref(value: string) {
  const raw = value?.trim();
  if (!raw || raw === "#" || raw.includes("example.invalid")) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("www.")) return `https://${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  const candidate = raw.split(/\s|>/)[0]?.trim().replace(/\/$/, "");
  if (candidate?.includes(".") && !candidate.includes(" ")) return `https://${candidate}`;
  return "";
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimeAgo(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}
