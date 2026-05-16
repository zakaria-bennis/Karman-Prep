// ============================================================
// Quiz attempts + per-question responses.
// Carved out of the old quiz.ts catch-all (audit M1).
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";
import type {
  QuizAttempt,
  QuestionResponse,
  AdaptiveStep,
  AnswerLetter,
  ConfidenceBand,
  QuizDifficulty,
} from "@/types/quiz";

export async function createQuizAttempt(studentId: string, nodeId: string): Promise<QuizAttempt> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("node_id", nodeId);

  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({
      student_id: studentId,
      node_id: nodeId,
      attempt_number: (count ?? 0) + 1,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Failed to create quiz attempt");
  return data as unknown as QuizAttempt;
}

export async function finalizeQuizAttempt(
  attemptId: string,
  input: {
    score: number;
    questions_answered: number;
    questions_correct: number;
    confidence_band: ConfidenceBand;
    adaptive_path: AdaptiveStep[];
  }
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quiz_attempts")
    .update({
      score: input.score,
      questions_answered: input.questions_answered,
      questions_correct: input.questions_correct,
      confidence_band: input.confidence_band,
      adaptive_path: input.adaptive_path as unknown as Json,
      completed_at: new Date().toISOString(),
    })
    .eq("id", attemptId);
  if (error) throw error;
}

export async function recordQuestionResponse(input: {
  attempt_id: string;
  question_id: string;
  student_answer: AnswerLetter;
  is_correct: boolean;
  difficulty_at_time: QuizDifficulty;
  response_time_seconds: number;
}): Promise<QuestionResponse> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("question_responses").insert(input).select().single();
  if (error || !data) throw error ?? new Error("Failed to record response");
  return data as QuestionResponse;
}

export async function fetchAttemptsForNode(
  studentId: string,
  nodeId: string
): Promise<QuizAttempt[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("student_id", studentId)
    .eq("node_id", nodeId)
    .order("attempt_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as QuizAttempt[];
}

export async function fetchAllAttemptsForStudent(studentId: string): Promise<QuizAttempt[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as QuizAttempt[];
}

export async function fetchResponsesForAttempt(attemptId: string): Promise<QuestionResponse[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("question_responses")
    .select("*")
    .eq("attempt_id", attemptId)
    .order("answered_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as QuestionResponse[];
}
