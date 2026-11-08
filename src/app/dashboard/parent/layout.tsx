// ============================================================
// /dashboard/parent/* — role-gated layout. Only parents and admins
// pass; students and tutors who wander in go to their own dashboard.
// The pages draw the painted portal shell themselves.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId, resolveEffectiveRole } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";

export default async function ParentDashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId } = await resolveEffectiveClerkId(realUserId);

  const role = await resolveEffectiveRole(userId);
  if (role !== "parent" && role !== "admin") {
    redirect("/dashboard/student");
  }

  return <>{children}</>;
}
