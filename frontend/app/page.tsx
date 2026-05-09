"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Database, Fingerprint, LockKeyhole, Route, ShieldCheck, Sparkles } from "lucide-react";
import { DealCard } from "../components/DealCard";
import { DemoTimeline } from "../components/DemoTimeline";
import { SearchForm } from "../components/SearchForm";
import { SponsorBadges } from "../components/SponsorBadges";
import { fetchHostedStatus, fetchReports, fetchSuperplaneCanvas, runFullDemo } from "../lib/api";
import type { DealReportSummary, FullRunResponse, HostedStatus, SuperplaneCanvas } from "../lib/types";

const demoGoals = [
  "Find me a used iPhone 14 under INR 45000",
  "Find me a used PS5 under INR 35000",
  "Find me a used MacBook under INR 60000",
];

export default function Home() {
  const [goal, setGoal] = useState(demoGoals[0]);
  const [result, setResult] = useState<FullRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useLiveApify, setUseLiveApify] = useState(false);
  const [confirmLiveRun, setConfirmLiveRun] = useState(false);
  const [maxItems, setMaxItems] = useState(10);
  const [useLiveLlm, setUseLiveLlm] = useState(false);
  const [confirmLiveLlm, setConfirmLiveLlm] = useState(false);
  const [reports, setReports] = useState<DealReportSummary[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [superplaneCanvas, setSuperplaneCanvas] = useState<SuperplaneCanvas | null>(null);
  const [hostedStatus, setHostedStatus] = useState<HostedStatus | null>(null);

  async function handleRun(nextGoal = goal) {
    setGoal(nextGoal);
    setLoading(true);
    setError(null);
    try {
      const response = await runFullDemo({
        user_goal: nextGoal,
        use_live_apify: useLiveApify,
        confirm_live_run: useLiveApify && confirmLiveRun,
        max_items: Math.min(Math.max(maxItems, 1), 20),
        use_live_llm: useLiveLlm,
        confirm_live_llm: useLiveLlm && confirmLiveLlm,
        save_report: true,
      });
      setResult(response);
      void refreshReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo run failed. Confirm the backend is running on port 8000.");
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

  useEffect(() => {
    void refreshReports();
    void fetchSuperplaneCanvas()
      .then(setSuperplaneCanvas)
      .catch(() => setSuperplaneCanvas(null));
    void fetchHostedStatus()
      .then(setHostedStatus)
      .catch(() => setHostedStatus(null));
  }, []);

  const topDeal = useMemo(() => result?.best_recommendation ?? result?.ranked_results?.[0], [result]);

  return (
    <main className="min-h-screen overflow-hidden">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/20">
              <Bot size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">Bot-a-thon finalist demo</p>
              <h1 className="text-xl font-semibold text-white">DealPilot AI</h1>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-100">
            <LockKeyhole size={15} />
            Mock-safe mode. No credits consumed.
          </div>
        </nav>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel rounded-lg p-6 sm:p-8 lg:p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-sm font-medium text-amber-100">
              <Sparkles size={16} />
              Autonomous Deal Intelligence & Negotiation Agent
            </div>
            <h2 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl">
              DealPilot AI
            </h2>
            <p className="mt-4 text-xl font-medium text-emerald-100">
              Autonomous Deal Intelligence & Negotiation Agent
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
              Researches listings, detects risk, ranks deals, and drafts ethical negotiation messages for second-hand marketplace purchases.
            </p>

            <div className="mt-8">
              <SearchForm
                goal={goal}
                demoGoals={demoGoals}
                loading={loading}
                onGoalChange={setGoal}
                onSubmit={() => handleRun(goal)}
                onQuickRun={handleRun}
              />
            </div>
          </div>

          <aside className="glass-panel rounded-lg p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Agent workflow</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Research - Analyze - Detect Risk - Rank - Negotiate</h3>
              </div>
              <ShieldCheck className="shrink-0 text-emerald-300" size={24} />
            </div>
            <DemoTimeline trace={result?.agent_trace} events={result?.workflow_events} loading={loading} />
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.92fr]">
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

        <SponsorBadges />

        <HostedProofPanel status={hostedStatus} />

        <RecentReportsPanel
          reports={reports}
          reportsLoaded={reportsLoaded}
          onRefresh={refreshReports}
        />

        {error ? (
          <div className="glass-panel flex items-center gap-3 rounded-lg border-red-300/20 p-4 text-red-100">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? <LoadingPanel /> : null}

        <section className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          <BestRecommendationCard result={result} topDeal={topDeal} />

          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200/70">Ranked listings</p>
                <h3 className="mt-1 text-2xl font-semibold text-white">
                  {result ? `${result.listings_analyzed} listings analyzed` : "Ready for mock analysis"}
                </h3>
              </div>
              <SourcePill source={result?.data_source ?? "mock_fallback"} />
            </div>

            {result?.ranked_results?.length ? (
              <div className="grid gap-4">
                {result.ranked_results.map((deal) => (
                  <DealCard key={deal.listing.id} deal={deal} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <AgentIdentityPanel />
          <WorkflowReadyPanel eventCount={result?.workflow_events?.length ?? 0} canvas={superplaneCanvas} />
        </section>
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
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-emerald-200" />
          <h3 className="font-semibold text-white">Data and AI mode</h3>
        </div>
        <SourcePill source={dataSource} />
      </div>
      <p className="mb-4 text-sm leading-6 text-emerald-100">
        Mock-safe mode is selected by default. Live Apify and Gemini require separate confirmations before the backend can attempt them.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <ToggleBox
          checked={useLiveApify}
          onChange={(value) => {
            onUseLiveApifyChange(value);
            if (!value) onConfirmLiveRunChange(false);
          }}
          title="Use live Apify data"
          detail="Off by default. Requires backend live mode and manual confirmation."
        />
        <ToggleBox
          checked={confirmLiveRun}
          disabled={!useLiveApify}
          onChange={onConfirmLiveRunChange}
          title="I understand this may consume Apify credits"
          detail="Required before any live marketplace run."
        />
        <ToggleBox
          checked={useLiveLlm}
          onChange={(value) => {
            onUseLiveLlmChange(value);
            if (!value) onConfirmLiveLlmChange(false);
          }}
          title="Enhance with Gemini"
          detail="Off by default. Deterministic fallback always works."
        />
        <ToggleBox
          checked={confirmLiveLlm}
          disabled={!useLiveLlm}
          onChange={onConfirmLiveLlmChange}
          title="I understand this may use LLM API quota"
          detail={`Required before Gemini can run. Current llm_called=${String(llmCalled)}.`}
        />
      </div>
      <label className="mt-3 block rounded-lg border border-white/10 bg-white/[0.045] p-3">
        <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Max Apify items</span>
        <input
          type="number"
          min={1}
          max={20}
          value={maxItems}
          onChange={(event) => onMaxItemsChange(Math.min(Math.max(Number(event.target.value) || 1, 1), 20))}
          className="mt-1 w-full bg-transparent text-lg font-semibold text-white outline-none"
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
    <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-emerald-300 disabled:opacity-40"
      />
      <span>
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="text-xs leading-5 text-slate-400">{detail}</span>
      </span>
    </label>
  );
}

function CreditSafetyPanel({ result, maxItems }: { result: FullRunResponse | null; maxItems: number }) {
  const safety = result?.credit_safety;
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2">
        <LockKeyhole size={18} className="text-emerald-200" />
        <h3 className="font-semibold text-white">Credit safety</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SafetyItem label="Apify called" value={safety?.apify_called ?? false} />
        <SafetyItem label="Apify cache used" value={safety?.apify_cache_used ?? false} />
        <SafetyItem label="LLM called" value={safety?.llm_called ?? false} />
        <SafetyItem label="Zynd called" value={safety?.zynd_called ?? false} />
        <SafetyItem label="Superplane called" value={safety?.superplane_called ?? false} />
        <Metric label="Items used" value={String(safety?.max_items_used ?? maxItems)} />
      </div>
      <div className="mt-3">
        <SourcePill source={result?.data_source ?? "mock_fallback"} />
      </div>
      {result?.report_id ? (
        <p className="mt-3 text-xs leading-5 text-slate-400">
          Saved report: <span className="text-slate-200">{result.report_id}</span>
        </p>
      ) : null}
    </section>
  );
}

function HostedProofPanel({ status }: { status: HostedStatus | null }) {
  const backendOnline = status?.health.status === "ok";
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Hosted demo proof</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Integration readiness visible to judges</h3>
        </div>
        <span className={backendOnline ? "rounded-full bg-emerald-300/10 px-3 py-1 text-sm font-semibold text-emerald-100" : "rounded-full bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-100"}>
          Backend {backendOnline ? "online" : "checking"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <ProofTile
          title="Apify"
          value={status ? `live=${String(status.apify.apify_live_mode)}` : "loading"}
          detail={status ? `token=${String(status.apify.token_configured)}, cache=${String(status.apify.cache_enabled)}` : "Marketplace adapter status"}
        />
        <ProofTile
          title="Gemini"
          value={status ? `live=${String(status.gemini.gemini_live_mode)}` : "loading"}
          detail={status ? `key=${String(status.gemini.api_key_configured)}, mode=${status.gemini.mode}` : "Optional LLM status"}
        />
        <ProofTile
          title="Zynd AI"
          value={status ? status.zynd.mode : "loading"}
          detail={status ? `called=${String(status.zynd.zynd_called)}, card=active` : "Agent identity status"}
        />
        <ProofTile
          title="Superplane"
          value={status ? status.superplane.mode : "loading"}
          detail={status ? `called=${String(status.superplane.superplane_called)}, steps=${status.canvas.components.length}` : "Workflow canvas status"}
        />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">
        This panel reads public backend status endpoints only. It proves the hosted demo is connected while keeping all paid/live integrations off by default.
      </p>
    </section>
  );
}

function ProofTile({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
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
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Product mode foundation</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Saved deal reports</h3>
        </div>
        <button
          onClick={onRefresh}
          className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-200/40 hover:bg-emerald-200/10"
        >
          Refresh
        </button>
      </div>
      <p className="mb-4 text-sm leading-6 text-slate-300">
        Every full run is now stored locally as a deal report. This is the first production step toward saved searches, user history, and watchlists.
      </p>
      {reports.length ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <div key={report.report_id} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  {report.target_model}
                </span>
                <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs text-slate-300">
                  {report.data_source}
                </span>
              </div>
              <p className="line-clamp-2 text-sm font-semibold text-white">{report.best_listing_title ?? report.user_goal}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Metric label="Deal" value={report.best_deal_score ? `${report.best_deal_score}/100` : "N/A"} />
                <Metric label="Risk" value={report.best_risk_level ?? "N/A"} />
              </div>
              <p className="mt-3 text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-400">
          {reportsLoaded ? "No saved reports yet. Run the agent once to create one." : "Reports load after the first refresh or agent run."}
        </div>
      )}
    </section>
  );
}

function BestRecommendationCard({
  result,
  topDeal,
}: {
  result: FullRunResponse | null;
  topDeal: FullRunResponse["best_recommendation"] | undefined;
}) {
  return (
    <section className="glass-panel h-fit rounded-lg p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Best recommendation</p>
      {topDeal ? (
        <div className="mt-5 space-y-5">
          <div>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
              {topDeal.ranking.recommendation_label}
            </span>
            <h3 className="mt-3 text-2xl font-semibold text-white">{topDeal.listing.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{topDeal.deal_analysis.reasoning}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Deal score" value={`${topDeal.deal_analysis.deal_score}/100`} />
            <Metric label="Risk" value={topDeal.risk_analysis.risk_level} />
            <Metric label="Fair price" value={formatInr(topDeal.deal_analysis.fair_price_estimate)} />
            <Metric label="Target" value={formatInr(topDeal.negotiation.target_price)} />
          </div>
          {result?.parsed_intent ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Parsed buyer intent</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{result.parsed_intent.parsed_summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <IntentPill label={`Model: ${result.parsed_intent.target_model}`} />
                <IntentPill label={`Budget: ${result.parsed_intent.max_budget ? formatInr(result.parsed_intent.max_budget) : "not set"}`} />
                <IntentPill label={`Urgency: ${result.parsed_intent.urgency_level}`} />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-white/15 p-6 text-sm leading-6 text-slate-300">
          Run a mock demo to see the top listing, risk posture, fair price, and negotiation target.
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="glass-panel rounded-lg p-8 text-slate-300">
      <p className="text-lg font-semibold text-white">No run yet</p>
      <p className="mt-2 max-w-2xl text-sm leading-6">
        Choose a quick demo or enter a buying goal. The app will use local mock listings and deterministic agents by default.
      </p>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="glass-panel flex items-center gap-3 rounded-lg p-4 text-emerald-100">
      <Sparkles className="animate-pulse" size={20} />
      <span>Agent is researching, scoring, checking risk, ranking, and drafting negotiation messages...</span>
    </div>
  );
}

function SafetyItem({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="metric-card rounded-lg p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={value ? "mt-1 font-semibold text-red-200" : "mt-1 font-semibold text-emerald-200"}>
        {String(value)}
      </p>
    </div>
  );
}

function AgentIdentityPanel() {
  const capabilities = ["marketplace_search", "deal_analysis", "scam_risk_detection", "decision_ranking", "negotiation_strategy"];
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-emerald-200">
          <Fingerprint size={21} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Agent identity</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Zynd AI: local agent card active</h3>
          <p className="mt-1 text-sm text-slate-300">No Zynd API call made. Discoverability metadata is served locally.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {capabilities.map((capability) => (
          <span key={capability} className="rounded-full bg-white/[0.08] px-3 py-1 text-xs text-slate-300">
            {capability.replaceAll("_", " ")}
          </span>
        ))}
      </div>
    </section>
  );
}

function WorkflowReadyPanel({ eventCount, canvas }: { eventCount: number; canvas: SuperplaneCanvas | null }) {
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-amber-100">
          <Route size={21} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Workflow readiness</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Superplane-ready event trace</h3>
          <p className="mt-1 text-sm text-slate-300">
            Local canvas export mode. {eventCount} workflow events available after the latest run.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Canvas steps" value={String(canvas?.components.length ?? 0)} />
        <Metric label="Superplane called" value={String(canvas?.superplane_called ?? false)} />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        {canvas?.description ?? "Canvas metadata loads from the local backend only."}
      </p>
    </section>
  );
}

function SourcePill({ source }: { source: FullRunResponse["data_source"] }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-medium text-slate-300">
      Source: {sourceLabel(source)}
    </span>
  );
}

function sourceLabel(source: FullRunResponse["data_source"]) {
  if (source === "apify_live") return "Apify live";
  if (source === "apify_cache") return "Apify cache";
  return "Mock fallback";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card rounded-lg p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function IntentPill({ label }: { label: string }) {
  return <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs text-slate-300">{label}</span>;
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
