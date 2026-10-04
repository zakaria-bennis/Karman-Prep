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
  fetchIncompleteQuizAttempt,
  fetchResponsesForAttempt,
  fetchQuizAttemptForStudent,
  finalizeQuizAttempt,
  recordQuestionResponse,
  flagQuestion,
  updateNodeAfterQuiz,
  updateWatchPercentage,
  fetchNodeStatusBundle,
} from "@/lib/supabase/queries/quiz";
import type { ConfidenceBand, QuizQuestionWithChoices, QuestionResponse } from "@/types/quiz";
import { getConfidenceBand } from "@/types/quiz";
import { evaluateQuizAnswer, prepareQuizSession } from "@/lib/quiz-session";
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
  responses: QuestionResponse[];
}> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");

  const questions = await fetchQuestionsForNode(nodeId);
  if (questions.length === 0) throw new Error("This node has no questions yet.");

  const incomplete = await fetchIncompleteQuizAttempt(userId, nodeId);
  if (incomplete) {
    const responses = await fetchResponsesForAttempt(incomplete.id);
    const availableIds = new Set(questions.map((q) => q.id));
    if (responses.every((response) => availableIds.has(response.question_id))) {
      return { attemptId: incomplete.id, questions, responses };
    }
  }

  const attempt = await createQuizAttempt(userId, nodeId);
  return { attemptId: attempt.id, questions, responses: [] };
}

export async function actionRecordResponse(input: {
  attempt_id: string;
  question_id: string;
  /** Free-form text. Letter (A/B/C/D) for multiple-choice; numeric
   *  string (e.g. "42", "1/2") for SAT math grid-ins. */
  student_answer: string;
  response_time_seconds: number;
}): Promise<{ isCorrect: boolean }> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  const attempt = await fetchQuizAttemptForStudent(input.attempt_id, userId);
  if (!attempt || attempt.completed_at) throw new Error("Quiz attempt is unavailable");
  const question = (await fetchQuestionsForNode(attempt.node_id)).find(
    (q) => q.id === input.question_id
  );
  if (!question) throw new Error("Question is not in the approved node pool");
  const stored = await recordQuestionResponse({
    ...input,
    is_correct: evaluateQuizAnswer(input.student_answer, question),
    difficulty_at_time: question.difficulty,
  });
  return { isCorrect: stored.is_correct };
}

export async function actionCompleteQuiz(input: {
  attemptId: string;
  nodeId: string;
  subject: Subject;
}): Promise<{ score: number; newStatus: string; confidenceBand: ConfidenceBand }> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");

  const attempt = await fetchQuizAttemptForStudent(input.attemptId, userId);
  if (!attempt || attempt.node_id !== input.nodeId) throw new Error("Quiz attempt is unavailable");
  const [questions, responses] = await Promise.all([
    fetchQuestionsForNode(input.nodeId),
    fetchResponsesForAttempt(input.attemptId),
  ]);
  const plan = prepareQuizSession(questions, responses);
  if (plan.targetLength === 0 || plan.responses.length < plan.targetLength) {
    throw new Error("Quiz is not complete yet");
  }
  const correct = plan.responses.filter((response) => response.is_correct).length;
  const score = Math.round((correct / plan.responses.length) * 100);
  const confidence_band = getConfidenceBand(score);

  const newlyCompleted = await finalizeQuizAttempt(input.attemptId, userId, input.nodeId, {
    score,
    questions_answered: plan.responses.length,
    questions_correct: correct,
    confidence_band,
    adaptive_path: plan.responses.map((response, index) => ({
      question_id: response.question_id,
      difficulty: plan.answeredQuestions[index].difficulty,
      was_correct: response.is_correct,
    })),
  });

  const { newStatus } = newlyCompleted
    ? await updateNodeAfterQuiz(userId, input.nodeId, score, confidence_band)
    : { newStatus: (await fetchNodeStatusBundle(userId, input.nodeId)).status ?? "in_progress" };

  revalidatePath(`/learn/${input.subject}`);
  return { score, newStatus, confidenceBand: confidence_band };
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
