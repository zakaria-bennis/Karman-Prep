"use client";

// ============================================================
// ParentLinksDialog — choose which students a parent can see.
// A native modal <dialog> (top layer, Esc closes, focus is
// trapped by the browser). Loads the current links on open.
// ============================================================

import { useEffect, useRef, useState, useTransition } from "react";
import type { AdminUserRow, LinkedStudentRow } from "@/lib/supabase/queries/users";
import { actionLinkParentToStudent, actionUnlinkParentFromStudent } from "./actions";

const nameOf = (u: { first_name: string | null; last_name: string | null; email: string }) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;

export default function ParentLinksDialog({
  parent,
  allStudents,
  onClose,
}: {
  parent: AdminUserRow;
  allStudents: AdminUserRow[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [linked, setLinked] = useState<LinkedStudentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [studentToAdd, setStudentToAdd] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Fetch current links when the dialog mounts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${parent.id}/links`, { cache: "no-store" });
        const data = res.ok
          ? ((await res.json()) as { students: LinkedStudentRow[] })
          : { students: [] as LinkedStudentRow[] };
        if (!cancelled) {
          setLinked(data.students);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setLinked([]);
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parent.id]);

  const eligible = allStudents.filter((s) => !linked.some((l) => l.id === s.id));

  function add() {
    if (!studentToAdd) return;
    setErr(null);
    startTransition(async () => {
      try {
        await actionLinkParentToStudent(parent.id, studentToAdd);
        // Optimistic: add to list
        const added = allStudents.find((s) => s.id === studentToAdd);
        if (added) {
          setLinked((prev) => [
            ...prev,
            {
              id: added.id,
              first_name: added.first_name,
              last_name: added.last_name,
              email: added.email,
            },
          ]);
        }
        setStudentToAdd("");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function remove(studentId: string) {
    setErr(null);
    startTransition(async () => {
      try {
        await actionUnlinkParentFromStudent(parent.id, studentId);
        setLinked((prev) => prev.filter((s) => s.id !== studentId));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="parent-links-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> itself.
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        width: "min(32rem, calc(100vw - 32px))",
        padding: 0,
        border: "1px solid var(--wb-line)",
        borderRadius: 4,
        background: "var(--bg, Canvas)",
        color: "var(--wb-ink)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <h2 id="parent-links-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
              Linked students
            </h2>
            <p className="wb-note" style={{ marginTop: 4 }}>
              Choose which students <b style={{ color: "var(--wb-ink)" }}>{nameOf(parent)}</b> can
              see in their parent portal.
            </p>
          </div>
          <button type="button" className="wb-btn" onClick={onClose}>
            Close
          </button>
        </div>

        {!loaded ? (
          <p className="wb-note">Loading…</p>
        ) : linked.length === 0 ? (
          <p className="wb-note">No students linked yet.</p>
        ) : (
          <ul
            style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}
            aria-label="Linked students"
          >
            {linked.map((s) => (
              <li
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "8px 10px",
                  border: "1px solid var(--wb-line)",
                  borderRadius: 4,
                }}
              >
                <span style={{ minWidth: 0, overflowWrap: "anywhere", fontSize: "0.9rem" }}>
                  {nameOf(s)}
                  <small style={{ display: "block", color: "var(--wb-mute)" }}>{s.email}</small>
                </span>
                <button
                  type="button"
                  className="wb-btn"
                  data-variant="danger"
                  onClick={() => remove(s.id)}
                  disabled={pending}
                  aria-label={`Unlink ${s.email}`}
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="wb-field">
          <span id="parent-links-add">Add a student</span>
          <span style={{ display: "flex", gap: 8 }}>
            <select
              className="wb-select"
              value={studentToAdd}
              onChange={(e) => setStudentToAdd(e.target.value)}
              aria-labelledby="parent-links-add"
              style={{ flex: "1 1 auto", minWidth: 0 }}
            >
              <option value="">Select a student…</option>
              {eligible.map((s) => (
                <option key={s.id} value={s.id}>
                  {nameOf(s)} · {s.email}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="wb-btn"
              data-variant="primary"
              onClick={add}
              disabled={!studentToAdd || pending}
            >
              {pending ? "Saving…" : "Link"}
            </button>
          </span>
        </div>
        {err && (
          <p role="alert" className="wb-alert">
            {err}
          </p>
        )}
      </div>
    </dialog>
  );
}
