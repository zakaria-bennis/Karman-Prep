"use client";

// ============================================================
// "Add member" dialog on the cohort page. Lists students who are
// not in another active cohort, best matches first. Calls
// actionAddCohortMember, which checks the seat limit.
// ============================================================

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tierLabel, tierLabelOf } from "@/lib/scheduling/tiers";
import type { EligibleStudentRow, CohortTier } from "@/lib/supabase/queries/cohorts";
import { actionAddCohortMember } from "../members-actions";

export function AddMemberDialog({
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  // Students whose plan matches the cohort type first (clearest
  // candidates), then everyone else (admin override).
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
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "color-mix(in srgb, var(--sunk) 70%, transparent)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-member-title"
        className="wb"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          padding: 20,
          border: "1px solid var(--line)",
          borderRadius: 4,
          background: "var(--card)",
          gap: 14,
        }}
      >
        <div>
          <h2 id="add-member-title" style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600 }}>
            Add member
          </h2>
          <p className="wb-note" style={{ marginTop: 4 }}>
            Only students who aren&apos;t in another active cohort are listed.
          </p>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label className="wb-field">
            <span>Student</span>
            <select
              className="wb-select"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            >
              <option value="">Choose a student</option>
              {sorted.map((s) => {
                const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;
                const plan = s.subscription_tier
                  ? ` · ${tierLabelOf(s.subscription_tier)}`
                  : " · no active plan";
                return (
                  <option key={s.id} value={s.id}>
                    {name}
                    {plan}
                  </option>
                );
              })}
            </select>
          </label>

          {tierMismatch && (
            <p
              className="wb-alert"
              style={{
                margin: 0,
                borderColor: "var(--warn)",
                background: "color-mix(in srgb, var(--warn) 8%, transparent)",
              }}
            >
              This student&apos;s plan is{" "}
              <b>
                {selected?.subscription_tier
                  ? tierLabelOf(selected.subscription_tier)
                  : "no active plan"}
              </b>
              , not <b>{tierLabel(cohortTier)}</b>. You can still add them, but their billing
              won&apos;t match the cohort.
            </p>
          )}

          {err && (
            <p role="alert" className="wb-alert" style={{ margin: 0 }}>
              {err}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="wb-btn" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button
              type="submit"
              className="wb-btn"
              data-variant="primary"
              disabled={!studentId || pending}
            >
              {pending ? "Adding…" : "Add to cohort"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
