"use client";

// ============================================================
// The cohort list on /admin/cohorts: one dense table (stacked
// cards under 768px, from the admin kit) plus the inline
// Unarchive button for auto-archived cohorts (audit #13).
// ============================================================

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WbPill, WbTable } from "@/components/admin/workbench";
import { tierLabel } from "@/lib/scheduling/tiers";
import type { AdminCohortRow } from "@/lib/supabase/queries/cohorts";
import { actionUnarchiveCohort } from "./actions";
import { STATUS_LABEL, STATUS_TONE, formatSatDate, tutorDisplay } from "./format";

function needsSetup(c: AdminCohortRow): boolean {
  return (
    c.setup_completed_at === null &&
    !c.archived_at &&
    (c.tier === "group" || c.tier === "small_group")
  );
}

export function CohortsTable({ cohorts, empty }: { cohorts: AdminCohortRow[]; empty: ReactNode }) {
  return (
    <WbTable<AdminCohortRow>
      caption="Cohorts"
      rows={cohorts}
      rowKey={(c) => c.id}
      empty={empty}
      columns={[
        {
          key: "name",
          label: "Name",
          cell: (c) => (
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              <Link
                href={`/admin/cohorts/${c.id}`}
                style={c.archived_at ? { color: "var(--mute)" } : undefined}
              >
                {c.name}
              </Link>
              {(c.archived_at || needsSetup(c)) && (
                <span style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {c.archived_at && <WbPill tone="neutral">Archived</WbPill>}
                  {needsSetup(c) && <WbPill tone="warn">Needs setup</WbPill>}
                </span>
              )}
            </span>
          ),
        },
        { key: "tier", label: "Type", cell: (c) => tierLabel(c.tier) },
        { key: "sat", label: "SAT date", cell: (c) => formatSatDate(c.sat_date) },
        {
          key: "tutor",
          label: "Tutor",
          cell: (c) => <span style={{ overflowWrap: "anywhere" }}>{tutorDisplay(c.tutor)}</span>,
        },
        {
          key: "members",
          label: "Members",
          numeric: true,
          cell: (c) => (
            <span
              style={c.member_count >= c.max_size ? { color: "var(--warn)" } : undefined}
              title={c.member_count >= c.max_size ? "Full" : undefined}
            >
              {c.member_count} of {c.max_size}
            </span>
          ),
        },
        {
          key: "status",
          label: "Status",
          cell: (c) => <WbPill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</WbPill>,
        },
        {
          key: "action",
          label: "",
          cell: (c) =>
            c.archived_at ? (
              <UnarchiveButton cohortId={c.id} name={c.name} />
            ) : (
              <Link href={`/admin/cohorts/${c.id}`} aria-label={`Open ${c.name}`}>
                Open
              </Link>
            ),
        },
      ]}
    />
  );
}

/** Restores an auto-archived cohort to the active dashboards. */
function UnarchiveButton({ cohortId, name }: { cohortId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function onClick() {
    setFailed(false);
    startTransition(async () => {
      try {
        await actionUnarchiveCohort(cohortId);
        router.refresh();
      } catch (err) {
        console.error("[admin/cohorts] unarchive failed:", err);
        setFailed(true);
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
      <button
        type="button"
        className="wb-btn"
        onClick={onClick}
        disabled={pending}
        aria-label={`Unarchive ${name}`}
        title="Restore this cohort to active dashboards"
      >
        {pending ? "Restoring…" : "Unarchive"}
      </button>
      {failed && (
        <small role="alert" style={{ color: "var(--late)" }}>
          Couldn&apos;t unarchive. Try again.
        </small>
      )}
    </span>
  );
}
