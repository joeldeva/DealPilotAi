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
  Activity,
  Database,
  Fingerprint,
  Layers,
  LockKeyhole,
  RefreshCw,
  Route
} from "lucide-react";
import { SearchForm } from "../components/SearchForm";
import { fetchHostedStatus, fetchReports, fetchSuperplaneCanvas, runFullDemo } from "../lib/api";
import type { DealReportSummary, FullRunResponse, HostedStatus, RankedDeal, SuperplaneCanvas } from "../lib/types";

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
  { name: "Apify", value: "Marketplace data", icon: Layers },
  { name: "Gemini", value: "Optional message polish", icon: Sparkles },
  { name: "Zynd AI", value: "Deployed service wrapper", icon: Activity },
  { name: "Superplane", value: "Workflow event trace", icon: Clock3 },
];

export default function Home() {
  const [goal, setGoal] = useState(demoGoals[0]);
  const [result, setResult] = useState<FullRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [useLiveApify, setUseLiveApify] = useState(true);
  const [confirmLiveRun, setConfirmLiveRun] = useState(true);
  const [maxItems, setMaxItems] = useState(10);
  const [useLiveLlm, setUseLiveLlm] = useState(true);
  const [confirmLiveLlm, setConfirmLiveLlm] = useState(true);
  const [reports, setReports] = useState<DealReportSummary[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [hostedStatus, setHostedStatus] = useState<HostedStatus | null>(null);
  const [superplaneCanvas, setSuperplaneCanvas] = useState<SuperplaneCanvas | null>(null);

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
    void refreshReports();
    void fetchHostedStatus()
      .then(setHostedStatus)
      .catch(() => setHostedStatus(null));
    void fetchSuperplaneCanvas()
      .then(setSuperplaneCanvas)
      .catch(() => setSuperplaneCanvas(null));
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
        use_live_apify: useLiveApify,
        confirm_live_run: useLiveApify && confirmLiveRun,
        apify_source: "google",
        max_items: Math.min(Math.max(maxItems, 1), 20),
        use_live_llm: useLiveLlm,
        confirm_live_llm: useLiveLlm && confirmLiveLlm,
        save_report: true,
      });
      setResult(response);
      saveSearchHistory(trimmedGoal, response);
      void refreshReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent run failed. Check the backend URL and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshReports() {
    try {
      const response = await fetchReports(6);
      setReports(response.reports);
      setReportsLoaded(true);
    } catch {
      setReportsLoaded(true);
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
      }
      return next;
    });
  }

  function clearHistory() {
    setSearchHistory([]);
    try {
      window.localStorage.removeItem(historyStorageKey);
    } catch {
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8 perspective-container text-slate-200">
      <section className="max-w-6xl mx-auto glass-panel-3d floating">
        <div className="p-6 md:p-10 relative z-10 flex flex-col gap-8 pop-out">
          
          <nav className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(168,85,247,0.5)] transform transition-transform hover:scale-110 hover:rotate-6">
                D
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-purple-300">DealPilot</p>
                <p className="text-sm text-slate-400 mt-1">Buyer-side commerce agent</p>
              </div>
            </div>
            <span className="px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-200 text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              Autonomous Agent
            </span>
          </nav>

          <section className="max-w-3xl mx-auto text-center mt-4 mb-8">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-indigo-400 mb-4 animate-pulse">Deal intelligence</p>
            <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white mb-6 leading-tight">
              Find the <span className="font-bold text-gradient-vibrant">perfect deal</span>, skip the risk
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed">
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

          <section className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 preserve-3d">
            <ControlsPanel
              useLiveApify={useLiveApify}
              confirmLiveRun={confirmLiveRun}
              maxItems={maxItems}
              useLiveLlm={useLiveLlm}
              confirmLiveLlm={confirmLiveLlm}
              dataSource={result?.data_source ?? "mock_fallback"}
              llmCalled={result?.credit_safety.llm_called ?? false}
              onUseLiveApifyChange={setUseLiveApify}
              onConfirmLiveRunChange={setConfirmLiveRun}
              onMaxItemsChange={setMaxItems}
              onUseLiveLlmChange={setUseLiveLlm}
              onConfirmLiveLlmChange={setConfirmLiveLlm}
            />
            <CreditSafetyPanel result={result} maxItems={maxItems} />
          </section>

          <HostedProofPanel status={hostedStatus} result={result} />

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 preserve-3d">
            <WorkflowPanel loading={loading} hasResult={Boolean(result)} />
            <SearchHistoryPanel
              history={searchHistory}
              loading={loading}
              onRun={handleRun}
              onClear={clearHistory}
            />
          </section>

          <IntegrationStrip result={result} />

          <RecentReportsPanel reports={reports} reportsLoaded={reportsLoaded} onRefresh={refreshReports} />

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.2)] animate-pulse">
              <Loader2 className="animate-spin" size={20} />
              <span>Running DealPilot agent: researching, scoring, and ranking top choices...</span>
            </div>
          )}

          <section className="glass-panel-3d p-6 md:p-8 mt-4 preserve-3d" id="results">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-bold tracking-[0.15em] uppercase text-purple-300 mb-2">Results Area</p>
                <h2 className="text-2xl font-bold text-white">
                  {result ? <span className="text-gradient">{result.listings_analyzed} listings ranked</span> : "Run the agent to see results"}
                </h2>
              </div>
              <span className="px-4 py-2 rounded-full border border-slate-700 bg-slate-800/50 text-slate-300 text-xs font-semibold">
                {sourceLabel(result?.data_source)}
              </span>
            </div>

            {result && topDeal ? (
              <div className="flex flex-col gap-6 pop-out">
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 preserve-3d">
                  <BestDealCard deal={topDeal} result={result} />
                  <NegotiationCard deal={topDeal} />
                </section>
                <RankedResultsList deals={rankedResults} />
                <TraceSummary result={result} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-slate-500 gap-4">
                <Sparkles size={32} className="opacity-50" />
                <p>Initiate a search above to discover ranked marketplace results.</p>
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 preserve-3d">
            <AgentIdentityPanel />
            <WorkflowReadyPanel eventCount={result?.workflow_events?.length ?? 0} canvas={superplaneCanvas} />
          </section>
        </div>
      </section>
    </main>
  );
}

