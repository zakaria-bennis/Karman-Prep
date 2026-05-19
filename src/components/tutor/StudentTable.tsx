"use client";

// ============================================================
// StudentTable — sortable table of students with per-row stats.
// Now with: search by name/email + cohort filter + plan-tier badge.
// ============================================================

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Flag, AlertCircle, Search } from "lucide-react";
import type { StudentDashboardRow } from "@/lib/supabase/queries/tutor";
import { currentAtmosphere, ATMOSPHERE_COLORS } from "@/data/curriculum";
import { cn } from "@/lib/utils";

interface CohortLite {
  id: string;
  name: string;
  tier: "group" | "small_group";
}

interface Props {
  rows: StudentDashboardRow[];
  /** Cohorts the tutor leads — populates the filter dropdown.
   *  Optional; pass [] to hide the filter. */
  cohorts?: CohortLite[];
}

type SortKey =
  | "name"
  | "atmosphere"
  | "plan"
  | "reading"
  | "math"
  | "last_active"
  | "flags"
  | "struggling";
type SortDir = "asc" | "desc";

const COLS: { key: SortKey; label: string; className?: string }[] = [
  { key: "name", label: "Student" },
  { key: "plan", label: "Plan" },
  { key: "atmosphere", label: "Atmo" },
  { key: "reading", label: "Reading", className: "text-right" },
  { key: "math", label: "Math", className: "text-right" },
  { key: "last_active", label: "Last active" },
  { key: "flags", label: "Flags", className: "text-right" },
  { key: "struggling", label: "Struggling", className: "text-right" },
];

type Plan = NonNullable<StudentDashboardRow["plan_tier"]>;
const PLAN_LABEL: Record<Plan, string> = {
  group: "Seminar",
  small_group: "Small Group",
  private: "Private",
  elite: "Elite",
  annual: "Annual",
};
const PLAN_COLOR: Record<Plan, string> = {
  group:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300 border-indigo-200 dark:border-indigo-400/20",
  small_group:
    "bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300 border-teal-200 dark:border-teal-400/20",
  private:
    "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300 border-amber-200 dark:border-amber-400/20",
  elite:
    "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300 border-violet-200 dark:border-violet-400/20",
  annual:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/20",
};

function fullName(r: StudentDashboardRow): string {
  return [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || r.email;
}

export default function StudentTable({ rows, cohorts = [] }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("last_active");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [cohortFilter, setCohortFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (cohortFilter !== "all" && !r.cohort_ids.includes(cohortFilter)) return false;
      if (q.length > 0) {
        const hay = [r.first_name, r.last_name, r.email].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, cohortFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const sign = sortDir === "asc" ? 1 : -1;
    const planRank = (p: StudentDashboardRow["plan_tier"]) =>
      p === "elite" ? 4 : p === "private" ? 3 : p === "small_group" ? 2 : p === "group" ? 1 : 0;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return sign * fullName(a).localeCompare(fullName(b));
        case "plan":
          return sign * (planRank(a.plan_tier) - planRank(b.plan_tier));
        case "atmosphere":
          return sign * (a.atmosphere_level - b.atmosphere_level);
        case "reading":
          return sign * (a.reading_mastered - b.reading_mastered);
        case "math":
          return sign * (a.math_mastered - b.math_mastered);
        case "last_active":
          return sign * (a.last_active ?? "").localeCompare(b.last_active ?? "");
        case "flags":
          return sign * (a.flagged_open - b.flagged_open);
        case "struggling":
          return sign * (a.struggling_count - b.struggling_count);
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <p className="text-sm text-slate-400">No students assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + cohort filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name or email…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100"
          />
        </div>
        {cohorts.length > 0 ? (
          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            aria-label="Filter students by cohort"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100"
          >
            <option value="all">All cohorts ({cohorts.length})</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.tier === "small_group" ? "Small Group" : "Seminar"})
              </option>
            ))}
          </select>
        ) : null}
        <span className="shrink-0 self-center text-xs text-slate-400 sm:ml-2">
          {sorted.length} of {rows.length} matching
        </span>
      </div>

      <div
        className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
        data-testid="student-table"
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "cursor-pointer px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800",
                    c.className
                  )}
                  onClick={() => toggleSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
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
              const mathPct = Math.round((r.math_mastered / r.math_total) * 100);
              const display = fullName(r);
              return (
                <tr
                  key={r.clerk_id}
                  className="border-t border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/tutor/${r.clerk_id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 dark:text-white"
                    >
                      {display}
                    </Link>
                    {display !== r.email && (
                      <div className="font-mono text-[11px] text-slate-400">{r.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.plan_tier ? (
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[10px] font-bold",
                          PLAN_COLOR[r.plan_tier]
                        )}
                      >
                        {PLAN_LABEL[r.plan_tier]}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{
                        color: atmoColor,
                        background: atmoColor + "20",
                        border: `1px solid ${atmoColor}40`,
                      }}
                    >
                      {atmo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {readingPct}%{" "}
                    <span className="text-xs text-slate-400">
                      ({r.reading_mastered}/{r.reading_total})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {mathPct}%{" "}
                    <span className="text-xs text-slate-400">
                      ({r.math_mastered}/{r.math_total})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400" data-testid="last-active-cell">
                    {r.last_active ? new Date(r.last_active).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.flagged_open > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                        <Flag className="h-3 w-3" /> {r.flagged_open}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.struggling_count > 0 ? (
                      <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                        {r.struggling_count}
                      </span>
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
    </div>
  );
}
