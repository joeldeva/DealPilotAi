import { CheckCircle2, CircleDashed, MessageSquareText, Search, ShieldAlert, SlidersHorizontal, Trophy } from "lucide-react";
import type { AgentTraceStep, WorkflowEvent } from "../lib/types";

const defaultSteps = [
  { step: "Marketplace Search", label: "Research", icon: Search },
  { step: "Deal Analysis", label: "Analyze", icon: SlidersHorizontal },
  { step: "Scam Risk Detection", label: "Detect Risk", icon: ShieldAlert },
  { step: "Decision Ranking", label: "Rank", icon: Trophy },
  { step: "Negotiation Strategy", label: "Negotiate", icon: MessageSquareText },
];

const visibleEventTypes = [
  "MARKETPLACE_SEARCH_COMPLETED",
  "DEAL_ANALYSIS_COMPLETED",
  "SCAM_RISK_DETECTION_COMPLETED",
  "DECISION_RANKING_COMPLETED",
  "NEGOTIATION_GENERATED",
];

export function DemoTimeline({
  trace,
  events,
  loading,
}: {
  trace?: AgentTraceStep[];
  events?: WorkflowEvent[];
  loading: boolean;
}) {
  const visibleEvents = events?.filter((event) => visibleEventTypes.includes(event.event_type)).slice(-5) ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.08] p-3">
        <p className="text-sm font-semibold text-emerald-100">Superplane-ready local workflow trace</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Event-driven flow is simulated locally. No Superplane service or API is called.
        </p>
      </div>

      {visibleEvents.length ? (
        visibleEvents.map((event) => (
          <div key={event.id} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-300 text-slate-950">
              <CheckCircle2 size={17} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{event.event_type.replaceAll("_", " ")}</p>
                <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] text-slate-300">
                  {event.status}
                </span>
                <span className="text-xs text-slate-500">{formatTime(event.timestamp)}</span>
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-400">{event.details ?? "Workflow event recorded."}</p>
            </div>
          </div>
        ))
      ) : (
        defaultSteps.map((item) => {
          const traceItem = trace?.find((entry) => entry.step === item.step);
          const Icon = item.icon;
          const completed = Boolean(traceItem);
          return (
            <div key={item.step} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
              <div
                className={
                  completed
                    ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-300 text-slate-950"
                    : "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-slate-400"
                }
              >
                {loading && !completed ? <CircleDashed className="animate-spin" size={17} /> : <Icon size={17} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-sm leading-5 text-slate-400">{traceItem?.details ?? "Waiting for agent run."}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
