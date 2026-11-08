// ============================================================
// /admin/schools — school pilots, derived from school seats in
// plan_grants (source 'school', grouped by source_ref). The
// first year is free; renewal is one year after the first seat.
// There is no schools table yet.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  WbEmpty,
  WbPage,
  WbPill,
  WbStats,
  WbTable,
  formatDate,
  type Tone,
} from "@/components/admin/workbench";
import {
  groupSchools,
  loadGrants,
  loadUsers,
  personName,
  type SchoolStatus,
  type SchoolSummary,
} from "@/lib/admin/plans";

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

export default async function SchoolsPage() {
  const grants = await loadGrants();
  const now = new Date();
  const schools = groupSchools(grants.rows, now);
  const studentIds = [...new Set(schools.flatMap((s) => s.studentIds))];
  const users = await loadUsers({ column: "clerk_id", values: studentIds });
  const byClerk = new Map(users.rows.map((u) => [u.clerkId ?? "", u]));

  if (schools.length === 0) {
    return (
      <WbPage
        title="Schools"
        summary="Free-year pilots, their students and renewals."
        actions={<Links />}
      >
        {grants.error && (
          <p role="alert" className="wb-alert">
            School seats couldn&apos;t be read: {grants.error}
          </p>
        )}
        <WbEmpty title="No schools yet">
          <p className="wb-note">
            Schools appear here once school seats are granted.
            {!grants.available && !grants.error
              ? " The plan_grants table isn't on this database yet; it comes with the pricing update."
              : ""}
          </p>
        </WbEmpty>
      </WbPage>
    );
  }

  return (
    <WbPage
      title="Schools"
      summary="Free-year pilots, their students and renewals."
      actions={<Links />}
    >
      {users.error && (
        <p role="alert" className="wb-alert">
          Student names couldn&apos;t be read: {users.error}
        </p>
      )}
      <WbStats
        items={[
          { label: "Schools", value: schools.length },
          { label: "Students", value: studentIds.length },
          {
            label: "Renewals due in 30 days",
            value: schools.filter((s) => s.status === "due").length,
          },
          { label: "Lapsed", value: schools.filter((s) => s.status === "lapsed").length },
        ]}
      />
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
    </WbPage>
  );
}
