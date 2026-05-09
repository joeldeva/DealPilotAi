import { BadgeCheck, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { NegotiationPanel } from "./NegotiationPanel";
import { RiskBadge } from "./RiskBadge";
import type { RankedDeal } from "../lib/types";

type DealCardProps = {
  deal: RankedDeal;
};

export function DealCard({ deal }: DealCardProps) {
  const { listing, deal_analysis, risk_analysis, ranking, negotiation } = deal;
  const listingHref = listing.listing_url?.trim();
  const canOpenListing = Boolean(listingHref && listingHref !== "#");

  return (
    <article className="glass-panel rounded p-4">
      <div className="grid gap-5 xl:grid-cols-[12rem_1fr]">
        <a
          href={canOpenListing ? listingHref : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!canOpenListing}
          className={`min-h-44 rounded ${gradientClass(listing.image_url)} p-4 ring-1 ring-white/10 transition ${
            canOpenListing ? "cursor-pointer hover:scale-[1.01] hover:ring-violet-200/70" : "cursor-default"
          }`}
        >
          <div className="flex h-full flex-col justify-between">
            <span className="w-fit rounded bg-black/[0.38] px-3 py-1 text-xs font-semibold text-white/90">
              {listing.data_source}
            </span>
            <div>
              <p className="text-sm text-white/75">{listing.condition}</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{listing.product_key.toUpperCase()}</h3>
            </div>
          </div>
        </a>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="rounded border border-violet-300/25 bg-violet-300/10 px-3 py-1 text-xs font-bold text-violet-100">
                  #{ranking.rank} {ranking.recommendation_label}
                </span>
                <RiskBadge level={risk_analysis.risk_level} />
              </div>
              {canOpenListing ? (
                <a
                  href={listingHref}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-start gap-2 text-xl font-semibold text-white transition hover:text-violet-100"
                >
                  <span>{listing.title}</span>
                  <ExternalLink className="mt-1 shrink-0 opacity-60 transition group-hover:opacity-100" size={17} />
                </a>
              ) : (
                <h3 className="text-xl font-semibold text-white">{listing.title}</h3>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={15} />
                  {listing.location}
                </span>
                <span>{listing.posted_time}</span>
                <span>Seller {listing.seller_rating ?? "N/A"}/5</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Listed price</p>
              <p className="text-2xl font-semibold text-white">{formatInr(listing.price)}</p>
              {canOpenListing ? (
                <a
                  href={listingHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 rounded border border-violet-300/25 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-100 transition hover:border-violet-200 hover:bg-violet-500/25"
                >
                  Open listing
                  <ExternalLink size={13} />
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            <Metric label="Deal" value={`${deal_analysis.deal_score}/100`} />
            <Metric label="Risk" value={`${risk_analysis.risk_score}/100`} />
            <Metric label="Final" value={`${ranking.final_score.toFixed(1)}`} />
            <Metric label="Fair price" value={formatInr(deal_analysis.fair_price_estimate)} />
            <Metric label="Target" value={formatInr(negotiation.target_price)} />
          </div>

          <div className="rounded border border-violet-400/15 bg-white/[0.035] p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-100">
              <BadgeCheck size={18} className="text-violet-300" />
              <h4 className="font-semibold">Why this rank</h4>
            </div>
            <p className="text-sm leading-6 text-slate-300">{deal_analysis.reasoning}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{ranking.ranking_reason}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Tag tone="green">{deal_analysis.price_position.replaceAll("_", " ")}</Tag>
              {deal_analysis.value_flags.slice(0, 5).map((flag) => (
                <Tag key={flag}>{flag.replaceAll("_", " ")}</Tag>
              ))}
              {risk_analysis.risk_flags.slice(0, 4).map((flag) => (
                <Tag key={flag} tone="fuchsia">
                  {flag.replaceAll("_", " ")}
                </Tag>
              ))}
            </div>
          </div>

          <div className="rounded border border-fuchsia-300/15 bg-fuchsia-300/[0.08] p-4">
            <div className="mb-2 flex items-center gap-2 text-fuchsia-100">
              <ShieldCheck size={18} />
              <h4 className="font-semibold">Safety advice</h4>
            </div>
            <p className="text-sm leading-6 text-slate-300">{risk_analysis.explanation}</p>
            <ul className="mt-2 grid gap-1.5 text-sm text-slate-300 sm:grid-cols-2">
              {risk_analysis.safety_advice.slice(0, 4).map((advice) => (
                <li key={advice}>{advice}</li>
              ))}
            </ul>
          </div>

          <NegotiationPanel negotiation={negotiation} />
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-violet-400/15 bg-black/[0.22] p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Tag({ children, tone = "slate" }: { children: string; tone?: "slate" | "green" | "fuchsia" }) {
  const className =
    tone === "green"
      ? "bg-violet-300/10 text-violet-100"
      : tone === "fuchsia"
        ? "bg-fuchsia-300/10 text-fuchsia-100"
        : "bg-white/[0.08] text-slate-300";
  return <span className={`rounded px-3 py-1 text-xs ${className}`}>{children}</span>;
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function gradientClass(imageUrl: string) {
  if (imageUrl.includes("risk-red")) return "bg-gradient-to-br from-red-500 via-rose-700 to-slate-950";
  if (imageUrl.includes("risk-orange")) return "bg-gradient-to-br from-orange-400 via-red-700 to-zinc-950";
  if (imageUrl.includes("risk-purple")) return "bg-gradient-to-br from-violet-500 via-fuchsia-800 to-zinc-950";
  if (imageUrl.includes("ps5")) return "bg-gradient-to-br from-slate-100 via-cyan-200 to-blue-800";
  if (imageUrl.includes("macbook")) return "bg-gradient-to-br from-zinc-200 via-stone-500 to-zinc-950";
  return "bg-gradient-to-br from-sky-400 via-violet-500 to-slate-950";
}
