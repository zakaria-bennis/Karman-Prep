import "server-only";
/*
 * Gives each seated student a Practice plan of their own, and takes it back when they leave
 * the school's last class. It writes the pricing session's `plan_grants` row in exactly the
 * shape its `grantPlan({ userId, planId: "practice", source: "school", sourceRef })` stores
 * (src/lib/plans on claude/overnight-pricing-938360): user_id is the Clerk id, source_ref is
 * the school id, so one grant covers a student in several classes of one school.
 *
 * Merge note: once src/lib/plans is on the branch, swap both bodies for
 * `grantPlan(...)` and `revokeGrant({ source: "school", sourceRef, userId })`.
 * Until its migration is applied, a missing plan_grants table is logged, never thrown: the
 * seat is still recorded and the grant follows when the table exists.
 */
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";
import { SCHOOL_TERMS } from "./terms";

type Admin = UntypedAdmin;

export type GrantOutcome = "granted" | "revoked" | "kept" | "plans-not-installed";

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || error.code === "42P01" || /plan_grants/.test(error.message ?? "");
}

export async function grantSchoolPractice(
  input: { studentClerkId: string; schoolId: string },
  supabase: Admin = untypedAdmin()
): Promise<GrantOutcome> {
  const row = {
    user_id: input.studentClerkId,
    plan_id: SCHOOL_TERMS.studentPlan,
    source: "school",
    source_ref: input.schoolId,
    revoked_at: null,
  };
  const { error } = await supabase
    .from("plan_grants")
    .upsert(row, { onConflict: "source,source_ref,user_id" });
  if (missingTable(error)) {
    console.warn("[school] plan_grants is not installed yet; seat recorded without a grant");
    return "plans-not-installed";
  }
  if (error) throw error;
  return "granted";
}

/** Revokes the school's grant unless the student still sits in another of its classes. */
export async function revokeSchoolPracticeIfUnseated(
  input: { studentClerkId: string; studentUserId: string; schoolId: string },
  supabase: Admin = untypedAdmin()
): Promise<GrantOutcome> {
  const { count, error: seatError } = await supabase
    .from("school_seats")
    .select("id", { count: "exact", head: true })
    .eq("school_id", input.schoolId)
    .eq("student_user_id", input.studentUserId)
    .is("removed_at", null);
  if (seatError) throw seatError;
  if ((count ?? 0) > 0) return "kept";
  const { error } = await supabase
    .from("plan_grants")
    .update({ revoked_at: new Date().toISOString() })
    .eq("source", "school")
    .eq("source_ref", input.schoolId)
    .eq("user_id", input.studentClerkId)
    .is("revoked_at", null);
  if (missingTable(error)) {
    console.warn("[school] plan_grants is not installed yet; nothing to revoke");
    return "plans-not-installed";
  }
  if (error) throw error;
  return "revoked";
}
