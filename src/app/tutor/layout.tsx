// ============================================================
// /tutor/* — role-gated layout.
// Staff tutors and admins get the dashboard chrome. Affiliate tutors
// (the $199 plan) pass too; their pages draw the painted portal shell
// themselves (src/components/tutor-affiliate/).
//
// Protects every sub-route automatically (no need to repeat
// the role check in each page component).
// ============================================================

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";
import { resolveEffectiveRole } from "@/lib/supabase/queries/admin";

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId } = await resolveEffectiveClerkId(realUserId);

  const role = await resolveEffectiveRole(userId);
  if (role === "affiliate_tutor") return <>{children}</>;
  if (role !== "tutor" && role !== "admin") {
    redirect("/dashboard/student");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
