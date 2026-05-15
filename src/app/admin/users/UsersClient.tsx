"use client";

// ============================================================
// UsersClient — table of all users, role editor, parent-link
// manager dialog.
// ============================================================

import { useEffect, useMemo, useState, useTransition } from "react";
import { Eye, Link2, Loader2, Plus, RefreshCcw, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminCohortLite, AdminUserRow, LinkedStudentRow } from "@/lib/supabase/queries/users";
import type { AppRole } from "@/lib/supabase/queries/admin";
import {
  actionGrantDiagnosticRetake,
  actionSetUserRole,
  actionLinkParentToStudent,
  actionUnlinkParentFromStudent,
} from "./actions";
import { actionImpersonateUser } from "@/app/admin/impersonation-actions";

const ROLE_OPTIONS: AppRole[] = ["student", "tutor", "parent", "admin"];

const ROLE_COLOR: Record<AppRole, string> = {
  student: "bg-slate-400/10 text-slate-300 border-slate-400/20",
  tutor: "bg-indigo-400/10 text-indigo-300 border-indigo-400/20",
  parent: "bg-rose-400/10 text-rose-300 border-rose-400/20",
  admin: "bg-amber-400/10 text-amber-300 border-amber-400/20",
};

type SubTier = NonNullable<AdminUserRow["tier"]>;
const TIER_LABEL: Record<SubTier, string> = {
  group: "Seminar",
  small_group: "Small Group",
  private: "Private",
  elite: "Elite",
  annual: "Annual",
};
const TIER_COLOR: Record<SubTier, string> = {
  group: "bg-indigo-400/10 text-indigo-300 border-indigo-400/20",
  small_group: "bg-teal-400/10 text-teal-300 border-teal-400/20",
  private: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  elite: "bg-violet-400/10 text-violet-300 border-violet-400/20",
  annual: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
};

interface Props {
  users: AdminUserRow[];
  cohorts: AdminCohortLite[];
}

