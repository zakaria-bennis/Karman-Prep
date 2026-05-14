"use server";

// ============================================================
// Server Actions — Tutor cohort view
// Role-gated: tutor OR admin (admin can act on any cohort; tutors
// may only act on cohorts where they are the listed tutor).
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";

/**
 * Resolves the caller's users.id and verifies they can act on the
 * given cohort. Admins can act on any cohort; tutors only on theirs.
 * Throws a clear error when unauthorized.
 */
async function guardCohortAccess(cohortId: string): Promise<string /* tutor_user_id */> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const role = await fetchUserRole(userId);
  if (role !== "tutor" && role !== "admin") {
    throw new Error("Tutor or admin role required");
  }

  const supabase = createAdminClient();
  const { data: me } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (!me) throw new Error("User row not found");
  const callerUserId = me.id as string;

  const { data: cohort, error } = await supabase
    .from("cohorts")
    .select("tutor_user_id")
    .eq("id", cohortId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!cohort) throw new Error("Cohort not found");

  const cohortTutorId = (cohort as { tutor_user_id: string }).tutor_user_id;
  if (role === "tutor" && cohortTutorId !== callerUserId) {
    throw new Error("You are not the tutor of this cohort");
  }

  // Return the COHORT's tutor_user_id so homework rows are always
  // authored by the cohort's tutor — even if an admin posted it.
  return cohortTutorId;
}

// ─── Notes ───────────────────────────────────────────────────

export async function actionSaveCohortNote(cohortId: string, body: string) {
  const cohortTutorId = await guardCohortAccess(cohortId);
  const supabase = createAdminClient();

  // Upsert the single (tutor, cohort) note — the unique index in
  // migration 006 guarantees one document per pair.
  const { data: existing } = await supabase
    .from("tutor_notes")
    .select("id")
    .eq("tutor_user_id", cohortTutorId)
    .eq("cohort_id", cohortId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("tutor_notes")
      .update({ body })
      .eq("id", (existing as { id: string }).id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("tutor_notes").insert({
      tutor_user_id: cohortTutorId,
      cohort_id: cohortId,
      body,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/tutor/cohort/${cohortId}`);
  revalidatePath(`/admin/cohorts/${cohortId}`);
}

// ─── Homework ────────────────────────────────────────────────

export interface CreateHomeworkInput {
  title: string;
  body?: string;
  due_at?: string | null; // ISO datetime
}

export async function actionCreateHomework(cohortId: string, input: CreateHomeworkInput) {
  const cohortTutorId = await guardCohortAccess(cohortId);
  const title = input.title?.trim();
  if (!title) throw new Error("Title is required");

  const supabase = createAdminClient();
  const { error } = await supabase.from("cohort_homework").insert({
    cohort_id: cohortId,
    title,
    body: input.body?.trim() || null,
    due_at: input.due_at ?? null,
    created_by_user_id: cohortTutorId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/tutor/cohort/${cohortId}`);
  revalidatePath(`/admin/cohorts/${cohortId}`);
}

export async function actionDeleteHomework(cohortId: string, homeworkId: string) {
  await guardCohortAccess(cohortId);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("cohort_homework")
    .delete()
    .eq("id", homeworkId)
    .eq("cohort_id", cohortId); // defensive: scope by cohort too
  if (error) throw new Error(error.message);

  revalidatePath(`/tutor/cohort/${cohortId}`);
  revalidatePath(`/admin/cohorts/${cohortId}`);
}
