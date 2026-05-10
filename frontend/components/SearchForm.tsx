"use client";

import { Loader2, Play, Radar, Search } from "lucide-react";

type SearchFormProps = {
  goal: string;
  demoGoals: string[];
  loading: boolean;
  onGoalChange: (goal: string) => void;
  onSubmit: () => void;
  onDeepScan: () => void;
  onQuickRun: (goal: string) => void;
};

const chipLabels = ["iPhone 14 / INR 45k", "PS5 / INR 35k", "MacBook / INR 60k"];

export function SearchForm({
  goal,
  demoGoals,
  loading,
  onGoalChange,
  onSubmit,
  onDeepScan,
  onQuickRun,
}: SearchFormProps) {
  return (
    <div className="mx-auto mb-4 mt-6 w-full max-w-4xl">
      <form
        className="flex flex-col items-stretch gap-4 md:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-colors hover:border-indigo-500/50 focus-within:border-indigo-400 focus-within:bg-white/10">
          <Search size={20} className="flex-shrink-0 text-indigo-400" />
          <input
            value={goal}
            onChange={(event) => onGoalChange(event.target.value)}
            className="w-full bg-transparent border-none outline-none text-white text-base placeholder:text-slate-500"
            placeholder="Search any deal goal, for example: used iPhone 14 under INR 45k"
          />
        </div>
        <button className="btn-3d w-full px-8 py-4 text-base shadow-2xl md:w-auto" type="submit" disabled={loading || !goal.trim()}>
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} className="fill-current" />}
          {loading ? "Analyzing..." : "Run Agent"}
        </button>
        <button
          className="chip-3d inline-flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-bold text-purple-100 md:w-auto"
          type="button"
          disabled={loading || !goal.trim()}
          onClick={onDeepScan}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Radar size={18} />}
          Deep Scan
        </button>
      </form>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {demoGoals.map((item, index) => (
          <button
            key={item}
            type="button"
            onClick={() => onQuickRun(item)}
            disabled={loading}
            className="chip-3d px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
          >
            {chipLabels[index] ?? item}
          </button>
        ))}
      </div>
    </div>
  );
}
