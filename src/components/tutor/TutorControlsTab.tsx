"use client";

// ============================================================
// TutorControlsTab — node status override + checkpoint controls.
// Every change writes to tutor_node_overrides BEFORE learn_node_status.
// Portal look: student-detail.css and the portal forms (forms.css).
// ============================================================

import { useMemo, useState, useTransition } from "react";
import { Search, Lock, Unlock, Check, Clock } from "lucide-react";
import { SectionHeader } from "@/components/portal/primitives";
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
    <div className="kp-st">
      {/* Node status override panel */}
      <section className="kp-st">
        <SectionHeader as="h3" title="Node status overrides" note={`${nodes.length} skills`} />
        <p className="kp-meta">
          Changes apply immediately and silently to the student&apos;s view. All overrides are
          logged to the audit table.
        </p>
        <label className="kp-st-search">
          <span className="kp-sr">Search nodes</span>
          <Search aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes by topic, ID, or cluster…"
            className="kp-input"
          />
        </label>

        <div className="kp-st-scroll" data-tall="">
          <table className="kp-st-table">
            <thead>
              <tr>
                <th scope="col">Skill</th>
                <th scope="col">Tier</th>
                <th scope="col">Status</th>
                <th scope="col">Lock pathway</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => {
                const curStatus = statusFor(n.id);
                const curLocked = lockedFor(n.id);
                const isSaving = savingId === n.id;
                return (
                  <tr key={n.id}>
                    <td>
                      {n.topic}
                      <small>
                        {SUBJECT_LABELS[n.subject]} · {n.topic_cluster}
                      </small>
                    </td>
                    <td>
                      <small>{TIER_LABELS[n.tier]}</small>
                    </td>
                    <td>
                      <select
                        value={curStatus}
                        disabled={isSaving}
                        aria-label={`Status for ${n.topic}`}
                        onChange={(e) =>
                          startTransition(() => {
                            applyOverride(n.id, e.target.value as OverrideStatus, curLocked);
                          })
                        }
                        className="kp-select"
                      >
                        {OVERRIDE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(() => applyOverride(n.id, curStatus, !curLocked))
                        }
                        disabled={isSaving}
                        aria-pressed={curLocked}
                        className="kp-st-btn"
                        data-tone={curLocked ? "late" : undefined}
                      >
                        {curLocked ? <Lock aria-hidden="true" /> : <Unlock aria-hidden="true" />}
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
      <section className="kp-st">
        <SectionHeader as="h3" title="Checkpoint management" />
        <div className="kp-st-scroll">
          <table className="kp-st-table">
            <thead>
              <tr>
                <th scope="col">Checkpoint</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {["reading:1", "reading:2", "reading:3", "math:1", "math:2", "math:3"].map((cp) => {
                const [subject, tier] = cp.split(":");
                return (
                  <tr key={cp}>
                    <td>
                      {subject === "reading" ? "Reading & Writing" : "Math"} — Tier {tier}{" "}
                      Checkpoint
                      <small>{TIER_LABELS[Number(tier) as 1 | 2 | 3]}</small>
                    </td>
                    <td>
                      <div className="kp-st-actions">
                        <button
                          type="button"
                          onClick={() =>
                            actionAssignCheckpointRetake({
                              student_id: studentId,
                              checkpoint_id: cp,
                            }).catch(console.error)
                          }
                          className="kp-st-btn"
                          data-tone="good"
                        >
                          <Check aria-hidden="true" /> Assign retake
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            actionOverrideCooldown({
                              student_id: studentId,
                              checkpoint_id: cp,
                            }).catch(console.error)
                          }
                          className="kp-st-btn"
                        >
                          <Clock aria-hidden="true" /> Override cooldown
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
