import { stepDifficultyLevel } from "@/types/quiz";
import type { QuestionResponse, QuizDifficultyLevel, QuizQuestionWithChoices } from "@/types/quiz";

export const QUIZ_LENGTH = 10;

export function evaluateQuizAnswer(
  studentAnswer: string,
  question: QuizQuestionWithChoices
): boolean {
  if (question.answer_format !== "numeric_entry") {
    return studentAnswer.trim().toUpperCase() === question.correct_answer.trim().toUpperCase();
  }
  const parse = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^-?\d+\s*\/\s*\d+$/.test(trimmed)) {
      const [top, bottom] = trimmed.split("/").map((part) => Number(part.trim()));
      return bottom === 0 ? null : top / bottom;
    }
    const number = Number(trimmed);
    return Number.isFinite(number) ? number : null;
  };
  const answer = parse(studentAnswer);
  const correct = parse(question.correct_answer);
  if (answer === null || correct === null) {
    return studentAnswer.trim() === question.correct_answer.trim();
  }
  return Math.abs(answer - correct) <= (question.numeric_tolerance ?? 0) + 1e-9;
}

/** Keep the first occurrence of each question; duplicate rows must not extend a quiz. */
export function uniqueQuizQuestions(
  questions: QuizQuestionWithChoices[]
): QuizQuestionWithChoices[] {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}

export function selectNextQuestion(
  all: QuizQuestionWithChoices[],
  targetLevel: QuizDifficultyLevel,
  used: Set<string>
): QuizQuestionWithChoices | null {
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

export function prepareQuizSession(
  rawQuestions: QuizQuestionWithChoices[],
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