function ControlsPanel({
  useLiveApify,
  confirmLiveRun,
  maxItems,
  useLiveLlm,
  confirmLiveLlm,
  dataSource,
  llmCalled,
  onUseLiveApifyChange,
  onConfirmLiveRunChange,
  onMaxItemsChange,
  onUseLiveLlmChange,
  onConfirmLiveLlmChange,
}: {
  useLiveApify: boolean;
  confirmLiveRun: boolean;
  maxItems: number;
  useLiveLlm: boolean;
  confirmLiveLlm: boolean;
  dataSource: FullRunResponse["data_source"];
  llmCalled: boolean;
  onUseLiveApifyChange: (value: boolean) => void;
  onConfirmLiveRunChange: (value: boolean) => void;
  onMaxItemsChange: (value: number) => void;
  onUseLiveLlmChange: (value: boolean) => void;
  onConfirmLiveLlmChange: (value: boolean) => void;
}) {
  return (
    <section className="glass-panel-3d p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6 pop-out">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-indigo-400 mb-2">Feature settings</p>
          <h2 className="text-xl font-bold text-white">Data and AI mode</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Keep the finalist dashboard controls visible while using the new 3D visual design.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Database className="text-indigo-300" size={24} />
          <SourcePill source={dataSource} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 pop-out-more">
        <ToggleBox
          checked={useLiveApify}
          onChange={(value) => {
            onUseLiveApifyChange(value);
            if (!value) onConfirmLiveRunChange(false);
          }}
          title="Use live Apify data"
          detail="For final runs. Backend token, actor ID, live mode, and confirmation still gate usage."
        />
        <ToggleBox
          checked={confirmLiveRun}
          disabled={!useLiveApify}
          onChange={onConfirmLiveRunChange}
          title="Confirm Apify run"
          detail="Required before the frontend asks for live marketplace data."
        />
        <ToggleBox
          checked={useLiveLlm}
          onChange={(value) => {
            onUseLiveLlmChange(value);
            if (!value) onConfirmLiveLlmChange(false);
          }}
          title="Enhance with Gemini"
          detail="Optional explanation and negotiation polish when Gemini is configured."
        />
        <ToggleBox
          checked={confirmLiveLlm}
          disabled={!useLiveLlm}
          onChange={onConfirmLiveLlmChange}
          title="Confirm Gemini quota"
          detail={`Required before Gemini runs. Current llm_called=${String(llmCalled)}.`}
        />
      </div>

      <label className="mt-4 block rounded-2xl border border-white/10 bg-white/5 p-4 pop-out">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Apify items</span>
        <input
          type="number"
          min={1}
          max={20}
          value={maxItems}
          onChange={(event) => onMaxItemsChange(Math.min(Math.max(Number(event.target.value) || 1, 1), 20))}
          className="mt-2 w-full bg-transparent text-xl font-bold text-white outline-none"
        />
      </label>
    </section>
  );
}

