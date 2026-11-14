// ============================================================
// /dashboard/student/* — onboarding gate.
//
// If a signed-in student on a taught plan hasn't completed the
// post-payment questionnaire (users.onboarding_completed_at IS NULL),
// bounce them to /onboarding/questionnaire. Everyone else goes straight in. They land back here once
// the submit endpoint sets the flag.
//
// Parents and tutors return to their own portals before student
// onboarding or subscription checks run. Admin previews remain available.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { getPlan } from "@/lib/plans/resolve";
import { ensureUserRow } from "@/lib/auth/ensure-user";

const TAUGHT_PLANS = ["cohort", "private-10", "private-20"] as const;

export default async function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId, isImpersonating } = await resolveEffectiveClerkId(realUserId);

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("role, onboarding_completed_at")
    .eq("clerk_id", userId)
    .maybeSingle();

  // a brand-new account arriving straight from sign-up: make its record now
  if (!user && !isImpersonating) await ensureUserRow(userId);

  if (user?.role === "parent") redirect("/dashboard/parent");
  if (user?.role === "tutor" || user?.role === "affiliate_tutor") redirect("/tutor");

  // When impersonating, never bounce the admin to /onboarding — they
  // already have their own admin account and the target's onboarding
  // state shouldn't redirect THEM through onboarding.
  if (isImpersonating) {
    return <>{children}</>;
  }

  // No row yet (first-time visitor before sync-user fires) — let
  // the page handle that case (it'll likely redirect to /onboarding).
  // Free, Practice and Pro students go straight in (founder, 2026-11-13). Only a student on a taught plan
  // (the cohort or private tutoring) is asked for the questionnaire first.
  if (user && user.onboarding_completed_at === null) {
    const plan = await getPlan(userId);
    if ((TAUGHT_PLANS as readonly string[]).includes(plan.planId))
      redirect("/onboarding/questionnaire");
  }

  return <>{children}</>;
}
