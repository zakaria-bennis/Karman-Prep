"use client";

import { CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Real Digital SAT US administration dates (2026).
// Including the "not registered yet" escape hatch — many students
// haven't picked a date when they start prep.
const SAT_DATES = [
  { iso: "not_registered", label: "Not registered yet" },
  { iso: "2026-05-02", label: "May 2, 2026" },
  { iso: "2026-06-06", label: "Jun 6, 2026" },
  { iso: "2026-08-22", label: "Aug 22, 2026" },
  { iso: "2026-09-12", label: "Sep 12, 2026" },
  { iso: "2026-10-03", label: "Oct 3, 2026" },
  { iso: "2026-11-07", label: "Nov 7, 2026" },
  { iso: "2026-12-05", label: "Dec 5, 2026" },
];

export function SatStep({
  prompt,
  value,
  onChange,
}: {
  prompt: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="inline-flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white">
        <CalendarCheck className="h-5 w-5 text-blue-400" /> {prompt}
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Pick the closest official Digital SAT date — or let us know if you haven&apos;t registered
        yet.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SAT_DATES.map((d) => {
          const isNotRegistered = d.iso === "not_registered";
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => onChange(d.iso)}
              className={cn(
                "rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all",
                isNotRegistered && "italic sm:col-span-2",
                value === d.iso
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
              )}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