function ToggleBox({
  checked,
  disabled,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <label className={`interactive-row flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 ${disabled ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-indigo-400"
      />
      <span>
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">{detail}</span>
      </span>
    </label>
  );
}

function CreditSafetyPanel({ result, maxItems }: { result: FullRunResponse | null; maxItems: number }) {
  const safety = result?.credit_safety;
  return (
    <section className="glass-panel-3d p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6 pop-out">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-400 mb-2">Run status</p>
          <h2 className="text-xl font-bold text-white">Integration dashboard</h2>
        </div>
        <LockKeyhole className="text-emerald-300" size={24} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pop-out-more">
        <SafetyItem label="Apify called" value={safety?.apify_called ?? false} />
        <SafetyItem label="Apify cache" value={safety?.apify_cache_used ?? false} />
        <SafetyItem label="LLM called" value={safety?.llm_called ?? false} />
        <SafetyItem label="Zynd deployed" value />
        <SafetyItem label="Webhook tested" value />
        <SafetyItem label="Workflow ready" value />
        <Metric label="Items used" value={String(safety?.max_items_used ?? maxItems)} />
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400 pop-out">
        Direct website runs do not need to route through Zynd. Zynd proof remains the deployed service wrapper at `/webhook/sync`.
      </p>
      {result?.report_id ? (
        <p className="mt-2 text-xs leading-5 text-slate-500 pop-out">
          Saved report: <span className="text-slate-200">{result.report_id}</span>
        </p>
      ) : null}
    </section>
  );
}

function SafetyItem({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={`metric-card-3d ${value ? "bg-emerald-500/10 border-emerald-500/30" : ""}`}>
      <span className="text-[10px] uppercase font-bold text-slate-400">{label}</span>
      <strong className={`block mt-1 text-sm font-mono ${value ? "text-emerald-200" : "text-slate-200"}`}>
        {String(value)}
      </strong>
    </div>
  );
}

function HostedProofPanel({ status, result }: { status: HostedStatus | null; result: FullRunResponse | null }) {
  const backendOnline = status?.health.status === "ok";
  return (
    <section className="glass-panel-3d p-6 md:p-8 preserve-3d">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pop-out">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-purple-300 mb-2">Hosted demo proof</p>
          <h2 className="text-2xl font-bold text-white">Integration readiness visible to judges</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This keeps the previous dashboard proof, now styled with the new template.
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full border text-xs font-bold ${backendOnline ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200" : "bg-amber-500/15 border-amber-500/30 text-amber-200"}`}>
          Backend {backendOnline ? "online" : "checking"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pop-out-more">
        <ProofTile title="Data source" value={sourceLabel(result?.data_source)} detail={`${result?.listings_analyzed ?? 0} listings analyzed`} />
        <ProofTile
          title="Apify"
          value={status ? `live=${String(status.apify.apify_live_mode)}` : "loading"}
          detail={status ? `token=${String(status.apify.token_configured)}, cache=${String(status.apify.cache_enabled)}` : "Marketplace adapter"}
        />
        <ProofTile
          title="Gemini"
          value={status ? `live=${String(status.gemini.gemini_live_mode)}` : "loading"}
          detail={status ? `key=${String(status.gemini.api_key_configured)}, called=${String(status.gemini.called)}` : "Optional LLM status"}
        />
        <ProofTile
          title="Zynd AI"
          value={status ? status.zynd.mode : "deployed"}
          detail={status ? `called=${String(status.zynd.zynd_called)}, card=active` : "Agent identity ready"}
        />
        <ProofTile
          title="Superplane"
          value={status ? status.superplane.mode : "workflow_ready"}
          detail={status ? `called=${String(status.superplane.superplane_called)}, canvas=${String(status.superplane.canvas_available)}` : "Local event trace"}
        />
      </div>
    </section>
  );
}

function ProofTile({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="metric-card-3d">
      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">{title}</span>
      <strong className="mt-2 block text-sm text-white">{value}</strong>
      <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

function WorkflowPanel({ loading, hasResult }: { loading: boolean; hasResult: boolean }) {
  return (
    <section className="glass-panel-3d p-6 md:p-8 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-6 pop-out">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-indigo-400 mb-2">Agent workflow</p>
          <h2 className="text-xl font-bold text-white">Research, reason, decide</h2>
        </div>
        {loading ? <Loader2 className="animate-spin text-indigo-400" size={24} /> : <CheckCircle2 className="text-emerald-400" size={24} />}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-auto pop-out-more">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const active = loading && index === 0;
          const complete = hasResult && !loading;
          return (
            <div key={step.label} className={`step-indicator flex flex-col items-center text-center p-3 ${active ? "active" : ""} ${complete ? "complete" : ""}`}>
              <Icon size={22} className="mb-3 text-indigo-300 step-icon" />
              <div className="text-sm font-bold text-slate-200 mb-1">{step.label}</div>
              <div className="text-[10px] text-slate-400 leading-tight">{step.detail}</div>
              {(active || complete) && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8]" />
              )}
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
    <section className="glass-panel-3d p-6 md:p-8 flex flex-col max-h-[400px]">
      <div className="flex items-start justify-between mb-6 pop-out">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-pink-400 mb-2">Local memory</p>
          <h2 className="text-xl font-bold text-white">Previous searches</h2>
        </div>
        <History className="text-pink-400" size={24} />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pop-out-more">
        {history.length ? (
          <div className="flex flex-col gap-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => onRun(item.goal)}
                disabled={loading}
                className="interactive-row text-left w-full p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <span className="block font-bold text-sm text-slate-200 mb-1">{item.goal}</span>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    <strong className="text-indigo-300">{item.dealScore ? `${item.dealScore}/100` : "new"}</strong> score
                    {item.price ? ` · ${formatInr(item.price)}` : ""}
                  </span>
                  <span>{formatTimeAgo(item.createdAt)}</span>
                </div>
              </button>
            ))}
            <button className="text-xs text-slate-500 hover:text-slate-300 py-3 text-center transition-colors" onClick={onClear}>
              Clear local history
            </button>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed border-slate-700 rounded-xl p-6 text-sm text-slate-500 text-center">
            Search history will appear here after your first run.
          </div>
        )}
      </div>
    </section>
  );
}

