"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENT_RING, fmtMoney } from "./format";

export function Kpi({
  label,
  value,
  icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span
          className={cn("flex h-5 w-5 items-center justify-center rounded-md", ACCENT_RING[accent])}
        >
          {icon}
        </span>
        {label}
      </p>
      <p className="text-xl font-extrabold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function MomentumCard({
  label,
  value,
  direction,
  color,
  hint,
}: {
  label: string;
  value: number;
  direction: "up" | "down";
  color: "emerald" | "rose" | "amber";
  hint?: string;
}) {
  const Arrow = direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div
        className={cn(
          "flex items-baseline gap-2",
          color === "emerald"
            ? "text-emerald-300"
            : color === "rose"
              ? "text-rose-300"
              : "text-amber-300"
        )}
      >
        <span className="text-2xl font-extrabold tabular-nums">{value}</span>
        <Arrow className="h-4 w-4" />
      </div>
      {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function ForecastTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums text-white">{fmtMoney(value)}</p>
    </div>
  );
}

export function StatusPill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={cn("rounded-lg border px-3 py-2.5 text-center", ACCENT_RING[color])}>
      <p className="text-2xl font-extrabold tabular-nums">{count}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
    </div>
  );
}

export function CohortCell({ active, total }: { active: number; total: number }) {
  const pct = total > 0 ? active / total : 0;
  // Color band: deep green when ≥80% retained, amber 50-80%, rose <50%.
  const color = pct >= 0.8 ? "text-emerald-300" : pct >= 0.5 ? "text-amber-300" : "text-rose-300";
  return (
    <div className="inline-flex flex-col items-end">
      <span className={cn("font-semibold tabular-nums", color)}>{active}</span>
      <span className="text-[9px] tabular-nums text-slate-400">{Math.round(pct * 100)}%</span>
    </div>
  );
}
