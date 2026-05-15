// ============================================================
// /dashboard/parent/* — role-gated layout.
// Only users with role in {'parent','admin'} can pass.
// Students and tutors who wander in are bounced to their
// own dashboard.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";
import { resolveEffectiveRole } from "@/lib/supabase/queries/admin";

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
