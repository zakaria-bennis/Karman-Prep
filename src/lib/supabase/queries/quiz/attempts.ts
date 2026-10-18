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
  ConfidenceBand,
  QuizDifficulty,
} from "@/types/quiz";

export async function createQuizAttempt(studentId: string, nodeId: string): Promise<QuizAttempt> {
  const { data, error } = await createAdminClient().rpc("start_quiz_attempt_atomic", {
    p_student_id: studentId,
    p_node_id: nodeId,
  });
  if (error || !data) throw error ?? new Error("Failed to create quiz attempt");
  return data as unknown as QuizAttempt;
}

export async function fetchQuizAttemptForStudent(
  attemptId: string,
  studentId: string
): Promise<QuizAttempt | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return (data as QuizAttempt | null) ?? null;
}

export async function completeQuizAttemptAtomic(
  attemptId: string,
  studentId: string,
  nodeId: string,
  input: { expectedCount: number; adaptive_path: AdaptiveStep[] }
): Promise<{ score: number; newStatus: string; confidenceBand: ConfidenceBand }> {
  const { data, error } = await createAdminClient()
    .rpc("complete_quiz_attempt_atomic", {
      p_attempt_id: attemptId,
      p_student_id: studentId,
      p_node_id: nodeId,
      p_expected_count: input.expectedCount,
      p_adaptive_path: input.adaptive_path as unknown as Json,
    })
    .single();
  if (error || !data) throw error ?? new Error("Failed to complete quiz attempt");
  return {
    score: data.result_score,
    newStatus: data.result_status,
    confidenceBand: data.result_band,
  };
}

export async function recordQuestionResponse(input: {
  attempt_id: string;
  student_id: string;
  question_id: string;
  /** Free-form text. Letter (A/B/C/D) for multiple-choice; numeric
   *  string (e.g. "42", "1/2") for SAT math grid-ins. */
  student_answer: string;
  is_correct: boolean;
  difficulty_at_time: QuizDifficulty;
  response_time_seconds: number;
}): Promise<QuestionResponse> {
  const { data, error } = await createAdminClient().rpc("record_quiz_response_once", {
    p_attempt_id: input.attempt_id,
    p_student_id: input.student_id,
    p_question_id: input.question_id,
    p_answer: input.student_answer,
    p_correct: input.is_correct,
    p_difficulty: input.difficulty_at_time,
    p_seconds: input.response_time_seconds,
  });
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