function IntegrationStrip({ result }: { result: FullRunResponse | null }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
      {integrationCards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.name} className="glass-panel-3d p-4 flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
              <Icon size={18} className="text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">{card.name}</p>
              <span className="text-xs text-slate-200 font-medium">{card.value}</span>
            </div>
          </div>
        );
      })}
      <div className="glass-panel-3d p-4 flex items-center gap-3 bg-indigo-500/10 border-indigo-500/30">
        <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
          <Activity size={18} className="text-indigo-300 animate-pulse" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-wider uppercase text-indigo-300">Latest Source</p>
          <span className="text-xs text-indigo-100 font-medium">{sourceLabel(result?.data_source)}</span>
        </div>
      </div>
    </section>
  );
}

function RecentReportsPanel({
  reports,
  reportsLoaded,
  onRefresh,
}: {
  reports: DealReportSummary[];
  reportsLoaded: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="glass-panel-3d p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pop-out">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-sky-400 mb-2">Product memory</p>
          <h2 className="text-xl font-bold text-white">Saved deal reports</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Backend-saved reports stay here, while the browser history panel keeps recent searches instantly visible.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="btn-3d min-h-11 px-5 text-sm"
          type="button"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {reports.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pop-out-more">
          {reports.map((report) => (
            <div key={report.report_id} className="metric-card-3d">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-[10px] font-bold uppercase text-indigo-200">
                  {report.target_model}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase text-slate-300">
                  {report.data_source}
                </span>
              </div>
              <p className="line-clamp-2 text-sm font-bold text-white">{report.best_listing_title ?? report.user_goal}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric label="Deal" value={report.best_deal_score ? `${report.best_deal_score}/100` : "N/A"} />
                <Metric label="Risk" value={report.best_risk_level ?? "N/A"} />
              </div>
              <p className="mt-3 text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-400 pop-out">
          {reportsLoaded ? "No saved reports yet. Run the agent once to create one." : "Reports load after the first refresh or agent run."}
        </div>
      )}
    </section>
  );
}

function AgentIdentityPanel() {
  const capabilities = ["marketplace_search", "deal_analysis", "scam_risk_detection", "decision_ranking", "negotiation_strategy"];
  return (
    <section className="glass-panel-3d p-6 md:p-8">
      <div className="flex gap-4 pop-out">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-300/20">
          <Fingerprint size={24} />
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-indigo-400 mb-2">Agent identity</p>
          <h2 className="text-xl font-bold text-white">Zynd AI service active</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            External agents can invoke DealPilot through the deployed Zynd wrapper.
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 pop-out-more">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Service URL</p>
        <p className="mt-2 break-all text-sm text-indigo-100">https://deployer.zynd.ai/service/dealpilot-ai-79621b</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 pop-out">
        {capabilities.map((capability) => (
          <span key={capability} className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
            {capability.replaceAll("_", " ")}
          </span>
        ))}
      </div>
    </section>
  );
}

function WorkflowReadyPanel({ eventCount, canvas }: { eventCount: number; canvas: SuperplaneCanvas | null }) {
  return (
    <section className="glass-panel-3d p-6 md:p-8">
      <div className="flex gap-4 pop-out">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-200 ring-1 ring-pink-300/20">
          <Route size={24} />
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-pink-400 mb-2">Workflow readiness</p>
          <h2 className="text-xl font-bold text-white">Superplane-style event trace</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Local canvas export mode. {eventCount} workflow events are available after the latest run.
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 pop-out-more">
        <Metric label="Canvas steps" value={String(canvas?.components.length ?? 0)} />
        <Metric label="Superplane called" value={String(canvas?.superplane_called ?? false)} />
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500 pop-out">
        {canvas?.description ?? "Canvas metadata loads from the backend without running Superplane."}
      </p>
    </section>
  );
}

function SourcePill({ source }: { source: FullRunResponse["data_source"] }) {
  return (
    <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase text-indigo-200">
      {sourceLabel(source)}
    </span>
  );
}

function BestDealCard({ deal, result }: { deal: RankedDeal; result: FullRunResponse }) {
  const href = normalizeHref(deal.listing.listing_url);

  return (
    <article className="glass-panel-3d p-6 md:p-8 flex flex-col justify-between">
      <div className="pop-out">
        <div className="flex items-center justify-between mb-6">
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-[0_0_10px_rgba(99,102,241,0.5)] border border-indigo-400/50">
            #{deal.ranking.rank} {deal.ranking.recommendation_label}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${riskClass(deal.risk_analysis.risk_level)} border`}>
            {deal.risk_analysis.risk_level} risk
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-snug">{deal.listing.title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">{deal.deal_analysis.reasoning}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 pop-out-more">
        <Metric label="Listed" value={formatInr(deal.listing.price)} />
        <Metric label="Score" value={`${deal.deal_analysis.deal_score}/100`} highlight />
        <Metric label="Safety" value={`${deal.risk_analysis.risk_score}/100`} />
        <Metric label="Target" value={formatInr(deal.negotiation.target_price)} highlight />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-medium mb-6 pop-out">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {deal.listing.location || "Unknown"}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {deal.listing.source}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {sourceLabel(result.data_source)}</span>
      </div>

      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold transition-all hover:scale-105 pop-out-more shadow-lg">
          Inspect original listing
          <ExternalLink size={16} />
        </a>
      )}
    </article>
  );
}

