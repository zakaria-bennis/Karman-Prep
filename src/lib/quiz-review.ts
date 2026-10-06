import { z } from "zod";
import {
  fetchQuizAttemptForStudent,
  fetchResponsesForAttempt,
} from "@/lib/supabase/queries/quiz/attempts";
import { fetchQuestionsForNode } from "@/lib/supabase/queries/quiz/questions";

/** Read only after verifying ownership and completion; never expose an active quiz key. */
export async function fetchCompletedQuizReview(studentId: string, attemptId: string) {
  if (!z.uuid().safeParse(attemptId).success) return null;
  const attempt = await fetchQuizAttemptForStudent(attemptId, studentId);
  if (!attempt || attempt.student_id !== studentId || !attempt.completed_at) return null;
  const [responses, questions] = await Promise.all([
    fetchResponsesForAttempt(attempt.id),
    fetchQuestionsForNode(attempt.node_id),
  ]);
  const published = new Map(questions.map((question) => [question.id, question]));
  return {
    attempt,
    items: responses.map((response) => ({
      response,
      // Withdrawn, draft or moved questions retain their saved result, not their current content.
      question: published.get(response.question_id) ?? null,
    })),
  };
}
