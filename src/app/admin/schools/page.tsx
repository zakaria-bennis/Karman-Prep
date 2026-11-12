// ============================================================
// /admin/schools — the "book a call" requests schools send from
// /schools (newest first), "Create school" (a schools row and its
// admin in school_members), the schools on file, and the pilots
// derived from school seats in plan_grants (source 'school',
// grouped by source_ref). The first year is free; renewal is one
// year after the first seat.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  WbEmpty,
  WbPage,
  WbPill,
  WbSection,
  WbStats,
  WbTable,
  formatDate,
  formatDateTime,
  type Tone,
} from "@/components/admin/workbench";
import {
  groupSchools,
  loadGrants,
  loadUsers,
  personName,
  type AdminUserRow,
  type SchoolStatus,
  type SchoolSummary,
} from "@/lib/admin/plans";
import {
  loadSchoolRequests,
  loadSchoolsOnFile,
  type SchoolOnFile,
  type SchoolRequest,
} from "@/lib/admin/school-requests";
import CreateSchoolForm from "./CreateSchoolForm";
import { isoDay, oneYearOut } from "./schemas";

export const metadata: Metadata = { title: "Schools" };
export const dynamic = "force-dynamic";

const STATUS: Record<SchoolStatus, { label: string; tone: Tone }> = {
  pilot: { label: "Free pilot", tone: "ok" },
  due: { label: "Renewal due", tone: "warn" },
  lapsed: { label: "Lapsed", tone: "fail" },
};

function Links() {
  return (
    <>
      <Link href="/admin/plans">Plans and subscriptions</Link>
      <Link href="/admin/affiliates">Affiliate tutors</Link>
    </>
  );
}

