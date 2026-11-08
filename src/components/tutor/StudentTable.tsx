"use client";

// ============================================================
// StudentTable — the staff tutor's sortable roster, on the admin
// kit's table (stacks into cards on phones): search by name or email,
// a cohort filter, plan pill, a ring per section, flags.
// ============================================================

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StudentDashboardRow } from "@/lib/supabase/queries/tutor";
import { currentAtmosphere } from "@/data/curriculum";
import { Ring } from "@/components/portal";
import {
  WbEmpty,
  WbPill,
  WbToolbar,
  formatDateTime,
  type Tone,
} from "@/components/admin/workbench";
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

const COLS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Student" },
  { key: "plan", label: "Plan" },
  { key: "atmosphere", label: "Atmosphere" },
  { key: "reading", label: "Reading", numeric: true },
  { key: "math", label: "Math", numeric: true },
  { key: "last_active", label: "Last active" },
  { key: "flags", label: "Flags", numeric: true },
  { key: "struggling", label: "Struggling", numeric: true },
];

type Plan = NonNullable<StudentDashboardRow["plan_tier"]>;
const PLAN_LABEL: Record<Plan, string> = {
  group: tierLabel("group"),
  small_group: tierLabel("small_group"),
  private: tierLabel("private"),
  elite: tierLabel("elite"),
  annual: "Annual",
};
const PLAN_TONE: Record<Plan, Tone> = {
  group: "info",
  small_group: "ok",
  private: "warn",
  elite: "info",
  annual: "ok",
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
      <WbEmpty title="No students yet.">
        They show up here once an admin places a student in one of your cohorts or assigns you a
        private student.
      </WbEmpty>
    );
  }

  const filtersOn = search.trim().length > 0 || cohortFilter !== "all";

  return (
    <div className="wb" style={{ paddingBlock: 0 }}>
      <WbToolbar>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or email"
          aria-label="Search students by name or email"
          className="wb-input"
          style={{ flex: "1 1 220px" }}
        />
        {cohorts.length > 0 ? (
          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            aria-label="Filter students by cohort"
            className="wb-select"
          >
            <option value="all">All cohorts ({cohorts.length})</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({tierLabelOf(c.tier)})
              </option>
            ))}
          </select>
        ) : null}
        <span className="wb-note" aria-live="polite">
          {sorted.length} of {rows.length}
        </span>
      </WbToolbar>

      {sorted.length === 0 ? (
        <WbEmpty title="No student matches.">
          {filtersOn && (
            <button
              type="button"
              className="wb-btn"
              onClick={() => {
                setSearch("");
                setCohortFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
        </WbEmpty>
      ) : (
        <div className="wb-table-wrap" data-testid="student-table">
          <table className="wb-table">
            <caption className="sr-only">Your students. Select a column heading to sort.</caption>
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    style={c.numeric ? { textAlign: "right" } : undefined}
                    aria-sort={
                      sortKey === c.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                    }
                  >
                    <button
                      type="button"
                      className="kp-staff-sort"
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.label}
                      <span aria-hidden="true">
                        {sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const atmo = currentAtmosphere(r.atmosphere_level);
                const readingPct = pct(r.reading_mastered, r.reading_total);
                const mathPct = pct(r.math_mastered, r.math_total);
                const display = fullName(r);
                return (
                  <tr key={r.clerk_id}>
                    <td data-label="Student">
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                        <Link href={`/tutor/${r.clerk_id}`}>{display}</Link>
                        {display !== r.email && <small>{r.email}</small>}
                      </span>
                    </td>
                    <td data-label="Plan">
                      {r.plan_tier ? (
                        <WbPill tone={PLAN_TONE[r.plan_tier]}>{PLAN_LABEL[r.plan_tier]}</WbPill>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Atmosphere">{atmo}</td>
                    <td data-label="Reading" data-num="">
                      <span className="kp-staff-ringcell">
                        <Ring
                          value={readingPct / 100}
                          size={28}
                          width={4}
                          label={`Reading: ${r.reading_mastered} of ${r.reading_total} mastered`}
                        />
                        {readingPct}%
                      </span>
                    </td>
                    <td data-label="Math" data-num="">
                      <span className="kp-staff-ringcell">
                        <Ring
                          value={mathPct / 100}
                          size={28}
                          width={4}
                          label={`Math: ${r.math_mastered} of ${r.math_total} mastered`}
                        />
                        {mathPct}%
                      </span>
                    </td>
                    <td data-label="Last active" data-testid="last-active-cell">
                      {r.last_active ? formatDateTime(r.last_active) : "Never"}
                    </td>
                    <td data-label="Flags" data-num="">
                      {r.flagged_open > 0 ? <WbPill tone="fail">{r.flagged_open}</WbPill> : "0"}
                    </td>
                    <td data-label="Struggling" data-num="">
                      {r.struggling_count > 0 ? (
                        <WbPill tone="warn">{r.struggling_count}</WbPill>
                      ) : (
                        "0"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function pct(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
