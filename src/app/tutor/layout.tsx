// ============================================================
// /tutor/* — role-gated layout.
// Only users with role in {'tutor','admin'} can pass.
//
// Protects every sub-route automatically (no need to repeat
// the role check in each page component).
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";
import { resolveEffectiveRole } from "@/lib/supabase/queries/admin";

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId } = await resolveEffectiveClerkId(realUserId);

  const role = await resolveEffectiveRole(userId);
  if (role !== "tutor" && role !== "admin") {
    redirect("/dashboard/student");
  }

  return <>{children}</>;
}
