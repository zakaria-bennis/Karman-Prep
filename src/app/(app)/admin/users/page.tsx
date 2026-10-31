// ============================================================
// /admin/users — list every user, change roles, manage
// parent-student links.
// ============================================================

import type { Metadata } from "next";
import { fetchAdminCohortsLite, fetchAdminUsersList } from "@/lib/supabase/queries/users";
import UsersClient from "./UsersClient";

export const metadata: Metadata = { title: "Admin — Users | Karman" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, cohorts] = await Promise.all([fetchAdminUsersList(), fetchAdminCohortsLite()]);
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <UsersClient users={users} cohorts={cohorts} />
    </div>
  );
}
