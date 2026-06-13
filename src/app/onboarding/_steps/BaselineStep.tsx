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
      <h2 className="text-2xl font-extrabold text-ivory dark:text-ivory">{prompt}</h2>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onPickHas("no")}
          className={cn(
            "rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all",
            has === "no"
              ? "border-info/40 bg-info/10 text-info dark:bg-info/20 dark:text-info-bright"
              : "border-bronze bg-surface text-ivory hover:border-info/40 dark:border-bronze dark:bg-surface-raised/40 dark:text-ivory"
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
              ? "border-info/40 bg-info/10 text-info dark:bg-info/20 dark:text-info-bright"
              : "border-bronze bg-surface text-ivory hover:border-info/40 dark:border-bronze dark:bg-surface-raised/40 dark:text-ivory"
          )}
        >
          {yesLabel}
        </button>
      </div>
      {has === "yes" && (
        <div className="mt-8">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-taupe dark:text-taupe">
            Most recent total
          </p>
          <div className="mb-3 text-center text-5xl font-extrabold tabular-nums text-ivory dark:text-ivory">
            {score}
          </div>
          <input
            type="range"
            min={400}
            max={1600}
            step={10}
            value={score}
            onChange={(e) => onScoreChange(Number(e.target.value))}
            className="w-full accent-info"
          />
          <div className="mt-2 flex justify-between text-xs tabular-nums text-taupe">
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