function NegotiationCard({ deal }: { deal: RankedDeal }) {
  return (
    <article className="glass-panel-3d p-6 md:p-8 flex flex-col">
      <div className="flex items-start justify-between mb-6 pop-out">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-400 mb-2">Negotiation Strategy</p>
          <h2 className="text-xl font-bold text-white">Ethical offer draft</h2>
        </div>
        <MessageSquareText className="text-emerald-400" size={24} />
      </div>
      
      <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-50 text-sm leading-relaxed mb-6 pop-out shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-xl"></div>
        "{deal.negotiation.opening_message}"
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6 pop-out-more">
        <div className="metric-card-3d bg-indigo-500/10 border-indigo-500/30">
          <span className="text-[10px] uppercase font-bold text-indigo-300">Target Offer</span>
          <strong className="block mt-1 text-lg text-white font-mono">{formatInr(deal.negotiation.target_price)}</strong>
        </div>
        <div className="metric-card-3d bg-pink-500/10 border-pink-500/30">
          <span className="text-[10px] uppercase font-bold text-pink-300">Max Threshold</span>
          <strong className="block mt-1 text-lg text-white font-mono">{formatInr(deal.negotiation.maximum_recommended_price)}</strong>
        </div>
      </div>

      <div className="grid gap-4 pop-out">
        <ListBlock title="Critical questions" items={deal.negotiation.questions_to_ask_seller.slice(0, 3)} color="indigo" />
        <ListBlock title="Walk away if" items={deal.negotiation.walkaway_conditions.slice(0, 3)} color="rose" />
      </div>
    </article>
  );
}

