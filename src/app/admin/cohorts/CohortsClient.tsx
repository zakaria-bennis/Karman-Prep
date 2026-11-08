"use client";

// ============================================================
// CohortsClient: the interactive part of /admin/cohorts.
// Totals, filters (archived, type, tutor, search), the cohort
// table and the "Create cohort" dialog.
// ============================================================

import { useMemo, useState } from "react";
import { WbPage, WbStats, WbTabs, WbToolbar } from "@/components/admin/workbench";
import { COHORT_TIER_CAP, tierLabel } from "@/lib/scheduling/tiers";
import type {
  AdminCohortRow,
  SatDateRow,
  TutorRow,
  CohortTier,
} from "@/lib/supabase/queries/cohorts";
import { CohortsTable } from "./CohortsTable";
import { CreateCohortDialog } from "./CreateCohortDialog";
import { tutorDisplay } from "./format";

interface Props {
  cohorts: AdminCohortRow[];
  satDates: SatDateRow[];
  tutors: TutorRow[];
  /** When true, the list also includes auto-archived cohorts (audit #13).
   *  Driven by `?show=archived` on the URL. */
  showArchived?: boolean;
}

type TierFilter = "all" | CohortTier;
const TIER_FILTERS: TierFilter[] = ["all", "small_group", "group"];

export default function CohortsClient({ cohorts, satDates, tutors, showArchived }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tutorFilter, setTutorFilter] = useState<string>(""); // "" = all tutors
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const searched = useMemo(() => {
    return cohorts.filter((c) => {
      if (tutorFilter && c.tutor.id !== tutorFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        tutorDisplay(c.tutor).toLowerCase().includes(q) ||
        c.tutor.email.toLowerCase().includes(q)
      );
    });
  }, [cohorts, tutorFilter, q]);
  const visible = tierFilter === "all" ? searched : searched.filter((c) => c.tier === tierFilter);

  const canCreate = satDates.length > 0 && tutors.length > 0;
  const filtersOn = tutorFilter !== "" || tierFilter !== "all" || q !== "";
  const live = cohorts.filter((c) => !c.archived_at);
  const stats = [
    { label: "Cohorts", value: live.length },
    { label: "Students placed", value: live.reduce((n, c) => n + c.member_count, 0) },
    {
      label: "Open seats",
      value: live.reduce((n, c) => n + Math.max(0, c.max_size - c.member_count), 0),
    },
    {
      label: "Need setup",
      value: live.filter((c) => c.setup_completed_at === null).length,
    },
  ];
  if (showArchived) {
    stats.push({ label: "Archived", value: cohorts.length - live.length });
  }

  function clearFilters() {
    setTutorFilter("");
    setTierFilter("all");
    setQuery("");
  }

  const empty = filtersOn ? (
    <>
      <b>No cohort matches.</b>
      <button type="button" className="wb-btn" onClick={clearFilters} style={{ marginTop: 8 }}>
        Clear filters
      </button>
    </>
  ) : canCreate ? (
    <>
      <b>{showArchived ? "No cohorts yet." : "No active cohorts."}</b>
      Use Create cohort to add the first one.
    </>
  ) : (
    <>
      <b>No cohorts yet.</b>
      {satDates.length === 0 && <span style={{ display: "block" }}>No SAT dates are set up.</span>}
      {tutors.length === 0 && (
        <span style={{ display: "block" }}>No one has the tutor role yet.</span>
      )}
    </>
  );

  return (
    <WbPage
      title="Cohorts"
      summary={`Cohorts (up to ${COHORT_TIER_CAP.small_group} students) and weekly live sessions (up to ${COHORT_TIER_CAP.group}), by SAT date.`}
      actions={
        <button
          type="button"
          className="wb-btn"
          data-variant="primary"
          onClick={() => setDialogOpen(true)}
          disabled={!canCreate}
          title={
            satDates.length === 0
              ? "No upcoming SAT dates in the database yet"
              : tutors.length === 0
                ? "No one has the tutor role yet"
                : undefined
          }
        >
          Create cohort
        </button>
      }
    >
      <WbStats items={stats} />

      <WbToolbar>
        <WbTabs
          label="Archived cohorts"
          param="show"
          value={showArchived ? "archived" : "active"}
          basePath="/admin/cohorts"
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Include archived" },
          ]}
        />
      </WbToolbar>

      <WbToolbar>
        <div className="wb-tabs" role="group" aria-label="Cohort type">
          {TIER_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              className="wb-tab"
              aria-pressed={tierFilter === t}
              aria-current={tierFilter === t ? "page" : undefined}
              onClick={() => setTierFilter(t)}
              style={{ background: "transparent", cursor: "pointer", font: "inherit" }}
            >
              {t === "all" ? "All types" : tierLabel(t)}
              <small>
                {t === "all" ? searched.length : searched.filter((c) => c.tier === t).length}
              </small>
            </button>
          ))}
        </div>
        <select
          className="wb-select"
          aria-label="Filter cohorts by tutor"
          value={tutorFilter}
          onChange={(e) => setTutorFilter(e.target.value)}
          style={{ width: "auto", maxWidth: "100%" }}
        >
          <option value="">All tutors ({cohorts.length})</option>
          {tutors.map((t) => (
            <option key={t.id} value={t.id}>
              {tutorDisplay(t)} ({cohorts.filter((c) => c.tutor.id === t.id).length})
            </option>
          ))}
        </select>
        <div role="search" className="wb-search">
          <input
            className="wb-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cohort or tutor name"
            aria-label="Search cohorts by name or tutor"
          />
          {query && (
            <button type="button" className="wb-btn" onClick={() => setQuery("")}>
              Clear the search
            </button>
          )}
        </div>
      </WbToolbar>

      <CohortsTable cohorts={visible} empty={empty} />

      {dialogOpen && (
        <CreateCohortDialog
          satDates={satDates}
          tutors={tutors}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </WbPage>
  );
}
