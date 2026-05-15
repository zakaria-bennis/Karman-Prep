"use server";

// ============================================================
// Server Actions — Admin cohort management
// Role-gated: admin only.
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/queries/admin";
import { unarchiveCohort } from "@/lib/supabase/queries/cohorts";
import type { CohortStatus, CohortTier } from "@/lib/supabase/queries/cohorts";
import { createCohortInputSchema } from "../schemas";

async function guardAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await requireRole(userId, ["admin"]);
  if (!ok) throw new Error("Admin role required");
  return userId;
}

export interface CreateCohortInput {
  name: string;
  tier: CohortTier;
  sat_date: string; // ISO date (YYYY-MM-DD)
  tutor_user_id: string; // users.id
  max_size: number;
  current_topic?: string | null;
  status?: CohortStatus; // default 'forming'
}

export async function actionCreateCohort(input: CreateCohortInput): Promise<{ id: string }> {
  // Schema enforces: non-empty trimmed name, valid tier + status enums,
  // YYYY-MM-DD sat_date, positive-int max_size within the per-tier cap.
  // Replaces the inline checks that used to live here.
  const v = createCohortInputSchema.parse(input);
  await guardAdmin();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cohorts")
    .insert({
      name: v.name,
      tier: v.tier,
      sat_date: v.sat_date,
      tutor_user_id: v.tutor_user_id,
      max_size: v.max_size,
      current_topic: v.current_topic?.trim() || null,
      status: v.status ?? "forming",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/cohorts");
  return { id: data.id as string };
}

/**
 * Manually un-archive a cohort that was auto-archived after dropping to
 * zero active members (PR #32). The cohort reappears on every dashboard
 * + list immediately. Useful when an admin wants to revive a previously-
 * empty cohort rather than spin up a fresh one. Audit #13.
 *
 * No-op if the cohort isn't archived. Returns silently regardless so
 * the client can blanket call it without precondition checks.
 */
export async function actionUnarchiveCohort(cohortId: string): Promise<void> {
  await guardAdmin();
  if (!cohortId) throw new Error("Missing cohortId");
  await unarchiveCohort(cohortId);
  revalidatePath("/admin/cohorts");
  revalidatePath(`/admin/cohorts/${cohortId}`);
}
