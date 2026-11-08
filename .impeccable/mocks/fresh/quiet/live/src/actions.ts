// Replaces src/app/(app)/learn/quiz-actions (server actions that need Supabase and Clerk).
// Grading and the student payloads use the real library code.
import { evaluateQuizAnswer } from "@/lib/quiz-session";
import { toStudentQuizReview } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices, StudentQuizReview } from "@/types/quiz";
import { poolFor } from "./questions";

let pool: QuizQuestionWithChoices[] = [];

export async function actionStartQuiz(nodeId: string) {
  const id = new URLSearchParams(location.search).get("q") ?? "adv-3";
  pool = poolFor(id).questions;
  void nodeId;
  return { responses: [], reviews: {} as Record<string, StudentQuizReview>, attemptId: "harness", questions: pool };
}
export async function actionRecordResponse(input: {
  attempt_id: string;
  question_id: string;
  student_answer: string;
  response_time_seconds: number;
}) {
  const q = pool.find((row) => row.id === input.question_id);
  if (!q) throw new Error(`Unknown question ${input.question_id}`);
  const isCorrect = evaluateQuizAnswer(input.student_answer, q);
  return { questionId: q.id, ...toStudentQuizReview(q, isCorrect, input.student_answer) };
}
export async function actionFlagQuestion() {}
export async function actionCompleteQuiz() {
  return { score: 100, confidenceBand: "high" as const, newStatus: "mastered" };
}
