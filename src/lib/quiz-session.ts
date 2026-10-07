import { stepDifficultyLevel } from "@/types/quiz";
import { parseNumericAnswer } from "./numeric-answer";
import type {
  QuestionResponse,
  QuizDifficultyLevel,
  QuizQuestionWithChoices,
  StudentQuizQuestion,
} from "@/types/quiz";

type SessionQuestion = QuizQuestionWithChoices | StudentQuizQuestion;

export const QUIZ_LENGTH = 10;

export function evaluateQuizAnswer(
  studentAnswer: string,
  question: QuizQuestionWithChoices
): boolean {
  if (question.answer_format !== "numeric_entry") {
    return studentAnswer.trim().toUpperCase() === question.correct_answer.trim().toUpperCase();
  }
  const answer = parseNumericAnswer(studentAnswer);
  if (answer === null) return false;
  const tolerance = question.numeric_tolerance ?? 0;
  if (!Number.isFinite(tolerance) || tolerance < 0) return false;
  const accepted = question.reviewed_numeric_answers ?? [question.correct_answer];
  return accepted.some((value) => {
    const correct = parseNumericAnswer(value);
    return correct !== null && Math.abs(answer - correct) <= tolerance + 1e-9;
  });
}

/** Keep the first occurrence of each question; duplicate rows must not extend a quiz. */
export function uniqueQuizQuestions<T extends SessionQuestion>(questions: T[]): T[] {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}

export function selectNextQuestion<T extends SessionQuestion>(
  all: T[],
  targetLevel: QuizDifficultyLevel,
  used: Set<string>
): T | null {
  for (let offset = 0; offset < 7; offset++) {
    for (const sign of offset === 0 ? [0] : [-1, 1]) {
      const level = targetLevel + offset * sign;
      if (level < 1 || level > 7) continue;
      const pool = all.filter((q) => (q.difficulty_level ?? 1) === level && !used.has(q.id));
      if (pool.length > 0) return [...pool].sort((a, b) => a.display_order - b.display_order)[0];
    }
  }
  const unused = all.filter((q) => !used.has(q.id));
  return unused.length > 0
    ? [...unused].sort((a, b) => a.display_order - b.display_order)[0]
    : null;
}

export function prepareQuizSession<T extends SessionQuestion>(
  rawQuestions: T[],
  rawResponses: QuestionResponse[]
) {
  const questions = uniqueQuizQuestions(rawQuestions);
  const targetLength = Math.min(QUIZ_LENGTH, questions.length);
  const byId = new Map(questions.map((question) => [question.id, question]));
  const used = new Set<string>();
  const responses = rawResponses
    .filter((response) => {
      if (!byId.has(response.question_id) || used.has(response.question_id)) return false;
      used.add(response.question_id);
      return true;
    })
    .slice(0, targetLength);
  const answeredQuestions = responses.map((response) => byId.get(response.question_id)!);
  const last = responses.at(-1);
  const lastQuestion = answeredQuestions.at(-1);
  const nextLevel = lastQuestion
    ? stepDifficultyLevel(
        (lastQuestion.difficulty_level ?? 1) as QuizDifficultyLevel,
        !!last?.is_correct
      )
    : 1;
  const next =
    responses.length >= targetLength ? null : selectNextQuestion(questions, nextLevel, used);
  return { questions, responses, answeredQuestions, next, nextLevel, targetLength, used };
}
