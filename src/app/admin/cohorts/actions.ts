"use server";

// ============================================================
// Server Actions — Admin cohort management
// Role-gated: admin only.
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/queries/admin";
import type { CohortStatus, CohortTier } from "@/lib/supabase/queries/cohorts";

// Hard caps mirrored from the DB CHECK constraint in migration 006.
// Kept in sync here so the UI can validate before the DB round-trips.
const TIER_MAX_CAP: Record<CohortTier, number> = {
  small_group: 5,
  group: 200,
};

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
  await guardAdmin();

  // Validate input before sending to the DB — friendlier errors.
  const name = input.name?.trim();
  if (!name) throw new Error("Cohort name is required");
  if (!["group", "small_group"].includes(input.tier)) {
    throw new Error(`Invalid tier: ${input.tier}`);
  }
  if (!input.sat_date) throw new Error("SAT date is required");
  if (!input.tutor_user_id) throw new Error("Tutor is required");

  const cap = TIER_MAX_CAP[input.tier];
  if (!Number.isInteger(input.max_size) || input.max_size < 1) {
    throw new Error("Max size must be a positive integer");
  }
  if (input.max_size > cap) {
    throw new Error(`Max size for ${input.tier === "group" ? "Seminar" : "Small Group"} is ${cap}`);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cohorts")
    .insert({
      name,
      tier: input.tier,
      sat_date: input.sat_date,
      tutor_user_id: input.tutor_user_id,
      max_size: input.max_size,
      current_topic: input.current_topic?.trim() || null,
      status: input.status ?? "forming",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/cohorts");
  return { id: data.id as string };
}
