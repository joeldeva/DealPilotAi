import { MessageSquareQuote } from "lucide-react";
import type { NegotiationDraft } from "../lib/types";

type NegotiationPanelProps = {
  negotiation: NegotiationDraft;
};

export function NegotiationPanel({ negotiation }: NegotiationPanelProps) {
  return (
    <div className="rounded border border-violet-300/20 bg-violet-500/[0.08] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-violet-100">
          <MessageSquareQuote size={18} />
          <h4 className="zynd-wordmark font-semibold">Negotiation strategy</h4>
        </div>
        <span className="rounded bg-black/30 px-3 py-1 text-xs text-violet-100">
          Target {formatInr(negotiation.target_price)}
        </span>
      </div>

      <div className="rounded border border-violet-400/15 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Opening message</p>
        <p className="mt-2 text-sm leading-6 text-slate-100">{negotiation.opening_message}</p>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <InfoBlock title="Follow-up" text={negotiation.followup_message} />
        <InfoBlock title="Counter strategy" text={negotiation.counter_offer_strategy} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <ListBlock title="Questions to ask seller" items={negotiation.questions_to_ask_seller.slice(0, 5)} />
        <ListBlock title="Walkaway conditions" items={negotiation.walkaway_conditions.slice(0, 5)} />
      </div>
    </div>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded border border-violet-400/15 bg-white/[0.035] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-300">{text}</p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded border border-violet-400/15 bg-white/[0.035] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item} className="leading-5">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