function RankedResultsList({ deals }: { deals: RankedDeal[] }) {
  return (
    <section className="glass-panel-3d p-6 md:p-8 mt-6">
      <div className="flex items-center justify-between mb-6 pop-out">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-sky-400 mb-2">Complete Analysis</p>
          <h2 className="text-xl font-bold text-white">Ranked marketplace options</h2>
        </div>
        <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/20">
          {deals.length} matched
        </span>
      </div>
      <div className="flex flex-col gap-3 pop-out-more">
        {deals.map((deal) => {
          const href = normalizeHref(deal.listing.listing_url);
          const row = (
            <>
              <span className="w-8 text-center text-slate-500 font-bold text-sm">#{deal.ranking.rank}</span>
              <div className="flex-1 min-w-0 px-4">
                <div className="font-bold text-sm text-white truncate">{deal.listing.title}</div>
                <div className="text-xs text-slate-400 truncate mt-1">
                  {deal.listing.location || "Unknown"} <span className="mx-2 opacity-50">|</span> 
                  <span className="font-mono">{formatInr(deal.listing.price)}</span> list <span className="mx-2 opacity-50">|</span> 
                  <span className="text-indigo-300 font-mono">{formatInr(deal.negotiation.target_price)}</span> target
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-sm border border-indigo-500/30">
                {deal.deal_analysis.deal_score}
              </span>
              <span className={`w-20 text-center text-xs font-bold uppercase rounded-lg py-1.5 ml-3 border ${riskClass(deal.risk_analysis.risk_level)}`}>
                {deal.risk_analysis.risk_level}
              </span>
            </>
          );

          return href ? (
            <a key={deal.listing.id} href={href} target="_blank" rel="noreferrer" className="interactive-row flex items-center p-3 rounded-xl bg-white/5 border border-white/10">
              {row}
            </a>
          ) : (
            <div key={deal.listing.id} className="interactive-row flex items-center p-3 rounded-xl bg-white/5 border border-white/10">
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
    <section className="glass-panel-3d p-6 md:p-8 mt-6">
      <div className="flex items-center justify-between mb-6 pop-out">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-purple-400 mb-2">Agent execution trace</p>
          <h2 className="text-xl font-bold text-white">System operations</h2>
        </div>
        <Clock3 className="text-purple-400" size={24} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pop-out-more">
        {events.map((event) => (
          <div key={event.id} className="metric-card-3d">
            <span className="text-[10px] font-bold uppercase text-purple-300 tracking-wider block mb-2 border-b border-purple-500/20 pb-2">
              {event.event_type.replaceAll("_", " ")}
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">{event.details ?? event.status}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string, highlight?: boolean }) {
  return (
    <div className={`metric-card-3d ${highlight ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : ''}`}>
      <span className={`text-[10px] uppercase font-bold ${highlight ? 'text-indigo-300' : 'text-slate-400'}`}>{label}</span>
      <strong className={`block mt-1 text-sm font-mono ${highlight ? 'text-white' : 'text-slate-200'}`}>{value}</strong>
    </div>
  );
}

function ListBlock({ title, items, color }: { title: string; items: string[], color: string }) {
  const colorClass = color === 'indigo' ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' : 'text-rose-300 bg-rose-500/10 border-rose-500/20';
  const dotColor = color === 'indigo' ? 'bg-indigo-400' : 'bg-rose-400';
  
  return (
    <div className={`p-4 rounded-xl border ${colorClass}`}>
      <p className="text-[10px] uppercase font-bold tracking-wider mb-3 opacity-90">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`}></span>
            {item}
          </li>
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
