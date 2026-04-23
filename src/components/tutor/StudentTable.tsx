"use client";

// ============================================================
// StudentTable — sortable table of students with per-row stats.
// ============================================================

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Flag, AlertCircle } from "lucide-react";
import type { StudentDashboardRow } from "@/lib/supabase/queries/tutor";
import { currentAtmosphere, ATMOSPHERE_COLORS } from "@/data/curriculum";
import { cn } from "@/lib/utils";

interface Props {
  rows: StudentDashboardRow[];
}

type SortKey =
  | "email" | "tier" | "reading" | "math" | "streak"
  | "last_active" | "flags" | "struggling";
type SortDir = "asc" | "desc";

const COLS: { key: SortKey; label: string; className?: string }[] = [
  { key: "email",       label: "Student" },
  { key: "tier",        label: "Tier" },
  { key: "reading",     label: "Reading", className: "text-right" },
  { key: "math",        label: "Math",    className: "text-right" },
  { key: "streak",      label: "Streak",  className: "text-right" },
  { key: "last_active", label: "Last active" },
  { key: "flags",       label: "Flags",   className: "text-right" },
  { key: "struggling",  label: "Struggling", className: "text-right" },
];

export default function StudentTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("last_active");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...rows];
    const sign = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "email":       return sign * a.email.localeCompare(b.email);
        case "tier":        return sign * (a.atmosphere_level - b.atmosphere_level);
        case "reading":     return sign * (a.reading_mastered - b.reading_mastered);
        case "math":        return sign * (a.math_mastered - b.math_mastered);
        case "streak":      return sign * 0; // streak not yet tracked (Prompt 3)
        case "last_active": return sign * ((a.last_active ?? "").localeCompare(b.last_active ?? ""));
        case "flags":       return sign * (a.flagged_open - b.flagged_open);
        case "struggling":  return sign * (a.struggling_count - b.struggling_count);
      }
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No students assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 dark:bg-slate-900">
          <tr>
            {COLS.map((c) => (
              <th
                key={c.key}
                className={cn("text-left px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800", c.className)}
                onClick={() => toggleSort(c.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {sortKey === c.key
                    ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
                    : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const atmo = currentAtmosphere(r.atmosphere_level);
            const atmoColor = ATMOSPHERE_COLORS[atmo].hex;
            const readingPct = Math.round((r.reading_mastered / r.reading_total) * 100);
            const mathPct    = Math.round((r.math_mastered / r.math_total) * 100);
            return (
              <tr key={r.clerk_id} className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/tutor/${r.clerk_id}`}
                    className="font-semibold text-slate-900 dark:text-white hover:text-blue-600"
                  >
                    {r.email}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: atmoColor, background: atmoColor + "20", border: `1px solid ${atmoColor}40` }}
                  >
                    {atmo}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                  {readingPct}% <span className="text-xs text-slate-400">({r.reading_mastered}/{r.reading_total})</span>
                </td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                  {mathPct}% <span className="text-xs text-slate-400">({r.math_mastered}/{r.math_total})</span>
                </td>
                <td className="px-4 py-3 text-right text-slate-500 tabular-nums">—</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {r.last_active ? new Date(r.last_active).toLocaleString() : "Never"}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.flagged_open > 0 ? (
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                      <Flag className="w-3 h-3" /> {r.flagged_open}
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.struggling_count > 0 ? (
                    <span className="text-red-600 dark:text-red-400 font-semibold tabular-nums">{r.struggling_count}</span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
