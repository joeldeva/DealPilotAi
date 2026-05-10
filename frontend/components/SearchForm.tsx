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

const chipLabels = ["iPhone 14 / INR 45k", "PS5 / INR 35k", "MacBook / INR 60k"];

export function SearchForm({
  goal,
  demoGoals,
  loading,
  onGoalChange,
  onSubmit,
  onQuickRun,
}: SearchFormProps) {
  return (
    <div className="max-w-4xl mx-auto w-full mt-8 mb-12 perspective-container">
      <form
        className="flex flex-col md:flex-row items-stretch gap-4 preserve-3d"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="search-input-wrapper flex-1 flex items-center gap-3 bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-2xl px-5 py-4 focus-within:border-indigo-400 focus-within:bg-white/10 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <Search size={20} className="text-indigo-400 floating-icon flex-shrink-0" />
          <input
            value={goal}
            onChange={(event) => onGoalChange(event.target.value)}
            className="w-full bg-transparent border-none outline-none text-white text-base placeholder:text-slate-500"
            placeholder="Search any deal goal, for example: used iPhone 14 under INR 45k"
          />
        </div>
        <button className="btn-3d md:w-auto w-full py-4 px-8 text-base shadow-2xl" type="submit" disabled={loading || !goal.trim()}>
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} className="fill-current" />}
          {loading ? "Analyzing..." : "Run Agent"}
        </button>
      </form>

      <div className="flex flex-wrap justify-center gap-3 mt-6 preserve-3d">
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
