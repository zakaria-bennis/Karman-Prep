// ============================================================
// /admin/users — the People page: every user, change roles,
// manage parent-student links, allow a diagnostic retake and
// impersonate. Built on the admin workbench kit.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { fetchAdminCohortsLite, fetchAdminUsersList } from "@/lib/supabase/queries/users";
import { WbMix, WbPage, WbStats } from "@/components/admin/workbench";
import UsersClient from "./UsersClient";

export const metadata: Metadata = { title: "Admin — People | Karman" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, cohorts] = await Promise.all([fetchAdminUsersList(), fetchAdminCohortsLite()]);
  const countRole = (role: string) => users.filter((u) => u.role === role).length;

  return (
    <WbPage
      title="People"
      summary="Everyone with an account. Change a role, link a parent to a student, allow a diagnostic retake, or see the app as someone else."
      actions={
        <>
          <Link className="kp-link" href="/admin/students">
            Students, as their tutor sees them
          </Link>
          <Link className="kp-link" href="/admin/tutors">
            Tutors and their students
          </Link>
        </>
      }
    >
      <WbStats
        items={[
          { label: "People", value: users.length },
          { label: "Students", value: countRole("student") },
          { label: "Parents", value: countRole("parent") },
          { label: "Tutors", value: countRole("tutor") + countRole("affiliate_tutor") },
          { label: "On a paid plan", value: users.filter((u) => u.plan_id).length },
        ]}
      />
      <WbMix
        title="Who is on Karman"
        note={`${users.length} accounts by role`}
        parts={[
          { label: "Students", value: countRole("student") },
          { label: "Parents", value: countRole("parent") },
          { label: "Tutors", value: countRole("tutor") },
          { label: "Affiliate tutors", value: countRole("affiliate_tutor") },
          { label: "Admins", value: countRole("admin") },
        ]}
      />
      <UsersClient users={users} cohorts={cohorts} />
    </WbPage>
  );
}
