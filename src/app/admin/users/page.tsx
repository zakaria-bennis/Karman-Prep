// ============================================================
// /admin/users — list every user, change roles, manage
// parent-student links.
// ============================================================

import type { Metadata } from "next";
import { fetchAdminCohortsLite, fetchAdminUsersList } from "@/lib/supabase/queries/users";
import Link from "next/link";
import UsersClient from "./UsersClient";

export const metadata: Metadata = { title: "Admin — Users | Karman" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, cohorts] = await Promise.all([fetchAdminUsersList(), fetchAdminCohortsLite()]);
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <p className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <Link className="kp-link" href="/admin/students">
          Students, as their tutor sees them
        </Link>
        <Link className="kp-link" href="/admin/tutors">
          Tutors and their students
        </Link>
      </p>
      <UsersClient users={users} cohorts={cohorts} />
    </div>
  );
}
