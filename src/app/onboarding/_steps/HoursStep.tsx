"use client";

import { Clock } from "lucide-react";

export function HoursStep({
  prompt,
  value,
  onChange,
}: {
  prompt: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <h2 className="inline-flex items-center gap-2 text-2xl font-extrabold text-ivory dark:text-ivory">
        <Clock className="h-5 w-5 text-info" /> {prompt}
      </h2>
      <p className="mt-2 text-sm text-taupe dark:text-taupe">
        Honest answer beats optimistic — we use this to size the recommendation.
      </p>
      <div className="mt-8">
        <div className="mb-1 text-center text-5xl font-extrabold tabular-nums text-ivory dark:text-ivory">
          {value}
        </div>
        <p className="mb-3 text-center text-xs text-taupe dark:text-taupe">
          {value === 1 ? "hour" : "hours"} per week
        </p>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-info"
        />
        <div className="mt-2 flex justify-between text-xs text-taupe">
          <span>1h</span>
          <span>10h</span>
          <span>20h</span>
        </div>
      </div>
    </div>
  );
}
