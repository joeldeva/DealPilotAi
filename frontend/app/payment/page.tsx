"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard, Crown, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { FREE_SCAN_LIMIT, readPaidAccess, readScanUsage, writePaidAccess } from "../../lib/billing";

const plans = [
  {
    id: "free",
    name: "Free Trial",
    price: "INR 0",
    subtitle: "For trying DealPilot",
    badge: "Included",
    features: ["3 marketplace scans", "Deal score and risk signals", "Negotiation draft", "Local search history"],
  },
  {
    id: "deal-pack",
    name: "Deal Pack",
    price: "INR 199",
    subtitle: "25 standard scans + 5 deep scans",
    badge: "Best for buyers",
    features: ["Multi-source marketplace scan", "Market benchmark wheel", "Duplicate listing watch", "Product-specific safety checklist", "Ethical negotiation strategy"],
  },
  {
    id: "pro",
    name: "DealPilot Pro",
    price: "INR 499/mo",
    subtitle: "For frequent second-hand buyers",
    badge: "Power user",
    features: ["150 scans per month", "Deep Scan priority workflow", "Gemini-enhanced wording when enabled", "Saved deal reports", "Future alerts and watchlists"],
  },
];

export default function PaymentPage() {
  const [scansUsed, setScansUsed] = useState(0);
  const [activePlan, setActivePlan] = useState<string | null>(null);

  useEffect(() => {
    setScansUsed(readScanUsage());
    setActivePlan(readPaidAccess()?.plan ?? null);
  }, []);

  function unlockPlan(plan: string) {
    writePaidAccess(plan);
    setActivePlan(plan);
    window.setTimeout(() => {
      window.location.href = "/";
    }, 350);
  }

  const scansRemaining = Math.max(0, FREE_SCAN_LIMIT - scansUsed);

  return (
    <main className="min-h-screen text-slate-200">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="glass-panel-3d p-5 md:p-8">
          <nav className="mb-8 flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-white/10">
              <ArrowLeft size={16} />
              Back to agent
            </Link>
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-purple-200">
              Checkout prototype
            </span>
          </nav>

          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-purple-300">DealPilot pricing</p>
            <h1 className="text-4xl font-light leading-tight tracking-tight text-white md:text-6xl">
              3 scans free, then <span className="font-bold text-gradient-vibrant">pay only when useful</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
              Start with free deal intelligence, then unlock deeper multi-source scans for serious second-hand purchases.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            <StatusTile icon={Sparkles} label="Free scans left" value={`${scansRemaining}/${FREE_SCAN_LIMIT}`} />
            <StatusTile icon={ShieldCheck} label="Current access" value={activePlan ?? "Trial"} />
            <StatusTile icon={CreditCard} label="Gateway" value="Razorpay/Stripe ready" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const isPaid = plan.id !== "free";
            const isActive = activePlan === plan.name || (!activePlan && plan.id === "free");
            return (
              <article key={plan.id} className={`glass-panel-3d flex flex-col p-5 md:p-7 ${plan.id === "deal-pack" ? "border-purple-500/40" : ""}`}>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <span className="mb-3 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-200">
                      {plan.badge}
                    </span>
                    <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
                    <p className="mt-2 text-sm text-slate-400">{plan.subtitle}</p>
                  </div>
                  {plan.id === "deal-pack" ? <Crown className="text-purple-300" size={26} /> : <Zap className="text-indigo-300" size={24} />}
                </div>

                <div className="mb-6">
                  <div className="text-4xl font-black text-white">{plan.price}</div>
                  <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">{isPaid ? "one-click unlock for demo" : "trial included"}</p>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                      <CheckCircle2 className="mt-0.5 flex-shrink-0 text-emerald-300" size={17} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isPaid ? (
                  <button className="btn-3d mt-auto px-5 py-4 text-sm" onClick={() => unlockPlan(plan.name)}>
                    <CreditCard size={18} />
                    {isActive ? "Plan active" : `Unlock ${plan.name}`}
                  </button>
                ) : (
                  <Link href="/" className="chip-3d mt-auto inline-flex items-center justify-center gap-2 px-5 py-4 text-sm font-bold text-slate-200 hover:text-white">
                    Continue free
                  </Link>
                )}
              </article>
            );
          })}
        </section>

        <section className="glass-panel-3d p-5 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-cyan-300">Production payment path</p>
              <h2 className="text-2xl font-bold text-white">Ready for Razorpay or Stripe checkout</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                This hackathon page models the pricing and entitlement flow without storing card details. In production,
                the unlock button would create a Razorpay or Stripe checkout session, then the backend would store scan
                credits against a user account.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-bold text-white">Recommended monetization</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Free users get 3 scans. Casual buyers can buy a low-cost scan pack. Frequent buyers upgrade to Pro for
                deeper scans, saved reports, and future watchlist alerts.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusTile({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
      <Icon className="mb-3 text-purple-300" size={22} />
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
