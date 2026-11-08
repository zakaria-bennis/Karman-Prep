"use client";

// ============================================================
// UsersClient — the People list: role tabs, cohort filter,
// search, and one dense table (stacked cards under 768px).
// Each row: role editor, plan, parent links or diagnostic
// retake, impersonate.
// ============================================================

import { useMemo, useState, useTransition } from "react";
import { PRACTICE_PLAN, PRO_PLAN, TUTOR_AFFILIATE_PLAN } from "@/lib/marketing/offer";
import type { AdminCohortLite, AdminUserRow } from "@/lib/supabase/queries/users";
import type { AppRole } from "@/lib/supabase/queries/admin";
import { WbPill, WbTable, WbToolbar, type Tone } from "@/components/admin/workbench";
import { actionGrantDiagnosticRetake, actionSetUserRole } from "./actions";
import { actionImpersonateUser } from "@/app/admin/impersonation-actions";
import { tierLabelOf } from "@/lib/scheduling/tiers";
import ParentLinksDialog from "./ParentLinksDialog";

const ROLE_OPTIONS: AppRole[] = ["student", "tutor", "parent", "admin"];

const ROLE_LABEL: Record<AppRole, string> = {
  student: "Student",
  tutor: "Tutor",
  parent: "Parent",
  admin: "Admin",
  // Set by the $199 tutor plan's checkout, not from this screen.
  affiliate_tutor: "Affiliate tutor",
};

const ROLE_TONE: Record<AppRole, Tone> = {
  student: "neutral",
  tutor: "info",
  parent: "info",
  admin: "warn",
  affiliate_tutor: "ok",
};

type SubPlan = NonNullable<AdminUserRow["plan_id"]>;
const PLAN_LABEL: Record<SubPlan, string> = {
  practice: PRACTICE_PLAN.name,
  pro: PRO_PLAN.name,
  "tutor-affiliate": TUTOR_AFFILIATE_PLAN.name,
};

const ROLE_TABS = ["all", "student", "tutor", "parent", "admin"] as const;

const ACTIVE_TAB = { borderColor: "var(--wb-ink)", fontWeight: 600 } as const;

interface Props {
  users: AdminUserRow[];
  cohorts: AdminCohortLite[];
}

const nameOf = (u: { first_name: string | null; last_name: string | null }) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ");

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
      affiliate_tutor: 0,
    };
    for (const u of users) c[u.role]++;
    return c;
  }, [users]);

  const filtersOn = roleFilter !== "all" || cohortFilter !== "all" || search.trim().length > 0;
  function clearFilters() {
    setRoleFilter("all");
    setCohortFilter("all");
    setSearch("");
  }

  return (
    <>
      <WbToolbar>
        <div className="wb-tabs" role="group" aria-label="Filter by role">
          {ROLE_TABS.map((r) => (
            <button
              key={r}
              type="button"
              className="wb-tab"
              aria-pressed={roleFilter === r}
              style={roleFilter === r ? ACTIVE_TAB : undefined}
              onClick={() => setRoleFilter(r)}
            >
              {r === "all" ? "Everyone" : `${ROLE_LABEL[r]}s`}
              <small>{counts[r]}</small>
            </button>
          ))}
        </div>
        <div className="wb-search">
          <input
            className="wb-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
            aria-label="Search by name or email"
          />
        </div>
        <select
          className="wb-select"
          style={{ width: "auto", maxWidth: "100%" }}
          aria-label="Filter users by cohort"
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
        >
          <option value="all">All cohorts ({cohorts.length})</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({tierLabelOf(c.tier)})
            </option>
          ))}
        </select>
      </WbToolbar>

      <p className="wb-note" aria-live="polite">
        {filtered.length} of {users.length} shown
      </p>

      <WbTable<AdminUserRow>
        caption="People"
        rows={filtered}
        rowKey={(u) => u.id}
        empty={
          filtersOn ? (
            <>
              <b>No one matches these filters.</b>
              <button type="button" className="wb-btn" onClick={clearFilters}>
                Clear filters
              </button>
            </>
          ) : (
            <>
              <b>No people yet.</b>
              People show up here once they sign up.
            </>
          )
        }
        columns={[
          {
            key: "name",
            label: "Name",
            cell: (u) => (
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                {nameOf(u) || "—"}
                <small>{u.email}</small>
              </span>
            ),
          },
          { key: "role", label: "Role", cell: (u) => <RoleCell user={u} /> },
          {
            key: "plan",
            label: "Plan",
            cell: (u) => (u.plan_id ? <WbPill tone="ok">{PLAN_LABEL[u.plan_id]}</WbPill> : "—"),
          },
          {
            key: "links",
            label: "Links",
            cell: (u) =>
              u.role === "parent" ? (
                <button type="button" className="wb-btn" onClick={() => setLinkingParent(u)}>
                  {u.linked_student_count} linked, manage
                </button>
              ) : u.role === "student" ? (
                <DiagnosticRetakeButton
                  userId={u.id}
                  pendingRetakes={u.diagnostic_retakes_remaining}
                />
              ) : (
                "—"
              ),
          },
          {
            key: "act",
            label: "",
            cell: (u) =>
              u.role !== "admin" ? (
                <ImpersonateButton userId={u.id} userName={nameOf(u) || "—"} />
              ) : null,
          },
        ]}
      />

      {linkingParent && (
        <ParentLinksDialog
          parent={linkingParent}
          allStudents={students}
          onClose={() => setLinkingParent(null)}
        />
      )}
    </>
  );
}

// ─── Role editor ─────────────────────────────────────────────

function RoleCell({ user }: { user: AdminUserRow }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const fullName = nameOf(user) || "—";

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

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <WbPill tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</WbPill>
      <select
        className="wb-select"
        style={{ width: "auto", minHeight: 32 }}
        value={user.role}
        onChange={(e) => changeRole(e.target.value as AppRole)}
        disabled={pending}
        aria-label={`Change role for ${fullName}`}
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {pending && <small>Saving…</small>}
      {err && (
        <small role="alert" style={{ color: "var(--wb-bad)" }}>
          {err}
        </small>
      )}
    </span>
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
      type="button"
      className="wb-btn"
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
    >
      Impersonate
    </button>
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
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start" }}>
      <button
        type="button"
        className="wb-btn"
        onClick={onGrant}
        disabled={pending}
        title="Grant this student one diagnostic retake"
      >
        {pending ? "Saving…" : "Allow retake"}
      </button>
      {pendingRetakes > 0 ? (
        <small>
          {pendingRetakes} pending grant{pendingRetakes === 1 ? "" : "s"}
        </small>
      ) : null}
      {err ? (
        <small role="alert" style={{ color: "var(--wb-bad)" }}>
          {err}
        </small>
      ) : null}
    </span>
  );
}
