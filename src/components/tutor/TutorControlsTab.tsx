"use client";

// ============================================================
// TutorControlsTab — node status override + checkpoint controls.
// Every change writes to tutor_node_overrides BEFORE learn_node_status.
// ============================================================

import { useMemo, useState, useTransition } from "react";
import { Search, Lock, Unlock, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeStatusSnapshot } from "@/lib/supabase/queries/tutor";
import type { OverrideStatus } from "@/types/quiz";
import { RW_NODES, MATH_NODES, SUBJECT_LABELS, TIER_LABELS } from "@/data/curriculum";
import {
  actionApplyNodeOverride,
  actionAssignCheckpointRetake,
  actionOverrideCooldown,
} from "@/app/tutor/actions";

const OVERRIDE_STATUSES: OverrideStatus[] = [
  "locked",
  "unlocked",
  "in_progress",
  "partially_complete",
  "mastered",
];

interface Props {
  studentId: string;
  statuses: NodeStatusSnapshot[];
}

export default function TutorControlsTab({ studentId, statuses }: Props) {
  const statusMap = useMemo(() => new Map(statuses.map((s) => [s.node_id, s])), [statuses]);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<
    Record<string, { status: OverrideStatus; locked: boolean }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const needle = search.toLowerCase();
    return [...RW_NODES, ...MATH_NODES].filter(
      (n) =>
        !needle ||
        n.topic.toLowerCase().includes(needle) ||
        n.id.includes(needle) ||
        n.topic_cluster.toLowerCase().includes(needle)
    );
  }, [search]);

  async function applyOverride(nodeId: string, status: OverrideStatus, locked_pathway: boolean) {
    setSavingId(nodeId);
    setOptimistic((p) => ({ ...p, [nodeId]: { status, locked: locked_pathway } }));
    try {
      await actionApplyNodeOverride({
        student_id: studentId,
        node_id: nodeId,
        override_status: status,
        locked_pathway,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  }

  function statusFor(nodeId: string): OverrideStatus {
    const local = optimistic[nodeId];
    if (local) return local.status;
    const s = statusMap.get(nodeId)?.status;
    if (s === "available") return "unlocked";
    if (!s) return "locked";
    return s as OverrideStatus;
  }

  function lockedFor(nodeId: string): boolean {
    return optimistic[nodeId]?.locked ?? false;
  }

  return (
    <div className="space-y-8">
      {/* Node status override panel */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-ivory dark:text-ivory">Node Status Overrides</h2>
        <p className="mb-3 text-xs text-taupe">
          Changes apply immediately and silently to the student&apos;s view. All overrides are
          logged to the audit table.
        </p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-taupe" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes by topic, ID, or cluster…"
            className="w-full rounded border border-bronze py-2 pl-9 pr-3 text-sm dark:border-bronze dark:bg-surface"
          />
        </div>

        <div className="max-h-[32rem] overflow-hidden overflow-y-auto rounded-lg border border-bronze dark:border-bronze">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface dark:bg-surface">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-taupe dark:text-taupe">
                <th className="px-3 py-2">Skill</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-center">Lock pathway</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => {
                const curStatus = statusFor(n.id);
                const curLocked = lockedFor(n.id);
                const isSaving = savingId === n.id;
                return (
                  <tr key={n.id} className="border-t border-bronze dark:border-bronze">
                    <td className="px-3 py-2">
                      <div className="max-w-[20rem] truncate font-medium text-ivory dark:text-ivory">
                        {n.topic}
                      </div>
                      <div className="text-xs text-taupe">
                        {SUBJECT_LABELS[n.subject]} · {n.topic_cluster}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-taupe">{TIER_LABELS[n.tier]}</td>
                    <td className="px-3 py-2">
                      <select
                        value={curStatus}
                        disabled={isSaving}
                        onChange={(e) =>
                          startTransition(() => {
                            applyOverride(n.id, e.target.value as OverrideStatus, curLocked);
                          })
                        }
                        className="rounded border border-bronze px-2 py-1 text-xs dark:border-bronze dark:bg-surface"
                      >
                        {OVERRIDE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() =>
                          startTransition(() => applyOverride(n.id, curStatus, !curLocked))
                        }
                        disabled={isSaving}
                        className={cn(
                          "inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold",
                          curLocked
                            ? "border-error/40 bg-error text-ivory"
                            : "border-bronze text-taupe hover:text-ivory dark:border-bronze dark:hover:text-ivory"
                        )}
                      >
                        {curLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        {curLocked ? "Only" : "Normal"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Checkpoint management */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-ivory dark:text-ivory">Checkpoint Management</h2>
        <div className="overflow-hidden rounded-lg border border-bronze dark:border-bronze">
          <table className="w-full text-sm">
            <thead className="bg-surface dark:bg-surface">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-taupe dark:text-taupe">
                <th className="px-3 py-2">Checkpoint</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {["reading:1", "reading:2", "reading:3", "math:1", "math:2", "math:3"].map((cp) => {
                const [subject, tier] = cp.split(":");
                return (
                  <tr key={cp} className="border-t border-bronze dark:border-bronze">
                    <td className="px-3 py-2">
                      <div className="font-medium text-ivory dark:text-ivory">
                        {subject === "reading" ? "Reading & Writing" : "Math"} — Tier {tier}{" "}
                        Checkpoint
                      </div>
                      <div className="text-xs text-taupe">
                        {TIER_LABELS[Number(tier) as 1 | 2 | 3]}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            actionAssignCheckpointRetake({
                              student_id: studentId,
                              checkpoint_id: cp,
                            }).catch(console.error)
                          }
                          className="inline-flex items-center gap-1 rounded bg-info px-2.5 py-1 text-xs font-semibold text-ivory hover:bg-info-bright"
                        >
                          <Check className="h-3 w-3" /> Assign retake
                        </button>
                        <button
                          onClick={() =>
                            actionOverrideCooldown({
                              student_id: studentId,
                              checkpoint_id: cp,
                            }).catch(console.error)
                          }
                          className="inline-flex items-center gap-1 rounded border border-bronze px-2.5 py-1 text-xs font-semibold text-taupe hover:bg-surface dark:border-bronze dark:text-ivory dark:hover:bg-surface-raised"
                        >
                          <Clock className="h-3 w-3" /> Override cooldown
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
