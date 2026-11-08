// ============================================================
// /diagnostic — 35-question SAT diagnostic.
//
// Gate model:
//   · Signed-out          → sign-in (need a user_id to persist).
//   · Already taken once  → REDIRECT to /dashboard/student/progress.
//                           The diagnostic is one-and-done; re-takes
//                           require an admin reset (reset script).
//   · Otherwise           → take it. Results CTA copy depends on
//                           subscription status (paying → "learning
//                           path", non-paying → checkout).
//
// Note: paying subscribers are NOT forced into the diagnostic
// (no nav links push them in), but if they explicitly click
// "Take the diagnostic" from /progress, we let them through.
// Bouncing them produces a redirect loop with that page's CTA.
// ============================================================

import type { Metadata } from "next";
import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import { getPlan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/server";
import DiagnosticClient from "@/components/diagnostic/DiagnosticClient";
import { DIAGNOSTIC_QUESTIONS } from "@/data/diagnostic-questions";

export const metadata: Metadata = { title: "SAT Diagnostic — 35 Questions" };

export default async function DiagnosticPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in?redirect_url=/diagnostic");

  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, diagnostic_retakes_remaining, timing_accommodation")
    .eq("clerk_id", userId)
    .maybeSingle();

  let isRetake = false;
  if (user?.id) {
    const { count } = await supabase
      .from("diagnostic_results")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    const hasPriorResult = (count ?? 0) > 0;
    // Gate: if they've already taken it AND no retake grant is
    // pending, send them to /progress. With a grant > 0 the page
    // lets them through and the submit handler decrements the
    // counter atomically.
    if (hasPriorResult && (user.diagnostic_retakes_remaining ?? 0) <= 0) {
      redirect("/dashboard/student/progress");
    }
    isRetake = hasPriorResult;
  }

  // Paid means any plan above Free: a subscription, a cohort or private
  // purchase, a school seat or a tutor's code (src/lib/plans).
  const plan = await getPlan(userId);
  const isSubscribed = plan.planId !== "free";

  return (
    <DiagnosticClient
      questions={DIAGNOSTIC_QUESTIONS}
      isSubscribed={isSubscribed}
      isRetake={isRetake}
      accommodation={
        user?.timing_accommodation === "time_and_half" || user?.timing_accommodation === "double"
          ? user.timing_accommodation
          : "standard"
      }
    />
  );
}
