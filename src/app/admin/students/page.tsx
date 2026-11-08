// ============================================================
// /admin/students: every student account (users.role = student),
// newest first, with search by name or email. Open a student to
// see them exactly as a tutor does, plus their homework. Shows
// up to ROSTER_CAP rows; search finds anyone else.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  WbPage,
  WbSearch,
  WbStats,
  WbTable,
  WbToolbar,
  formatDate,
  formatDateTime,
} from "@/components/admin/workbench";
import { adminOrNull } from "@/lib/auth/admin-guard";
import {
  ROSTER_CAP,
  listStudentsForAdmin,
  type AdminStudentListRow,
  type StudentRoster,
} from "@/lib/admin/students";

export const metadata: Metadata = { title: "Students | Karman admin" };
export const dynamic = "force-dynamic";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await adminOrNull())) notFound();
  const raw = await searchParams;
  const q = (typeof raw.q === "string" ? raw.q : "").trim().slice(0, 200);

  let roster: StudentRoster = { rows: [], total: 0, lastQuizComplete: true };
  let loadError: string | null = null;
  try {
    roster = await listStudentsForAdmin(q);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Students could not be loaded.";
  }
  const capped = roster.total > roster.rows.length;

  return (
    <WbPage
      title="Students"
      summary="Every student account, newest first. Open one to see skills, every quiz answer and homework, exactly as a tutor sees them."
    >
      <WbStats
        items={[
          { label: q ? "Students matching" : "Students", value: roster.total },
          { label: "Shown here", value: roster.rows.length },
        ]}
      />
      <WbToolbar>
        <WbSearch
          label="Search students"
          placeholder="Name or email"
          value={q}
          action="/admin/students"
        />
      </WbToolbar>
      {loadError && (
        <p role="alert" className="wb-alert">
          Students could not be loaded. {loadError}
        </p>
      )}
      <WbTable<AdminStudentListRow>
        caption="Students"
        rows={roster.rows}
        rowKey={(r) => r.id}
        empty={
          loadError
            ? "No students to show."
            : q
              ? `No students match "${q}". Try part of a name or an email.`
              : "No students yet. They show up here when they sign up."
        }
        columns={[
          {
            key: "name",
            label: "Name",
            cell: (r) => (
              <Link href={`/admin/students/${encodeURIComponent(r.clerkId)}`}>{r.name}</Link>
            ),
          },
          { key: "email", label: "Email", cell: (r) => r.email || "—" },
          { key: "joined", label: "Joined", cell: (r) => formatDate(r.joinedAt) },
          { key: "last", label: "Last quiz", cell: (r) => formatDateTime(r.lastQuizAt) },
        ]}
      />
      {capped && (
        <p className="wb-note">
          Showing the newest {ROSTER_CAP} of {roster.total}. Search by name or email to find anyone
          else.
        </p>
      )}
      {!roster.lastQuizComplete && roster.rows.length > 0 && (
        <p className="wb-note">
          Last quiz could not be read for everyone. A dash can also mean an older quiz.
        </p>
      )}
    </WbPage>
  );
}
