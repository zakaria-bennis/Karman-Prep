// ============================================================
// /tutor/* — role-gated layout.
// Only users with role in {'tutor','admin'} can pass.
//
// Protects every sub-route automatically (no need to repeat
// the role check in each page component).
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { resolveEffectiveRole } from "@/lib/supabase/queries/admin";

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const role = await resolveEffectiveRole(userId);
  if (role !== "tutor" && role !== "admin") {
    redirect("/dashboard/student");
  }

  return <>{children}</>;
}
