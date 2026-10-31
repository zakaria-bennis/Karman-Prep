"use client";

// ============================================================
// Members tab — list of members + Add member dialog.
// Carved out of the old monolithic CohortDetailClient.tsx
// (audit M1).
// ============================================================

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { actionAddCohortMember, actionRemoveCohortMember } from "../members-actions";
import type {
  CohortMemberRow,
  EligibleStudentRow,
  CohortTier,
} from "@/lib/supabase/queries/cohorts";
import { Avatar, EmptyBlock, formatDateTime, studentDisplay } from "./shared";

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

  const fullCapacity = seatsOpen <= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-taupe">
          {seatsOpen > 0 ? (
            <>
              {seatsOpen} open seat{seatsOpen === 1 ? "" : "s"}.
            </>
          ) : (
            <>Cohort is at capacity.</>
          )}
        </p>
        <button
          onClick={() => setAdding(true)}
          disabled={fullCapacity || eligibleStudents.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-sm font-semibold text-night hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
          title={
            fullCapacity
              ? "Cohort is at capacity"
              : eligibleStudents.length === 0
                ? "No eligible students available"
                : undefined
          }
        >
          <Plus className="h-4 w-4" />
          Add member
        </button>
      </div>

      {members.length === 0 ? (
        <EmptyBlock
          title="No members yet"
          subtitle="Click Add member to place a student in this cohort."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-bronze">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-xs uppercase tracking-wider text-taupe">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Joined</th>
                <th aria-hidden="true" className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-bronze">
              {members.map((m) => (
                <MemberRow key={m.user_id} cohortId={cohortId} member={m} onError={setRowError} />
              ))}
            </tbody>
          </table>
          {rowError && (
            <div className="border-t border-bronze bg-error/5 px-4 py-2 text-xs text-error-bright">
              {rowError}
            </div>
          )}
        </div>
      )}

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

function MemberRow({
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

  async function remove() {
    const name = studentDisplay(member);
    const ok = await confirm({
      title: `Remove ${name}?`,
      description:
        "This ends their cohort membership. Quiz history and node mastery stay with the student — they can be added to another cohort right away.",
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
    <tr className="transition-colors hover:bg-surface/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={studentDisplay(member)} avatarUrl={member.avatar_url} />
          <span className="font-medium text-ivory">{studentDisplay(member)}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-taupe">{member.email}</td>
      <td className="px-4 py-3 text-xs text-taupe">{formatDateTime(member.joined_at)}</td>
      <td className="px-2 py-3">
        <button
          onClick={remove}
          disabled={pending}
          className="text-taupe hover:text-error-bright disabled:opacity-50"
          aria-label={`Remove ${studentDisplay(member)} from cohort`}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </td>
    </tr>
  );
}

function AddMemberDialog({
  cohortId,
  cohortTier,
  eligibleStudents,
  onClose,
}: {
  cohortId: string;
  cohortTier: CohortTier;
  eligibleStudents: EligibleStudentRow[];
  onClose: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Sort: students with matching sub tier first (clearest candidates),
  // then everyone else (admin override).
  const sorted = useMemo(() => {
    const matching = eligibleStudents.filter((s) => s.subscription_tier === cohortTier);
    const other = eligibleStudents.filter((s) => s.subscription_tier !== cohortTier);
    return [...matching, ...other];
  }, [eligibleStudents, cohortTier]);

  const selected = sorted.find((s) => s.id === studentId) ?? null;
  const tierMismatch = selected && selected.subscription_tier !== cohortTier;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        await actionAddCohortMember(cohortId, studentId);
        router.refresh();
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to add member");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-night/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-bronze bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-taupe hover:text-ivory"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-ivory">Add member</h2>
        <p className="mt-1 text-sm text-taupe">
          Only students not currently in another active cohort are shown.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-taupe">
              Student
            </span>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              className="w-full rounded-lg border border-bronze bg-night/60 px-3 py-2 text-sm text-ivory focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">Select a student…</option>
              {sorted.map((s) => {
                const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;
                const tierBit = s.subscription_tier
                  ? ` · ${s.subscription_tier}`
                  : " · no active sub";
                return (
                  <option key={s.id} value={s.id}>
                    {name}
                    {tierBit}
                  </option>
                );
              })}
            </select>
          </label>

          {tierMismatch && (
            <p className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning-bright">
              Heads up — this student&apos;s subscription tier is{" "}
              <span className="font-semibold">{selected?.subscription_tier ?? "none"}</span>, not{" "}
              <span className="font-semibold">{cohortTier}</span>. You can still place them (admin
              override), but their billing won&apos;t match the cohort.
            </p>
          )}

          {err && (
            <p className="rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error-bright">
              {err}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-lg border border-bronze px-4 py-2 text-sm font-semibold text-ivory hover:bg-surface-raised disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!studentId || pending}
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-night hover:bg-gold-bright disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add to cohort
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
