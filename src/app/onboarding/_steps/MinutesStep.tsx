"use client";

import { cn } from "@/lib/utils";

/** Minutes of practice a day, each with a plain name for how serious it is. Small options on purpose:
 *  Duolingo found that high goals put new learners off the habit. */
export const DAILY_MINUTES = [
  { minutes: 10, name: "Light" },
  { minutes: 20, name: "Steady" },
  { minutes: 30, name: "Serious" },
  { minutes: 45, name: "All in" },
] as const;

/** Hours a week for the plan recommendation: the daily minutes, seven days a week, rounded. */
export const hoursFromMinutes = (minutes: number) => Math.max(1, Math.round((minutes * 7) / 60));

export function MinutesStep({
  prompt,
  value,
  onChange,
}: {
  prompt: string;
  value: number | null;
  onChange: (minutes: number) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-ivory">{prompt}</h2>
      <div className="mt-6 space-y-2" role="radiogroup" aria-label={prompt}>
        {DAILY_MINUTES.map((o) => (
          <button
            key={o.minutes}
            type="button"
            role="radio"
            aria-checked={value === o.minutes}
            onClick={() => onChange(o.minutes)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left font-semibold transition-all active:scale-[.98]",
              value === o.minutes
                ? "border-info bg-info/15 text-info ring-2 ring-info/30 dark:bg-info/20 dark:text-info-bright"
                : "border-bronze bg-surface text-ivory hover:border-info/40 dark:bg-surface-raised/40"
            )}
          >
            <span className="text-base">{o.minutes} minutes a day</span>
            <span className="text-sm opacity-80">{o.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
