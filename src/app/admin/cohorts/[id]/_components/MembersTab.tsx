"use client";

// ============================================================
// Members tab: the cohort's students, a search box, Remove (with
// a confirmation) and the Add member dialog. Seat limits are
// enforced by the server action and the database.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WbTable } from "@/components/admin/workbench";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { actionRemoveCohortMember } from "../members-actions";
import type {
  CohortMemberRow,
  EligibleStudentRow,
  CohortTier,
} from "@/lib/supabase/queries/cohorts";
import { AddMemberDialog } from "./AddMemberDialog";
import { Avatar, formatDay, studentDisplay } from "./shared";

export function MembersTab({
  cohortId,
  members,
  seatsOpen,
  cohortTier,
  eligibleStudents,
}: {
  cohortId: string;
  members: CohortMemberRow[];
  seatsOpen: number;
  cohortTier: CohortTier;
  eligibleStudents: EligibleStudentRow[];
}) {
  const [adding, setAdding] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fullCapacity = seatsOpen <= 0;
  const q = query.trim().toLowerCase();
  const shown = q
    ? members.filter(
        (m) => studentDisplay(m).toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      )
    : members;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="wb-toolbar" style={{ justifyContent: "space-between" }}>
        <p className="wb-note">
          {seatsOpen > 0
            ? `${seatsOpen} open seat${seatsOpen === 1 ? "" : "s"}.`
            : "This cohort is full."}
        </p>
        <button
          type="button"
          className="wb-btn"
          data-variant="primary"
          onClick={() => setAdding(true)}
          disabled={fullCapacity || eligibleStudents.length === 0}
          title={
            fullCapacity
              ? "This cohort is full"
              : eligibleStudents.length === 0
                ? "No students can be added right now"
                : undefined
          }
        >
          Add member
        </button>
      </div>

      {members.length > 0 && (
        <div role="search" className="wb-search">
          <input
            className="wb-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Student name or email"
            aria-label="Search members by name or email"
          />
        </div>
      )}

      {rowError && (
        <p role="alert" className="wb-alert" style={{ margin: 0 }}>
          {rowError}
        </p>
      )}

      <WbTable<CohortMemberRow>
        caption="Members of this cohort"
        rows={shown}
        rowKey={(m) => m.user_id}
        empty={
          q ? (
            <>
              <b>No member matches.</b>
              <button
                type="button"
                className="wb-btn"
                onClick={() => setQuery("")}
                style={{ marginTop: 8 }}
              >
                Clear the search
              </button>
            </>
          ) : (
            <>
              <b>No members yet.</b>
              Use Add member to place a student in this cohort.
            </>
          )
        }
        columns={[
          {
            key: "name",
            label: "Name",
            cell: (m) => (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <Avatar name={studentDisplay(m)} avatarUrl={m.avatar_url} />
                <span style={{ overflowWrap: "anywhere" }}>{studentDisplay(m)}</span>
              </span>
            ),
          },
          {
            key: "email",
            label: "Email",
            cell: (m) => <span style={{ overflowWrap: "anywhere" }}>{m.email}</span>,
          },
          { key: "joined", label: "Joined", cell: (m) => formatDay(m.joined_at) },
          {
            key: "remove",
            label: "",
            cell: (m) => <RemoveButton cohortId={cohortId} member={m} onError={setRowError} />,
          },
        ]}
      />

      {adding && (
        <AddMemberDialog
          cohortId={cohortId}
          cohortTier={cohortTier}
          eligibleStudents={eligibleStudents}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function RemoveButton({
  cohortId,
  member,
  onError,
}: {
  cohortId: string;
  member: CohortMemberRow;
  onError: (msg: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  const name = studentDisplay(member);

  async function remove() {
    const ok = await confirm({
      title: `Remove ${name}?`,
      description:
        "This ends their place in the cohort. Their quiz history and progress stay with them, and they can join another cohort right away.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    onError(null);
    startTransition(async () => {
      try {
        await actionRemoveCohortMember(cohortId, member.user_id);
        router.refresh(); // pull fresh server data so the row disappears
      } catch (e) {
        onError(e instanceof Error ? e.message : "Failed to remove member");
      }
    });
  }

  return (
    <button
      type="button"
      className="wb-btn"
      data-variant="danger"
      onClick={remove}
      disabled={pending}
      aria-label={`Remove ${name} from cohort`}
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
