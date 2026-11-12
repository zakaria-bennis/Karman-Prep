/*
 * /dashboard/student/rewards: where tokens are spent (portal laws: "tokens only buy mystery
 * boxes, so they live on Rewards"). The balance and the distance to the next box, the box to
 * open, the companions earned and the accessories found. Real data: tokens from the quiz engine's
 * point awards, boxes, companions and what the companion wears from the rewards tables
 * (supabase/migrations/20261112231500_rewards.sql).
 */
import type { Metadata } from "next";
import StudentPortal from "@/components/student-portal/StudentPortal";
import { RewardsView } from "@/components/rewards/RewardsView";
import { loadStudentContext } from "@/lib/student/context";
import { loadRewardState } from "@/lib/rewards/server";

export const metadata: Metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

export default async function StudentRewardsPage() {
  const ctx = await loadStudentContext();
  const state = await loadRewardState(ctx.clerkId, { write: !ctx.isImpersonating }).catch(
    (error: unknown) => {
      console.error("[rewards] page", error instanceof Error ? error.message : error);
      return null;
    }
  );
  return (
    <StudentPortal ctx={ctx} title="Rewards">
      <RewardsView initial={state} preview={ctx.isImpersonating} />
    </StudentPortal>
  );
}
