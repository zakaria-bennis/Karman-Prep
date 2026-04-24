"use client";

// ============================================================
// UsersClient — table of all users, role editor, parent-link
// manager dialog.
// ============================================================

import { useEffect, useMemo, useState, useTransition } from "react";
import { Link2, Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminUserRow, LinkedStudentRow } from "@/lib/supabase/queries/users";
import type { AppRole } from "@/lib/supabase/queries/admin";
import {
  actionSetUserRole,
  actionLinkParentToStudent,
  actionUnlinkParentFromStudent,
} from "./actions";

const ROLE_OPTIONS: AppRole[] = ["student", "tutor", "parent", "admin"];

const ROLE_COLOR: Record<AppRole, string> = {
  student: "bg-slate-400/10 text-slate-300 border-slate-400/20",
  tutor:   "bg-indigo-400/10 text-indigo-300 border-indigo-400/20",
  parent:  "bg-rose-400/10 text-rose-300 border-rose-400/20",
  admin:   "bg-amber-400/10 text-amber-300 border-amber-400/20",
};

interface Props {
  users: AdminUserRow[];
}

export default function UsersClient({ users }: Props) {
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [linkingParent, setLinkingParent] = useState<AdminUserRow | null>(null);

  const filtered = useMemo(() => {
    if (roleFilter === "all") return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const students = useMemo(
    () => users.filter((u) => u.role === "student"),
    [users]
  );

  const counts = useMemo(() => {
    const c: Record<AppRole | "all", number> = {
      all: users.length, student: 0, tutor: 0, parent: 0, admin: 0,
    };
    for (const u of users) c[u.role]++;
    return c;
  }, [users]);

  return (
    <div>
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Users</h1>
          <p className="text-sm text-slate-400 mt-1">
            Change role or link a parent to a student. Roles are enforced by the
            layout gate on each portal.
          </p>
        </div>
      </header>

      {/* Role filter pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "student", "tutor", "parent", "admin"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
              roleFilter === r
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800"
            )}
          >
            {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
            <span className="ml-1.5 text-[10px] opacity-70">{counts[r]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Email</th>
              <th className="text-left px-4 py-3 font-semibold">Role</th>
              <th className="text-left px-4 py-3 font-semibold">Links</th>
              <th aria-hidden="true" className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                onManageLinks={() => setLinkingParent(u)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No users match the current filter.</p>
      )}

      {linkingParent && (
        <ParentLinksDialog
          parent={linkingParent}
          allStudents={students}
          onClose={() => setLinkingParent(null)}
        />
      )}
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────

function UserRow({
  user, onManageLinks,
}: {
  user: AdminUserRow;
  onManageLinks: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function changeRole(next: AppRole) {
    if (next === user.role) return;
    setErr(null);
    startTransition(async () => {
      try { await actionSetUserRole(user.id, next); }
      catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    });
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "—";

  return (
    <tr className="hover:bg-slate-900/40 transition-colors">
      <td className="px-4 py-3">
        <div className="text-white font-medium">{fullName}</div>
        {err && <div className="text-xs text-rose-300 mt-0.5">{err}</div>}
      </td>
      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{user.email}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("inline-block px-2 py-0.5 rounded-md text-xs font-semibold border", ROLE_COLOR[user.role])}>
            {user.role}
          </span>
          <select
            value={user.role}
            onChange={(e) => changeRole(e.target.value as AppRole)}
            disabled={pending}
            className="rounded-md bg-slate-950/60 border border-slate-800 text-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50"
            aria-label={`Change role for ${fullName}`}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />}
        </div>
      </td>
      <td className="px-4 py-3">
        {user.role === "parent" ? (
          <button
            onClick={onManageLinks}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
          >
            <Link2 className="w-3.5 h-3.5" />
            {user.linked_student_count} linked · manage
          </button>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>
      <td className="px-2 py-3" />
    </tr>
  );
}

// ─── Parent-link dialog ─────────────────────────────────────

function ParentLinksDialog({
  parent, allStudents, onClose,
}: {
  parent: AdminUserRow;
  allStudents: AdminUserRow[];
  onClose: () => void;
}) {
  // Seed the dialog's known-linked list from the table's count, then
  // fetch the real list on open. For v1 simplicity, we re-render the
  // whole page after any mutation (revalidatePath), so we re-fetch via
  // a full list passed in as a prop on next render.
  const [linked, setLinked] = useState<LinkedStudentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [studentToAdd, setStudentToAdd] = useState("");

  // Fetch current links when the dialog mounts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch(`/api/admin/users/${parent.id}/links`, { cache: "no-store" });
        const data = res.ok
          ? ((await res.json()) as { students: LinkedStudentRow[] })
          : { students: [] as LinkedStudentRow[] };
        if (!cancelled) { setLinked(data.students); setLoaded(true); }
      } catch {
        if (!cancelled) { setLinked([]); setLoaded(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [parent.id]);

  const eligible = allStudents.filter(
    (s) => !linked.some((l) => l.id === s.id)
  );

  function add() {
    if (!studentToAdd) return;
    setErr(null);
    startTransition(async () => {
      try {
        await actionLinkParentToStudent(parent.id, studentToAdd);
        // Optimistic: add to list
        const added = allStudents.find((s) => s.id === studentToAdd);
        if (added) {
          setLinked((prev) => [...prev, {
            id: added.id, first_name: added.first_name, last_name: added.last_name, email: added.email,
          }]);
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

  const parentName = [parent.first_name, parent.last_name].filter(Boolean).join(" ") || parent.email;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-white">Linked students</h2>
        <p className="text-sm text-slate-400 mt-1">
          Choose which students <span className="text-white font-semibold">{parentName}</span> can see in their parent portal.
        </p>

        <div className="mt-5">
          {!loaded ? (
            <div className="text-slate-500 text-sm">Loading…</div>
          ) : linked.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No students linked yet.</p>
          ) : (
            <ul className="space-y-2">
              {linked.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/50 border border-slate-800 px-3 py-2"
                >
                  <div>
                    <div className="text-white text-sm">
                      {[s.first_name, s.last_name].filter(Boolean).join(" ") || s.email}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{s.email}</div>
                  </div>
                  <button
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    className="text-slate-500 hover:text-rose-300 disabled:opacity-50"
                    aria-label={`Unlink ${s.email}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Add a student
          </label>
          <div className="flex gap-2">
            <select
              value={studentToAdd}
              onChange={(e) => setStudentToAdd(e.target.value)}
              className="flex-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="">Select a student…</option>
              {eligible.map((s) => {
                const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;
                return <option key={s.id} value={s.id}>{name} · {s.email}</option>;
              })}
            </select>
            <button
              onClick={add}
              disabled={!studentToAdd || pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-3 py-2 disabled:opacity-50"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Link
            </button>
          </div>
          {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
        </div>
      </div>
    </div>
  );
}
