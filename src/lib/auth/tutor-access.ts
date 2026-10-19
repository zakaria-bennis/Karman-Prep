import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { fetchTutorScope } from "@/lib/supabase/queries/tutor";
import { createAdminClient } from "@/lib/supabase/server";

/** Resolve access on the server; never trust a submitted tutor ID or role. */
export async function canTutorAccessStudent(
  tutorClerkId: string,
  studentClerkId: string
): Promise<boolean> {
  const role = await fetchUserRole(tutorClerkId);
  if (role === "admin") return true;
  if (role !== "tutor") return false;
  const scope = await fetchTutorScope(tutorClerkId);
  return scope.studentClerkIds.includes(studentClerkId);
}

/** A student's URL is not proof that an arbitrary flag/question belongs to them. */
export async function assertStudentFlag(
  studentClerkId: string,
  target: { flagId: string } | { questionId: string }
): Promise<void> {
  const supabase = createAdminClient();
  let query = supabase.from("flagged_questions").select("id").eq("student_id", studentClerkId);
  query =
    "flagId" in target ? query.eq("id", target.flagId) : query.eq("question_id", target.questionId);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Flag does not belong to this student");
}
