import { DIAGNOSTIC_QUESTIONS } from "@/data/diagnostic-questions";
import type { AnswerInput } from "@/lib/diagnostic-scoring";

/** Score only the canonical diagnostic; client-supplied correctness and metadata are untrusted. */
export function canonicalDiagnosticAnswers(
  submitted: Array<{ questionId: string; selectedAnswer: string }>
): AnswerInput[] | null {
  if (submitted.length !== DIAGNOSTIC_QUESTIONS.length) return null;
  const byId = new Map(
    submitted.map(({ questionId, selectedAnswer }) => [questionId, selectedAnswer])
  );
  if (byId.size !== DIAGNOSTIC_QUESTIONS.length) return null;
  if (!DIAGNOSTIC_QUESTIONS.every((question) => byId.has(question.id))) return null;
  return DIAGNOSTIC_QUESTIONS.map((question) => ({
    questionId: question.id,
    domain: question.domain,
    difficulty: question.difficulty,
    conceptId: question.conceptId,
    correct: byId.get(question.id)?.trim().toUpperCase() === question.correct,
  }));
}
