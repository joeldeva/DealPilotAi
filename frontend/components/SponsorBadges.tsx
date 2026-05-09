import { Bot, Github, Network, Route } from "lucide-react";

const badges = [
  { label: "Apify", detail: "Marketplace intelligence", icon: Network },
  { label: "Zynd AI", detail: "Agent identity + service wrapper", icon: Bot },
  { label: "Superplane", detail: "Workflow readiness", icon: Route },
  { label: "GitHub Copilot", detail: "Development acceleration", icon: Github },
];

export function SponsorBadges() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <div key={badge.label} className="glass-panel rounded p-4 transition hover:border-violet-300/50 hover:bg-violet-500/[0.08]">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-violet-500/15 text-violet-100 ring-1 ring-violet-300/20">
              <Icon size={20} />
            </div>
            <p className="zynd-wordmark font-semibold text-white">{badge.label}</p>
            <p className="mt-1 text-sm text-slate-400">{badge.detail}</p>
          </div>
        );
      })}
    </section>
  );
}
