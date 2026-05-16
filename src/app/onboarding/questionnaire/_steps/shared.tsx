"use client";

import { cn } from "@/lib/utils";

export const COMMON_TZ = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
      {children}
    </label>
  );
}

export function YesNoChoice({
  value,
  onChange,
}: {
  value: "yes" | "no" | "";
  onChange: (v: "yes" | "no" | "") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["yes", "no"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors",
            value === opt
              ? "border-blue-500 bg-blue-500 text-white"
              : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
