// ============================================================
// /tutor/* — role-gated layout.
// Staff tutors and admins get the painted portal shell with the
// staff tabs (src/components/tutor/staff/). Affiliate tutors (the
// $199 plan) pass too; their pages draw the painted shell with
// their own tabs (src/components/tutor-affiliate/). Staff-only
// routes sit in (staff)/ (plus [studentId]/briefing and practice),
// whose layout sends affiliate tutors back to /tutor.
//
// Protects every sub-route automatically (no need to repeat
// the role check in each page component).
// ============================================================

import { redirect } from "next/navigation";
import TutorStaffShell from "@/components/tutor/staff/TutorStaffShell";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId, resolveEffectiveRole } from "@/lib/supabase/queries/admin";
import { fetchUserNameAndEmail } from "@/lib/tutor-affiliate/profile";

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId } = await resolveEffectiveClerkId(realUserId);

  const role = await resolveEffectiveRole(userId);
  if (role === "affiliate_tutor") return <>{children}</>;
  if (role !== "tutor" && role !== "admin") {
    redirect("/dashboard/student");
  }

  const me = await fetchUserNameAndEmail(userId);
  return (
    <TutorStaffShell name={me.firstName} email={me.email} isAdmin={role === "admin"}>
      {children}
    </TutorStaffShell>
  );
}
