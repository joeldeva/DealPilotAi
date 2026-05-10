"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  ExternalLink,
  History,
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

const integrationCards = [
  { name: "Apify", value: "Marketplace data" },
  { name: "Gemini", value: "Optional message polish" },
  { name: "Zynd AI", value: "Deployed service wrapper" },
  { name: "Superplane", value: "Workflow event trace" },
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
        apify_source: "google",
        max_items: 10,
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
        // Local history is a UI convenience; the agent run should not fail if storage is unavailable.
      }
      return next;
    });
  }

  function clearHistory() {
    setSearchHistory([]);
    try {
      window.localStorage.removeItem(historyStorageKey);
    } catch {
      // Ignore unavailable storage.
    }
  }

  return (
    <main className="dp-page">
      <section className="dp-root">
        <div className="dp-inner">
          <nav className="dp-nav">
            <div className="dp-logo">
              <div className="dp-logo-mark">D</div>
              <div>
                <p className="dp-logo-kicker">DealPilot</p>
                <p className="dp-logo-name">Buyer-side commerce agent</p>
              </div>
            </div>
            <span className="dp-badge">Autonomous Agent</span>
          </nav>

          <section className="dp-hero">
            <p className="dp-eyebrow">Deal intelligence</p>
            <h1 className="dp-title">
              Find the <span>right deal</span>, skip the risk
            </h1>
            <p className="dp-sub">
              Searches second-hand listings, detects risk signals, ranks the best options, and drafts ethical negotiation messages.
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

          <section className="dp-dashboard-grid">
            <WorkflowPanel loading={loading} hasResult={Boolean(result)} />
            <SearchHistoryPanel
              history={searchHistory}
              loading={loading}
              onRun={handleRun}
              onClear={clearHistory}
            />
          </section>

          <IntegrationStrip result={result} />

          {error ? <ErrorPanel message={error} /> : null}
          {loading ? <LoadingPanel /> : null}

          <section className="dp-results-area" id="results">
            <div className="dp-results-header">
              <div>
                <p className="dp-results-label">Results</p>
                <h2 className="dp-section-title">
                  {result ? `${result.listings_analyzed} listings ranked` : "Run the agent to see ranked marketplace results"}
                </h2>
              </div>
              <span className="dp-source-pill">{sourceLabel(result?.data_source)}</span>
            </div>

            {result && topDeal ? (
              <div className="dp-results-content">
                <section className="dp-feature-grid">
                  <BestDealCard deal={topDeal} result={result} />
                  <NegotiationCard deal={topDeal} />
                </section>

                <RankedResultsList deals={rankedResults} />
                <TraceSummary result={result} />
              </div>
            ) : (
              <div className="dp-empty">
                <Sparkles size={22} />
                <span>Search a product goal above. Previous searches stay visible here after each run.</span>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function WorkflowPanel({ loading, hasResult }: { loading: boolean; hasResult: boolean }) {
  return (
    <section className="dp-panel">
      <div className="dp-panel-header">
        <div>
          <p className="dp-panel-kicker">Agent workflow</p>
          <h2 className="dp-panel-title">Research, reason, decide</h2>
        </div>
        {loading ? <Loader2 className="animate-spin text-violet-200" size={20} /> : <CheckCircle2 className="text-violet-200" size={20} />}
      </div>
      <div className="dp-steps">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const active = loading && index === 0;
          const complete = hasResult && !loading;
          return (
            <div key={step.label} className={`dp-step ${active ? "active" : ""} ${complete ? "complete" : ""}`}>
              <div className="dp-step-icon">
                <Icon size={20} />
              </div>
              <div className="dp-step-label">{step.label}</div>
              <div className="dp-step-desc">{step.detail}</div>
              {active || complete ? <div className="dp-step-dot" /> : null}
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
    <section className="dp-panel">
      <div className="dp-panel-header">
        <div>
          <p className="dp-panel-kicker">Previous searches</p>
          <h2 className="dp-panel-title">Stored on this browser</h2>
        </div>
        <History className="text-violet-200" size={20} />
      </div>

      {history.length ? (
        <div className="dp-history-list">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => onRun(item.goal)}
              disabled={loading}
              className="dp-history-item"
              type="button"
            >
              <span className="dp-history-goal">{item.goal}</span>
              <span className="dp-history-meta">
                {item.dealScore ? `${item.dealScore}/100` : "new"} deal score
                {item.price ? ` / ${formatInr(item.price)}` : ""}
              </span>
              <span className="dp-history-meta">{formatTimeAgo(item.createdAt)}</span>
            </button>
          ))}
          <button className="dp-history-clear" onClick={onClear} type="button">
            Clear local history
          </button>
        </div>
      ) : (
        <div className="dp-history-empty">
          Search history will appear here after your first run and persist locally for the demo.
        </div>
      )}
    </section>
  );
}

function IntegrationStrip({ result }: { result: FullRunResponse | null }) {
  return (
    <section className="dp-integration-strip">
      {integrationCards.map((card) => (
        <div key={card.name} className="dp-integration-card">
          <p>{card.name}</p>
          <span>{card.value}</span>
        </div>
      ))}
      <div className="dp-integration-card">
        <p>Latest source</p>
        <span>{sourceLabel(result?.data_source)}</span>
      </div>
    </section>
  );
}

