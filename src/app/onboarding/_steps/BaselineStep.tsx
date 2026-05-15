"use client";

import { cn } from "@/lib/utils";

export function BaselineStep({
  prompt,
  yesLabel,
  noLabel,
  has,
  onPickHas,
  score,
  onScoreChange,
}: {
  prompt: string;
  yesLabel: string;
  noLabel: string;
  has: "" | "yes" | "no";
  onPickHas: (v: "yes" | "no") => void;
  score: number;
  onScoreChange: (n: number) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{prompt}</h2>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onPickHas("no")}
          className={cn(
            "rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all",
            has === "no"
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
          )}
        >
          {noLabel}
        </button>
        <button
          type="button"
          onClick={() => onPickHas("yes")}
          className={cn(
            "rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all",
            has === "yes"
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
          )}
        >
          {yesLabel}
        </button>
      </div>
      {has === "yes" && (
        <div className="mt-8">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Most recent total
          </p>
          <div className="mb-3 text-center text-5xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {score}
          </div>
          <input
            type="range"
            min={400}
            max={1600}
            step={10}
            value={score}
            onChange={(e) => onScoreChange(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="mt-2 flex justify-between text-xs tabular-nums text-slate-400">
            <span>400</span>
            <span>800</span>
            <span>1200</span>
            <span>1600</span>
          </div>
        </div>
      )}
    </div>
  );
}