export default function UsersClient({ users, cohorts }: Props) {
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [cohortFilter, setCohortFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [linkingParent, setLinkingParent] = useState<AdminUserRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (cohortFilter !== "all" && !u.cohort_ids.includes(cohortFilter)) return false;
      if (q.length > 0) {
        const hay = [u.first_name, u.last_name, u.email].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, roleFilter, cohortFilter, search]);

  const students = useMemo(() => users.filter((u) => u.role === "student"), [users]);

  const counts = useMemo(() => {
    const c: Record<AppRole | "all", number> = {
      all: users.length,
      student: 0,
      tutor: 0,
      parent: 0,
      admin: 0,
    };
    for (const u of users) c[u.role]++;
    return c;
  }, [users]);

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Users</h1>
          <p className="mt-1 text-sm text-slate-400">
            Change role or link a parent to a student. Roles are enforced by the layout gate on each
            portal.
          </p>
        </div>
      </header>

      {/* Filter bar — search + role pills + cohort dropdown */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="all">All cohorts ({cohorts.length})</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.tier === "small_group" ? "Small Group" : "Seminar"})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "student", "tutor", "parent", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                roleFilter === r
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-800"
              )}
            >
              {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
              <span className="ml-1.5 text-[10px] opacity-70">{counts[r]}</span>
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-slate-500">
            {filtered.length} of {users.length} matching
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Role</th>
              <th className="px-4 py-3 text-left font-semibold">Tier</th>
              <th className="px-4 py-3 text-left font-semibold">Links</th>
              <th aria-hidden="true" className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((u) => (
              <UserRow key={u.id} user={u} onManageLinks={() => setLinkingParent(u)} />
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

function UserRow({ user, onManageLinks }: { user: AdminUserRow; onManageLinks: () => void }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function changeRole(next: AppRole) {
    if (next === user.role) return;
    setErr(null);
    startTransition(async () => {
      try {
        await actionSetUserRole(user.id, next);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "—";

  return (
    <tr className="transition-colors hover:bg-slate-900/40">
      <td className="px-4 py-3">
        <div className="font-medium text-white">{fullName}</div>
        {err && <div className="mt-0.5 text-xs text-rose-300">{err}</div>}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-slate-400">{user.email}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block rounded-md border px-2 py-0.5 text-xs font-semibold",
              ROLE_COLOR[user.role]
            )}
          >
            {user.role}
          </span>
          <select
            value={user.role}
            onChange={(e) => changeRole(e.target.value as AppRole)}
            disabled={pending}
            className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50"
            aria-label={`Change role for ${fullName}`}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
        </div>
      </td>
      <td className="px-4 py-3">
        {user.tier ? (
          <span
            className={cn(
              "inline-block rounded-md border px-2 py-0.5 text-xs font-semibold",
              TIER_COLOR[user.tier]
            )}
          >
            {TIER_LABEL[user.tier]}
          </span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {user.role === "parent" ? (
          <button
            onClick={onManageLinks}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
          >
            <Link2 className="h-3.5 w-3.5" />
            {user.linked_student_count} linked · manage
          </button>
        ) : user.role === "student" ? (
          <DiagnosticRetakeButton
            userId={user.id}
            pendingRetakes={user.diagnostic_retakes_remaining}
          />
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>
      <td className="px-2 py-3">
        {user.role !== "admin" && <ImpersonateButton userId={user.id} userName={fullName} />}
      </td>
    </tr>
  );
}

// ─── Impersonate button — audit issue #17 ───────────────────
// Server-action call sets the role + user_id cookies and redirects
// to the target's dashboard. Confirms before navigation since this
// is a context switch the admin may not expect on a stray click.
function ImpersonateButton({ userId, userName }: { userId: string; userName: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (
          !confirm(
            `Impersonate ${userName}?\n\nYou'll see their dashboard with their data. Click the banner × to exit.`
          )
        )
          return;
        startTransition(() => actionImpersonateUser(userId));
      }}
      disabled={pending}
      title="Impersonate this user — see their dashboard with their data (read-only; mutations go to your admin row)."
      className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
      Impersonate
    </button>
  );
}

// ─── Parent-link dialog ─────────────────────────────────────

function ParentLinksDialog({
  parent,
  allStudents,
  onClose,
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

  const parentName =
    [parent.first_name, parent.last_name].filter(Boolean).join(" ") || parent.email;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-slate-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-white">Linked students</h2>
        <p className="mt-1 text-sm text-slate-400">
          Choose which students <span className="font-semibold text-white">{parentName}</span> can
          see in their parent portal.
        </p>

        <div className="mt-5">
          {!loaded ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : linked.length === 0 ? (
            <p className="text-sm italic text-slate-500">No students linked yet.</p>
          ) : (
            <ul className="space-y-2">
              {linked.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                >
                  <div>
                    <div className="text-sm text-white">
                      {[s.first_name, s.last_name].filter(Boolean).join(" ") || s.email}
                    </div>
                    <div className="font-mono text-xs text-slate-500">{s.email}</div>
                  </div>
                  <button
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    className="text-slate-500 hover:text-rose-300 disabled:opacity-50"
                    aria-label={`Unlink ${s.email}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Add a student
          </label>
          <div className="flex gap-2">
            <select
              value={studentToAdd}
              onChange={(e) => setStudentToAdd(e.target.value)}
              className="flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="">Select a student…</option>
              {eligible.map((s) => {
                const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;
                return (
                  <option key={s.id} value={s.id}>
                    {name} · {s.email}
                  </option>
                );
              })}
            </select>
            <button
              onClick={add}
              disabled={!studentToAdd || pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Link
            </button>
          </div>
          {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Diagnostic retake button (students only) ───────────────
//
// Admin click increments users.diagnostic_retakes_remaining; the
// student then sees a "Retake diagnostic" CTA on /diagnostic and
// /progress until they consume it. Pending grants count is shown
// inline so the admin doesn't accidentally double-grant.
function DiagnosticRetakeButton({
  userId,
  pendingRetakes,
}: {
  userId: string;
  pendingRetakes: number;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onGrant() {
    setErr(null);
    startTransition(async () => {
      try {
        await actionGrantDiagnosticRetake(userId);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        onClick={onGrant}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
        title="Grant this student one diagnostic retake"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCcw className="h-3.5 w-3.5" />
        )}
        Allow retake
      </button>
      {pendingRetakes > 0 ? (
        <span className="text-[10px] text-emerald-400/80">
          {pendingRetakes} pending grant{pendingRetakes === 1 ? "" : "s"}
        </span>
      ) : null}
      {err ? <span className="text-[11px] text-rose-300">{err}</span> : null}
    </div>
  );
}
