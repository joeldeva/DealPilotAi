"use client";

import { Loader2, Play, Search } from "lucide-react";

type SearchFormProps = {
  goal: string;
  demoGoals: string[];
  loading: boolean;
  onGoalChange: (goal: string) => void;
  onSubmit: () => void;
  onQuickRun: (goal: string) => void;
};

const chipLabels = ["Used iPhone 14 under INR 45,000", "Used PS5 under INR 35,000", "Used MacBook under INR 60,000"];

export function SearchForm({
  goal,
  demoGoals,
  loading,
  onGoalChange,
  onSubmit,
  onQuickRun,
}: SearchFormProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-white/[0.06] p-2 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-2 md:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-md bg-black/25 px-4 py-3 ring-1 ring-white/10">
            <Search className="shrink-0 text-emerald-200" size={20} />
            <input
              value={goal}
              onChange={(event) => onGoalChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSubmit();
              }}
              className="w-full bg-transparent text-base font-medium text-white outline-none placeholder:text-slate-500"
              placeholder="Find me a used iPhone 14 under INR 45000"
            />
          </label>
          <button
            onClick={onSubmit}
            disabled={loading || !goal.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
            Run Agent
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {demoGoals.map((item, index) => (
          <button
            key={item}
            onClick={() => onQuickRun(item)}
            disabled={loading}
            className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-200/50 hover:bg-emerald-200/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {chipLabels[index] ?? item}
          </button>
        ))}
      </div>
    </div>
  );
}
