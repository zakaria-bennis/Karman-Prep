// ============================================================
// Student Dashboard Home
// Shows streak, progress ring, domain bars, and next lesson.
// ============================================================

import type { Metadata } from "next";
import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import StudentDashboardClient from "@/components/dashboard/StudentDashboardClient";
import { domainScoresSchema, type DomainScores } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function StudentDashboardPage() {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId, isImpersonating } = await resolveEffectiveClerkId(realUserId);

  const supabase = createAdminClient();

  // Check subscription status — redirect to billing if not subscribed.
  // Skip the gate when impersonating: the admin is debugging a student
  // and should see their dashboard regardless of subscription state.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  const isActive = sub?.status === "active" || sub?.status === "trialing";
  if (!isActive && !isImpersonating) redirect("/billing?required=1");

  // Fetch user info
  const { data: user } = await supabase.from("users").select("*").eq("clerk_id", userId).single();

  // Placement-failure banner check (audit #10):
  //   show "we're matching you with a tutor" when the user's
  //   onboarding flagged the placement_failure_at column AND they
  //   still have no active cohort_members / tutor_assignments row.
  //   The second condition makes the banner self-clear once an
  //   admin places them, so we don't need a manual "resolve" action.
  let showPlacementBanner = false;
  if (user?.id && (user as { placement_failure_at?: string | null }).placement_failure_at) {
    const [{ count: cohortCount }, { count: tutorCount }] = await Promise.all([
      supabase
        .from("cohort_members")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("left_at", null),
      supabase
        .from("tutor_assignments")
        .select("student_user_id", { count: "exact", head: true })
        .eq("student_user_id", user.id)
        .is("ended_at", null),
    ]);
    showPlacementBanner = (cohortCount ?? 0) === 0 && (tutorCount ?? 0) === 0;
  }

  // Fetch progress across all concepts
  const { data: progress } = await supabase
    .from("progress")
    .select("*, concepts(*)")
    .eq("user_id", user?.id || "")
    .order("last_visited", { ascending: false });

  // Fetch latest diagnostic result
  const { data: diagnostic } = await supabase
    .from("diagnostic_results")
    .select("*")
    .eq("user_id", user?.id || "")
    .order("taken_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch learn_node_status — keyed by Clerk userId (the string) directly
  const { data: nodeStatusRows } = await supabase
    .from("learn_node_status")
    .select("node_id, status")
    .eq("user_id", userId);

  const nodeStatuses = new Map(
    (nodeStatusRows ?? []).map((r) => {
      const row = r as { node_id: string; status: string };
      return [row.node_id, row.status] as const;
    })
  );

  // Validate `domain_scores` at the DB → render boundary. The column
  // is `jsonb` (opaque) in Postgres, so without this parse a schema
  // drift would leak through compile-time as `unknown as DomainScores`.
  // `safeParse` so we degrade gracefully — the chart hides itself
  // when scores are null rather than crashing the whole dashboard.
  let parsedScores: DomainScores | null = null;
  if (diagnostic) {
    const parsed = domainScoresSchema.safeParse(diagnostic.domain_scores);
    if (parsed.success) {
      parsedScores = parsed.data;
    }
  }

  return (
    <StudentDashboardClient
      user={user}
      progress={progress || []}
      nodeStatuses={nodeStatuses as Map<string, import("@/data/curriculum").NodeStatus>}
      diagnostic={
        diagnostic && parsedScores
          ? {
              score_range_low: diagnostic.score_range_low,
              score_range_high: diagnostic.score_range_high,
              domain_scores: parsedScores,
            }
          : null
      }
      subscription={sub}
      showPlacementBanner={showPlacementBanner}
    />
  );
}
