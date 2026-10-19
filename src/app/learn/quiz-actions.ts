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
  fetchResponsesForAttempt,
  fetchQuizAttemptForStudent,
  completeQuizAttemptAtomic,
  recordQuestionResponse,
  flagQuestion,
  updateWatchPercentage,
  fetchNodeStatusBundle,
} from "@/lib/supabase/queries/quiz";
import type {
  ConfidenceBand,
  StudentQuizQuestion,
  StudentQuizReview,
  QuestionResponse,
} from "@/types/quiz";
import { toStudentQuizQuestion, toStudentQuizReview } from "@/lib/student-quiz-payload";
import { evaluateQuizAnswer, prepareQuizSession } from "@/lib/quiz-session";
import type { Subject } from "@/data/curriculum";
import {
  quizNodeIdSchema,
  quizAttemptIdSchema,
  recordQuizResponseSchema,
  completeQuizSchema,
  flagQuizQuestionSchema,
  watchPercentageSchema,
} from "./quiz-action-schemas";

export async function actionFetchNodeBundle(nodeId: string) {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  return fetchNodeStatusBundle(userId, quizNodeIdSchema.parse(nodeId));
}

export async function actionStartQuiz(
  nodeId: string,
  resumeAttemptId?: string
): Promise<{
  attemptId: string;
  questions: StudentQuizQuestion[];
  responses: QuestionResponse[];
  reviews: Record<string, StudentQuizReview>;
}> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");

  nodeId = quizNodeIdSchema.parse(nodeId);
  if (resumeAttemptId) {
    resumeAttemptId = quizAttemptIdSchema.parse(resumeAttemptId);
    const saved = await fetchQuizAttemptForStudent(resumeAttemptId, userId);
    if (!saved || saved.completed_at || saved.node_id !== nodeId) {
      throw new Error("Quiz attempt is unavailable");
    }
  }
  const questions = await fetchQuestionsForNode(nodeId);
  if (questions.length === 0) throw new Error("This node has no questions yet.");

  const attempt = await createQuizAttempt(userId, nodeId);
  if (resumeAttemptId && attempt.id !== resumeAttemptId) {
    throw new Error("The saved quiz is no longer available to resume");
  }
  const responses = await fetchResponsesForAttempt(attempt.id);
  const availableIds = new Set(questions.map((q) => q.id));
  if (responses.some((response) => !availableIds.has(response.question_id))) {
    throw new Error(
      "This quiz changed while you were away. Please contact support to reset the attempt."
    );
  }
  const byId = new Map(questions.map((question) => [question.id, question]));
  const reviews = Object.fromEntries(
    responses.map((response) => [
      response.question_id,
      toStudentQuizReview(
        byId.get(response.question_id)!,
        response.is_correct,
        response.student_answer
      ),
    ])
  );
  return {
    attemptId: attempt.id,
    questions: questions.map(toStudentQuizQuestion),
    responses,
    reviews,
  };
}

export async function actionRecordResponse(input: {
  attempt_id: string;
  question_id: string;
  /** Free-form text. Letter (A/B/C/D) for multiple-choice; numeric
   *  string (e.g. "42", "1/2") for SAT math grid-ins. */
  student_answer: string;
  response_time_seconds: number;
}): Promise<StudentQuizReview> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  input = recordQuizResponseSchema.parse(input);
  const attempt = await fetchQuizAttemptForStudent(input.attempt_id, userId);
  if (!attempt) throw new Error("Quiz attempt is unavailable");
  const questions = await fetchQuestionsForNode(attempt.node_id);
  const question = questions.find((q) => q.id === input.question_id);
  if (!question) throw new Error("Question is not in the approved node pool");
  const responses = await fetchResponsesForAttempt(input.attempt_id);
  if (!responses.some((response) => response.question_id === input.question_id)) {
    const plan = prepareQuizSession(questions, responses);
    if (plan.next?.id !== input.question_id) throw new Error("Question is not next in this quiz");
  }
  const stored = await recordQuestionResponse({
    ...input,
    student_id: userId,
    is_correct: evaluateQuizAnswer(input.student_answer, question),
    difficulty_at_time: question.difficulty,
  });
  return toStudentQuizReview(question, stored.is_correct, stored.student_answer);
}

export async function actionCompleteQuiz(input: {
  attemptId: string;
  nodeId: string;
  subject: Subject;
}): Promise<{ score: number; newStatus: string; confidenceBand: ConfidenceBand }> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");

  input = completeQuizSchema.parse(input);
  if (input.subject !== (input.nodeId.startsWith("ma-") ? "math" : "reading"))
    throw new Error("Subject does not match node");
  const attempt = await fetchQuizAttemptForStudent(input.attemptId, userId);
  if (!attempt || attempt.node_id !== input.nodeId) throw new Error("Quiz attempt is unavailable");
  if (attempt.completed_at) {
    const completed = await completeQuizAttemptAtomic(input.attemptId, userId, input.nodeId, {
      expectedCount: 1,
      adaptive_path: [],
    });
    revalidatePath(`/learn/${input.subject}`);
    return completed;
  }
  const [questions, responses] = await Promise.all([
    fetchQuestionsForNode(input.nodeId),
    fetchResponsesForAttempt(input.attemptId),
  ]);
  const plan = prepareQuizSession(questions, responses);
  if (plan.targetLength === 0 || plan.responses.length < plan.targetLength) {
    throw new Error("Quiz is not complete yet");
  }
  const result = await completeQuizAttemptAtomic(input.attemptId, userId, input.nodeId, {
    expectedCount: plan.targetLength,
    adaptive_path: plan.responses.map((response, index) => ({
      question_id: response.question_id,
      difficulty: plan.answeredQuestions[index].difficulty,
      was_correct: response.is_correct,
    })),
  });

  revalidatePath(`/learn/${input.subject}`);
  return result;
}

export async function actionFlagQuestion(input: {
  question_id: string;
  node_id: string;
  flag_note: string | null;
}) {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  input = flagQuizQuestionSchema.parse(input);
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
  await updateWatchPercentage(
    userId,
    quizNodeIdSchema.parse(nodeId),
    watchPercentageSchema.parse(percentage)
  );
}