function BestDealCard({ deal, result }: { deal: RankedDeal; result: FullRunResponse }) {
  const href = normalizeHref(deal.listing.listing_url);

  return (
    <article className="dp-best-card">
      <div className="dp-card-topline">
        <span className="dp-rank-pill">#{deal.ranking.rank} {deal.ranking.recommendation_label}</span>
        <span className={riskClass(deal.risk_analysis.risk_level)}>{deal.risk_analysis.risk_level} risk</span>
      </div>
      <h3>{deal.listing.title}</h3>
      <p>{deal.deal_analysis.reasoning}</p>
      <div className="dp-metric-grid">
        <Metric label="Listed" value={formatInr(deal.listing.price)} />
        <Metric label="Deal" value={`${deal.deal_analysis.deal_score}/100`} />
        <Metric label="Risk" value={`${deal.risk_analysis.risk_score}/100`} />
        <Metric label="Target" value={formatInr(deal.negotiation.target_price)} />
      </div>
      <div className="dp-detail-row">
        <span>{deal.listing.location || "Unknown location"}</span>
        <span>{deal.listing.source}</span>
        <span>{sourceLabel(result.data_source)}</span>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="dp-open-link">
          Open marketplace listing
          <ExternalLink size={15} />
        </a>
      ) : null}
    </article>
  );
}

function NegotiationCard({ deal }: { deal: RankedDeal }) {
  return (
    <article className="dp-negotiation-card">
      <div className="dp-panel-header">
        <div>
          <p className="dp-panel-kicker">Negotiation draft</p>
          <h2 className="dp-panel-title">Ethical offer strategy</h2>
        </div>
        <MessageSquareText className="text-violet-200" size={20} />
      </div>
      <div className="dp-message-box">{deal.negotiation.opening_message}</div>
      <div className="dp-mini-grid">
        <Metric label="Target offer" value={formatInr(deal.negotiation.target_price)} />
        <Metric label="Max advised" value={formatInr(deal.negotiation.maximum_recommended_price)} />
      </div>
      <ListBlock title="Ask seller" items={deal.negotiation.questions_to_ask_seller.slice(0, 4)} />
      <ListBlock title="Walk away if" items={deal.negotiation.walkaway_conditions.slice(0, 3)} />
    </article>
  );
}

function RankedResultsList({ deals }: { deals: RankedDeal[] }) {
  return (
    <section className="dp-ranked-panel">
      <div className="dp-panel-header">
        <div>
          <p className="dp-panel-kicker">Ranked listings</p>
          <h2 className="dp-panel-title">Best options first</h2>
        </div>
        <span className="dp-results-count">{deals.length} results</span>
      </div>
      <div className="dp-result-list">
        {deals.map((deal) => {
          const href = normalizeHref(deal.listing.listing_url);
          const row = (
            <>
              <span className="dp-result-rank">#{deal.ranking.rank}</span>
              <div className="dp-result-info">
                <div className="dp-result-name">{deal.listing.title}</div>
                <div className="dp-result-meta">
                  {deal.listing.location || "Unknown location"} / {formatInr(deal.listing.price)} / target {formatInr(deal.negotiation.target_price)}
                </div>
              </div>
              <span className="dp-result-score">{deal.deal_analysis.deal_score}</span>
              <span className={riskClass(deal.risk_analysis.risk_level)}>{deal.risk_analysis.risk_level}</span>
            </>
          );

          return href ? (
            <a key={deal.listing.id} href={href} target="_blank" rel="noreferrer" className="dp-result-row">
              {row}
            </a>
          ) : (
            <div key={deal.listing.id} className="dp-result-row">
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
    <section className="dp-trace-panel">
      <div className="dp-panel-header">
        <div>
          <p className="dp-panel-kicker">Agent trace</p>
          <h2 className="dp-panel-title">What happened in this run</h2>
        </div>
        <Clock3 className="text-violet-200" size={20} />
      </div>
      <div className="dp-trace-grid">
        {events.map((event) => (
          <div key={event.id} className="dp-trace-item">
            <span>{event.event_type.replaceAll("_", " ")}</span>
            <p>{event.details ?? event.status}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="dp-error">
      <AlertTriangle size={18} />
      <span>{message}</span>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="dp-loading">
      <Loader2 className="animate-spin" size={18} />
      <span>Running DealPilot agent: searching, scoring, risk-checking, ranking, and drafting.</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dp-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="dp-list-block">
      <p>{title}</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function sourceLabel(source?: FullRunResponse["data_source"]) {
  if (source === "apify_live") return "Apify live";
  if (source === "apify_cache") return "Apify cache";
  if (source === "mock_fallback") return "Mock fallback";
  return "Ready";
}

function riskClass(level: string) {
  const normalized = level.toLowerCase();
  if (normalized === "high") return "dp-risk dp-risk-high";
  if (normalized === "medium") return "dp-risk dp-risk-mid";
  return "dp-risk dp-risk-low";
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
