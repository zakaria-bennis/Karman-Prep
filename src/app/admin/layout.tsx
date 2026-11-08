// ============================================================
// /admin — role-gated (admin only) layout in the painted portal
// shell. Server actions and route handlers check the admin role
// again on their own (src/lib/auth/admin-guard.ts).
// ============================================================

import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import AdminShell from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");

  const { data: me } = await createAdminClient()
    .from("users")
    .select("role, first_name, email")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard/student");

  return (
    <AdminShell name={me.first_name ?? null} email={me.email ?? null}>
      {children}
    </AdminShell>
  );
}
