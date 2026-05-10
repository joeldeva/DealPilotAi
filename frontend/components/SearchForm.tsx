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
    <div className="dp-search-section">
      <form
        className="dp-search-wrap"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="dp-search-field">
          <Search size={18} />
          <input
            value={goal}
            onChange={(event) => onGoalChange(event.target.value)}
            className="dp-search"
            placeholder="Search any deal goal, for example used iPhone 14 under INR 45000"
          />
        </label>
        <button className="dp-run-btn" type="submit" disabled={loading || !goal.trim()}>
          {loading ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}
          Run agent
        </button>
      </form>

      <div className="dp-chips">
        {demoGoals.map((item, index) => (
          <button
            key={item}
            type="button"
            onClick={() => onQuickRun(item)}
            disabled={loading}
            className="dp-chip"
          >
            {chipLabels[index] ?? item}
          </button>
        ))}
      </div>
    </div>
  );
}
