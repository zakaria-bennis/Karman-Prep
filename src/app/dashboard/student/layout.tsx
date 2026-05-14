// ============================================================
// /dashboard/student/* — onboarding gate.
//
// If the signed-in student hasn't completed the post-payment
// questionnaire (users.onboarding_completed_at IS NULL), bounce
// them to /onboarding/questionnaire. They land back here once
// the submit endpoint sets the flag.
//
// Existing page-level subscription/auth checks remain — this
// layout only adds the onboarding redirect on top.
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";

export default async function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("onboarding_completed_at")
    .eq("clerk_id", userId)
    .maybeSingle();

  // No row yet (first-time visitor before sync-user fires) — let
  // the page handle that case (it'll likely redirect to /onboarding).
  if (user && user.onboarding_completed_at === null) {
    redirect("/onboarding/questionnaire");
  }

  return <>{children}</>;
}
