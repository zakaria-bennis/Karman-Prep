"use server";

// ============================================================
// Server Actions — Quiz engine
// Called from the QuizContext / QuizEngine client components.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { revalidatePath } from "next/cache";
import {
  fetchQuestionsForNode,
  createQuizAttempt,
  finalizeQuizAttempt,
  recordQuestionResponse,
  flagQuestion,
  updateNodeAfterQuiz,
  updateWatchPercentage,
  fetchNodeStatusBundle,
} from "@/lib/supabase/queries/quiz";
import type {
  AdaptiveStep,
  ConfidenceBand,
  QuizDifficulty,
  QuizQuestionWithChoices,
} from "@/types/quiz";
import { getConfidenceBand } from "@/types/quiz";
import type { Subject } from "@/data/curriculum";

export async function actionFetchQuestions(nodeId: string): Promise<QuizQuestionWithChoices[]> {
  return fetchQuestionsForNode(nodeId);
}

export async function actionFetchNodeBundle(nodeId: string) {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  return fetchNodeStatusBundle(userId, nodeId);
}

export async function actionStartQuiz(nodeId: string): Promise<{
  attemptId: string;
  questions: QuizQuestionWithChoices[];
}> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");

  const [attempt, questions] = await Promise.all([
    createQuizAttempt(userId, nodeId),
    fetchQuestionsForNode(nodeId),
  ]);

  return { attemptId: attempt.id, questions };
}

export async function actionRecordResponse(input: {
  attempt_id: string;
  question_id: string;
  /** Free-form text. Letter (A/B/C/D) for multiple-choice; numeric
   *  string (e.g. "42", "1/2") for SAT math grid-ins. */
  student_answer: string;
  is_correct: boolean;
  difficulty_at_time: QuizDifficulty;
  response_time_seconds: number;
}) {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  await recordQuestionResponse(input);
}

export async function actionCompleteQuiz(input: {
  attemptId: string;
  nodeId: string;
  subject: Subject;
  score: number;
  questions_answered: number;
  questions_correct: number;
  adaptive_path: AdaptiveStep[];
}): Promise<{ newStatus: string; confidenceBand: ConfidenceBand }> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");

  const confidence_band = getConfidenceBand(input.score);

  await finalizeQuizAttempt(input.attemptId, {
    score: input.score,
    questions_answered: input.questions_answered,
    questions_correct: input.questions_correct,
    confidence_band,
    adaptive_path: input.adaptive_path,
  });

  const { newStatus } = await updateNodeAfterQuiz(
    userId,
    input.nodeId,
    input.score,
    confidence_band
  );

  revalidatePath(`/learn/${input.subject}`);
  return { newStatus, confidenceBand: confidence_band };
}

export async function actionFlagQuestion(input: {
  question_id: string;
  node_id: string;
  flag_note: string | null;
}) {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  await flagQuestion({
    question_id: input.question_id,
    student_id: userId,
    node_id: input.node_id,
    flag_note: input.flag_note,
  });
}

export async function actionUpdateWatchPercentage(nodeId: string, percentage: number) {
  const { userId } = await safeAuth();
  if (!userId) return;
  await updateWatchPercentage(userId, nodeId, percentage);
}
