// ============================================================
// Student Dashboard Home
// Gives students one place to continue lessons and practice.
// ============================================================

import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { loadStudentContext } from "@/lib/student/context";
import StudentDashboardClient from "@/components/dashboard/StudentDashboardClient";
import { fetchLegacyLearningHistory } from "@/lib/supabase/queries/skill-catalog";
import { fetchAllAttemptsForStudent } from "@/lib/supabase/queries/quiz/attempts";
import { buildLearnDashboard } from "@/lib/learn/dashboard";
import { loadOwnCatalogPracticeHistory } from "@/lib/catalog-practice/history-server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function StudentDashboardPage() {
  // No live subscription is the Free plan: the portal opens with honest locks (2026-11-08).
  const ctx = await loadStudentContext();
  const userId = ctx.clerkId;
  const supabase = createAdminClient();
  const sub = ctx.subscription as { status: string; trial_end: string | null } | null;
  // "We're matching you with a tutor" shows while onboarding flagged a placement failure and
  // no cohort or tutor has the student yet (audit #10); it clears itself once they're placed.
  const { data: placement } = await supabase
    .from("users")
    .select("placement_failure_at")
    .eq("id", ctx.userId)
    .maybeSingle();
  const showPlacementBanner =
    !!(placement as { placement_failure_at?: string | null } | null)?.placement_failure_at &&
    !ctx.hasTutor;

  const [history, attempts, diagnosticResult, skillHistory] = await Promise.all([
    fetchLegacyLearningHistory(userId),
    fetchAllAttemptsForStudent(userId),
    supabase
      .from("diagnostic_results")
      .select("score_range_low, score_range_high")
      .eq("user_id", ctx.userId)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadOwnCatalogPracticeHistory(),
  ]);

  return (
    <StudentDashboardClient
      dashboard={buildLearnDashboard(history, attempts, skillHistory)}
      diagnostic={diagnosticResult.data}
      subscription={sub}
      showPlacementBanner={showPlacementBanner}
      ctx={ctx}
    />
  );
}
