import { createAdminClient } from "@/lib/supabase/server";
import type { TimingAccommodation } from "@/lib/quiz/timer";

export type SavedSource = "bookmark" | "tutor_flag";

/** The student's saved marker on a question, or null. */
export async function getSavedQuestion(
  studentId: string,
  questionId: string
): Promise<SavedSource | null> {
  const { data, error } = await createAdminClient()
    .from("student_saved_questions")
    .select("source")
    .eq("student_id", studentId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (error) throw error;
  return (data?.source as SavedSource | undefined) ?? null;
}

/** Saves (or with null, removes) a question for a student. A tutor flag outranks a bookmark. */
export async function setSavedQuestion(
  studentId: string,
  questionId: string,
  source: SavedSource | null
) {
  const db = createAdminClient().from("student_saved_questions");
  const { error } =
    source === null
      ? await db.delete().eq("student_id", studentId).eq("question_id", questionId)
      : await db.upsert(
          { student_id: studentId, question_id: questionId, source },
          { onConflict: "student_id,question_id" }
        );
  if (error) throw error;
}

/** Saved markers for a set of questions, for a quiz host to pass into the shell. */
export async function getSavedFor(
  studentId: string,
  questionIds: string[]
): Promise<Record<string, SavedSource>> {
  if (!questionIds.length) return {};
  const { data, error } = await createAdminClient()
    .from("student_saved_questions")
    .select("question_id, source")
    .eq("student_id", studentId)
    .in("question_id", questionIds);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((r) => [r.question_id as string, r.source as SavedSource])
  );
}

export async function setTimingAccommodation(studentClerkId: string, value: TimingAccommodation) {
  const { error } = await createAdminClient()
    .from("users")
    .update({ timing_accommodation: value })
    .eq("clerk_id", studentClerkId);
  if (error) throw error;
}

export async function getTimingAccommodation(clerkId: string): Promise<TimingAccommodation> {
  const { data, error } = await createAdminClient()
    .from("users")
    .select("timing_accommodation")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (error) throw error;
  return (data?.timing_accommodation as TimingAccommodation | undefined) ?? "standard";
}
