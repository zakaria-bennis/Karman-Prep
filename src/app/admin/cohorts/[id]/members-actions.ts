"use server";

// ============================================================
// Server Actions — Admin cohort membership CRUD
// Role-gated: admin (real role, not impersonated).
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { archiveCohortIfEmpty, unarchiveCohort } from "@/lib/supabase/queries/cohorts";
import { cohortMemberMutationInputSchema } from "../../schemas";

async function guardAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const role = await fetchUserRole(userId); // REAL role, not impersonated
  if (role !== "admin") throw new Error("Admin role required");
}

/**
 * Add a student to a cohort. Enforces:
 *   · cohort exists + has free seats
 *   · target user is role='student'
 *   · student isn't already in another active cohort
 *     (DB partial unique index is the final gate, but we
 *     pre-check for a friendly error message)
 */
export async function actionAddCohortMember(cohortId: string, studentUserId: string) {
  cohortMemberMutationInputSchema.parse({ cohortId, studentUserId });
  await guardAdmin();
  const supabase = createAdminClient();

  // Fetch cohort capacity + current active-member count in parallel.
  const [cohortRes, membersRes, studentRes] = await Promise.all([
    supabase.from("cohorts").select("id, max_size, name").eq("id", cohortId).maybeSingle(),
    supabase.from("cohort_members").select("user_id").eq("cohort_id", cohortId).is("left_at", null),
    supabase
      .from("users")
      .select("id, role, first_name, last_name, email")
      .eq("id", studentUserId)
      .maybeSingle(),
  ]);
  if (cohortRes.error) throw new Error(cohortRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);
  if (studentRes.error) throw new Error(studentRes.error.message);

  const cohort = cohortRes.data as { id: string; max_size: number; name: string } | null;
  if (!cohort) throw new Error("Cohort not found");

  const active = (membersRes.data ?? []) as { user_id: string }[];
  if (active.length >= cohort.max_size) {
    throw new Error(`Cohort is at capacity (${cohort.max_size}/${cohort.max_size}).`);
  }
  if (active.some((m) => m.user_id === studentUserId)) {
    throw new Error("That student is already in this cohort.");
  }

  const student = studentRes.data as { id: string; role: string } | null;
  if (!student) throw new Error("Student not found");
  if (student.role !== "student")
    throw new Error(`Target user is '${student.role}', not 'student'`);

  // Check they're not in ANOTHER active cohort (would violate the
  // partial unique index). Friendlier error than letting Postgres throw.
  const { data: otherMembership } = await supabase
    .from("cohort_members")
    .select("cohort_id, cohorts!cohort_members_cohort_id_fkey(name)")
    .eq("user_id", studentUserId)
    .is("left_at", null)
    .maybeSingle();
  if (otherMembership) {
    type Other = { cohort_id: string; cohorts: { name: string } | { name: string }[] | null };
    const o = otherMembership as Other;
    const other = Array.isArray(o.cohorts) ? o.cohorts[0] : o.cohorts;
    const label = other?.name ?? o.cohort_id;
    throw new Error(
      `Student is already in another active cohort: ${label}. Remove them from that cohort first.`
    );
  }

  const { error } = await supabase.from("cohort_members").insert({
    cohort_id: cohortId,
    user_id: studentUserId,
  });
  if (error) {
    // 23505 = unique violation (the partial index caught a race)
    if (error.code === "23505") {
      throw new Error("Student is already in an active cohort (race condition).");
    }
    throw new Error(error.message);
  }

  // If admin is adding to a previously-archived cohort, bring it
  // back to the dashboards. No-op when already active.
  await unarchiveCohort(cohortId);

  revalidatePath(`/admin/cohorts/${cohortId}`);
  revalidatePath(`/admin/cohorts`);
  revalidatePath(`/tutor/cohort/${cohortId}`);
}

/**
 * Remove a student from a cohort. Uses a soft delete (sets left_at)
 * so historical cohort records remain intact — the partial unique
 * index on user_id WHERE left_at IS NULL frees the student to be
 * added to a different cohort immediately.
 */
export async function actionRemoveCohortMember(cohortId: string, studentUserId: string) {
  cohortMemberMutationInputSchema.parse({ cohortId, studentUserId });
  await guardAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("cohort_members")
    .update({ left_at: new Date().toISOString() })
    .eq("cohort_id", cohortId)
    .eq("user_id", studentUserId)
    .is("left_at", null);
  if (error) throw new Error(error.message);

  // If that was the last active member, soft-archive the cohort so
  // it disappears from the admin + tutor dashboards.
  await archiveCohortIfEmpty(cohortId);

  revalidatePath(`/admin/cohorts/${cohortId}`);
  revalidatePath(`/admin/cohorts`);
  revalidatePath(`/tutor/cohort/${cohortId}`);
}
