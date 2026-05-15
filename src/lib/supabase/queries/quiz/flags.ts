// ============================================================
// Student-side question flagging — used by the in-quiz
// "flag this question" button + admin moderation queue.
// Carved out of the old quiz.ts catch-all (audit M1).
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { FlaggedQuestion, QuizQuestionWithChoices } from "@/types/quiz";

export async function flagQuestion(input: {
  question_id: string;
  student_id: string;
  node_id: string;
  flag_note: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("flagged_questions").insert(input);
  if (error) throw error;
}

export async function fetchFlaggedQuestions(): Promise<
  Array<FlaggedQuestion & { question: QuizQuestionWithChoices | null }>
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("flagged_questions")
    .select("*, question:quiz_questions(*, answer_choices(*))")
    .eq("resolved", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<FlaggedQuestion & { question: QuizQuestionWithChoices | null }>;
}

/** Cheap count-only query for the unresolved-flag badge in the
 *  admin nav. Avoids fetching every row (and the joined question
 *  payload) just to display a number. */
export async function fetchFlaggedQuestionCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("flagged_questions")
    .select("id", { count: "exact", head: true })
    .eq("resolved", false);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchFlaggedQuestionsForStudent(
  studentId: string
): Promise<Array<FlaggedQuestion & { question: QuizQuestionWithChoices | null }>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("flagged_questions")
    .select("*, question:quiz_questions(*, answer_choices(*))")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<FlaggedQuestion & { question: QuizQuestionWithChoices | null }>;
}

export async function resolveFlaggedQuestion(flagId: string, resolvedBy: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("flagged_questions")
    .update({
      resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", flagId);
  if (error) throw error;
}
