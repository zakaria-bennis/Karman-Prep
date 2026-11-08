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
import { tierLabel, tierLabelOf } from "@/lib/scheduling/tiers";

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
  group: tierLabel("group"),
  small_group: tierLabel("small_group"),
  private: tierLabel("private"),
  elite: tierLabel("elite"),
  annual: "Annual",
};
const PLAN_COLOR: Record<Plan, string> = {
  group:
    "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[color:var(--accent-text)] dark:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:text-[color:var(--accent-text)] border-[color-mix(in_srgb,var(--accent)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--accent)_20%,transparent)]",
  small_group:
    "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[color:var(--good)] dark:bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:text-[color:var(--good)] border-[color-mix(in_srgb,var(--good)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--good)_20%,transparent)]",
  private:
    "bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] text-[color:var(--warn)] dark:bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] dark:text-[color:var(--warn)] border-[color-mix(in_srgb,var(--warn)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--warn)_20%,transparent)]",
  elite:
    "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[color:var(--accent-text)] dark:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:text-[color:var(--accent-text)] border-[color-mix(in_srgb,var(--accent)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--accent)_20%,transparent)]",
  annual:
    "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[color:var(--good)] dark:bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:text-[color:var(--good)] border-[color-mix(in_srgb,var(--good)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--good)_20%,transparent)]",
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
      <div className="rounded-lg border border-dashed border-[color:var(--line)] p-12 text-center dark:border-[color:var(--line)]">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[color:var(--mute)]" />
        <p className="text-sm text-[color:var(--mute)]">No students assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + cohort filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--mute)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name or email…"
            className="w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--card)] py-2 pl-9 pr-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--mute)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--info)_40%,transparent)] dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_40%,transparent)] dark:text-[color:var(--ink)]"
          />
        </div>
        {cohorts.length > 0 ? (
          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            aria-label="Filter students by cohort"
            className="rounded-lg border border-[color:var(--line)] bg-[color:var(--card)] px-3 py-2 text-sm text-[color:var(--ink)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--info)_40%,transparent)] dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_40%,transparent)] dark:text-[color:var(--ink)]"
          >
            <option value="all">All cohorts ({cohorts.length})</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({tierLabelOf(c.tier)})
              </option>
            ))}
          </select>
        ) : null}
        <span className="shrink-0 self-center text-xs text-[color:var(--mute)] sm:ml-2">
          {sorted.length} of {rows.length} matching
        </span>
      </div>

      <div
        className="overflow-hidden rounded-lg border border-[color:var(--line)] dark:border-[color:var(--line)]"
        data-testid="student-table"
      >
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--card)] dark:bg-[color:var(--card)]">
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "cursor-pointer px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--mute)] hover:bg-[color:var(--card)] dark:text-[color:var(--mute)] dark:hover:bg-[color:var(--raised)]",
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
                  className="border-t border-[color:var(--line)] hover:bg-[color:var(--card)] dark:border-[color:var(--line)] dark:hover:bg-[color-mix(in_srgb,var(--card)_50%,transparent)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/tutor/${r.clerk_id}`}
                      className="font-semibold text-[color:var(--ink)] hover:text-[color:var(--info)] dark:text-[color:var(--ink)]"
                    >
                      {display}
                    </Link>
                    {display !== r.email && (
                      <div className="font-mono text-[11px] text-[color:var(--mute)]">{r.email}</div>
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
                      <span className="text-xs text-[color:var(--mute)]">—</span>
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
                  <td className="px-4 py-3 text-right tabular-nums text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                    {readingPct}%{" "}
                    <span className="text-xs text-[color:var(--mute)]">
                      ({r.reading_mastered}/{r.reading_total})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                    {mathPct}%{" "}
                    <span className="text-xs text-[color:var(--mute)]">
                      ({r.math_mastered}/{r.math_total})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[color:var(--mute)]" data-testid="last-active-cell">
                    {r.last_active ? new Date(r.last_active).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.flagged_open > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[color:var(--late)] dark:text-[color:var(--late)]">
                        <Flag className="h-3 w-3" /> {r.flagged_open}
                      </span>
                    ) : (
                      <span className="text-[color:var(--mute)]">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.struggling_count > 0 ? (
                      <span className="font-semibold tabular-nums text-[color:var(--late)] dark:text-[color:var(--late)]">
                        {r.struggling_count}
                      </span>
                    ) : (
                      <span className="text-[color:var(--mute)]">0</span>
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