function Pilots({
  schools,
  byClerk,
}: {
  schools: SchoolSummary[];
  byClerk: Map<string, AdminUserRow>;
}) {
  return (
    <WbTable<SchoolSummary>
      caption="Schools with student seats"
      rows={schools}
      rowKey={(s) => s.ref}
      empty={<b>No schools yet.</b>}
      columns={[
        { key: "school", label: "School", cell: (s) => s.ref },
        { key: "students", label: "Students", numeric: true, cell: (s) => s.studentIds.length },
        { key: "start", label: "Pilot start", cell: (s) => formatDate(s.pilotStart) },
        {
          key: "renewal",
          label: "Renewal",
          cell: (s) => (
            <>
              {formatDate(s.renewsAt)}
              <small>
                {s.daysLeft > 0
                  ? `in ${s.daysLeft} ${s.daysLeft === 1 ? "day" : "days"}`
                  : `${-s.daysLeft} days ago`}
              </small>
            </>
          ),
        },
        {
          key: "status",
          label: "Status",
          cell: (s) => <WbPill tone={STATUS[s.status].tone}>{STATUS[s.status].label}</WbPill>,
        },
        {
          key: "list",
          label: "Student list",
          cell: (s) =>
            s.studentIds.length === 0 ? (
              "No students"
            ) : (
              <details style={{ flex: "1 1 auto", textAlign: "left", minWidth: 0 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>Show students</summary>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
                  {s.studentIds.map((id) => {
                    const u = byClerk.get(id);
                    return (
                      <li key={id}>
                        {u ? personName(u) : "Unknown student"}
                        <small>{u?.email ?? id}</small>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ),
        },
      ]}
    />
  );
}

const BILLING: Record<string, { label: string; tone: Tone }> = {
  free_year: { label: "Free year", tone: "ok" },
  renewal_set: { label: "Renewal set", tone: "info" },
  active: { label: "Paying", tone: "ok" },
  past_due: { label: "Past due", tone: "warn" },
  canceled: { label: "Canceled", tone: "fail" },
};

function Requests({ rows, onFile }: { rows: SchoolRequest[]; onFile: Map<string, string> }) {
  return (
    <WbTable<SchoolRequest>
      caption="School call requests, newest first"
      rows={rows}
      rowKey={(r) => r.id}
      empty={
        <>
          <b>No requests yet.</b>
          <p className="wb-note">They arrive from the Book a call form on /schools.</p>
        </>
      }
      columns={[
        { key: "sent", label: "Sent", cell: (r) => formatDateTime(r.sentAt) },
        {
          key: "school",
          label: "School",
          cell: (r) => (
            <>
              {r.school}
              {r.students && <small>{r.students} students</small>}
            </>
          ),
        },
        {
          key: "who",
          label: "Contact",
          cell: (r) => (
            <>
              {r.name ?? r.email}
              <small>{[r.role, r.email, r.phone].filter(Boolean).join(" · ")}</small>
            </>
          ),
        },
        {
          key: "when",
          label: "Start",
          cell: (r) => (
            <>
              {r.starting ?? "—"}
              <small>Call: {r.callTime ?? "any time"}</small>
            </>
          ),
        },
        {
          key: "status",
          label: "Status",
          cell: (r) =>
            r.schoolId ? (
              <WbPill tone="ok">School created{onFile.get(r.schoolId) ? "" : " (removed)"}</WbPill>
            ) : (
              <WbPill tone="info">New</WbPill>
            ),
        },
        {
          key: "crm",
          label: "CRM",
          cell: (r) => <Link href={`/admin/crm?q=${encodeURIComponent(r.email)}`}>Open</Link>,
        },
      ]}
    />
  );
}

function OnFile({ rows }: { rows: SchoolOnFile[] }) {
  return (
    <WbTable<SchoolOnFile>
      caption="Schools on file"
      rows={rows}
      rowKey={(s) => s.id}
      empty={<b>No schools created yet.</b>}
      columns={[
        { key: "name", label: "School", cell: (s) => s.name },
        {
          key: "admins",
          label: "School admin",
          cell: (s) => (s.admins.length ? s.admins.join(", ") : "No admin"),
        },
        { key: "free", label: "Free until", cell: (s) => formatDate(s.freeUntil) },
        {
          key: "billing",
          label: "Billing",
          cell: (s) => {
            const b = BILLING[s.billingStatus] ?? { label: s.billingStatus, tone: "neutral" };
            return <WbPill tone={b.tone as Tone}>{b.label}</WbPill>;
          },
        },
        { key: "created", label: "Created", cell: (s) => formatDate(s.createdAt) },
      ]}
    />
  );
}

export default async function SchoolsPage() {
  const now = new Date();
  const [grants, requests, onFile] = await Promise.all([
    loadGrants(),
    loadSchoolRequests(),
    loadSchoolsOnFile(),
  ]);
  const schools = groupSchools(grants.rows, now);
  const studentIds = [...new Set(schools.flatMap((s) => s.studentIds))];
  const users = await loadUsers({ column: "clerk_id", values: studentIds });
  const byClerk = new Map(users.rows.map((u) => [u.clerkId ?? "", u]));
  const fileNames = new Map(onFile.rows.map((s) => [s.id, s.name]));
  const open = requests.rows.filter((r) => !r.schoolId);
  const tomorrow = new Date(now.getTime() + 86_400_000);

  return (
    <WbPage
      title="Schools"
      summary="Call requests, school setup, free-year pilots and renewals."
      actions={<Links />}
    >
      {[
        ["Call requests", requests.error],
        ["Schools", onFile.error],
        ["School seats", grants.error],
        ["Student names", users.error],
      ].map(([what, error]) =>
        error ? (
          <p key={what} role="alert" className="wb-alert">
            {what} couldn&apos;t be read: {error}
          </p>
        ) : null
      )}
      <WbStats
        items={[
          { label: "New requests", value: open.length },
          { label: "Schools on file", value: onFile.rows.length },
          { label: "Seated students", value: studentIds.length },
          {
            label: "Renewals due in 30 days",
            value: schools.filter((s) => s.status === "due").length,
          },
        ]}
      />

      <WbSection title="School requests">
        <Requests rows={requests.rows} onFile={fileNames} />
      </WbSection>

      <WbSection title="Create school">
        <CreateSchoolForm
          requests={open.map((r) => ({ id: r.id, school: r.school, email: r.email }))}
          defaultFreeUntil={oneYearOut(now)}
          minFreeUntil={isoDay(tomorrow)}
        />
      </WbSection>

      <WbSection title="Schools on file">
        <OnFile rows={onFile.rows} />
      </WbSection>

      <WbSection title="Pilots by school seats">
        {schools.length === 0 ? (
          <WbEmpty title="No school seats yet">
            <p className="wb-note">
              Pilots appear here once school seats are granted.
              {!grants.available && !grants.error
                ? " The plan_grants table isn't on this database yet; it comes with the pricing update."
                : ""}
            </p>
          </WbEmpty>
        ) : (
          <Pilots schools={schools} byClerk={byClerk} />
        )}
      </WbSection>
    </WbPage>
  );
}
