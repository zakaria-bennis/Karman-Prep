// ============================================================
// /admin/users — list every user, change roles, manage
// parent-student links.
// ============================================================

import type { Metadata } from "next";
import { fetchAdminUsersList } from "@/lib/supabase/queries/users";
import UsersClient from "./UsersClient";

export const metadata: Metadata = { title: "Admin — Users | Strata" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await fetchAdminUsersList();
  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <UsersClient users={users} />
    </div>
  );
}
