"use client";

import { cn } from "@/lib/utils";
import { Label } from "./shared";

export interface SatDateOption {
  iso: string;
  label: string;
}

export function SatScheduleStep(props: {
  satDates: SatDateOption[];
  satTestDate: string;
  setSatTestDate: (v: string) => void;
  goalSatScore: number;
  setGoalSatScore: (v: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Which SAT date are you registered for?</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {props.satDates.map((d) => (
            <button
              key={d.iso}
              type="button"
              onClick={() => props.setSatTestDate(d.iso)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                props.satTestDate === d.iso
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>What&apos;s your goal score?</Label>
        <div className="mb-1 text-center text-3xl font-extrabold text-white">
          {props.goalSatScore}
        </div>
        <input
          type="range"
          min={400}
          max={1600}
          step={10}
          value={props.goalSatScore}
          onChange={(e) => props.setGoalSatScore(Number(e.target.value))}
          className="w-full accent-blue-400"
        />
        <div className="mt-1 flex justify-between text-[11px] text-slate-500">
          <span>400</span>
          <span>1600</span>
        </div>
      </div>
    </div>
  );
}
