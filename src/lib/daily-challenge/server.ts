import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import { catalogQuestionPayloadHash } from "@/lib/question-bank/catalog-question-scope";
import { toStudentQuizQuestion, toStudentQuizReview } from "@/lib/student-quiz-payload";
import { evaluateQuizAnswer } from "@/lib/quiz-session";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import { DAILY_CANDIDATES } from "./candidates";
import {
  selectDailyCandidate,
  utcDayKey,
  type DailyCandidate,
  type DailySubject,
} from "./selection";

export interface DailyQuestion {
  day: string;
  subject: DailySubject;
  question: StudentQuizQuestion;
}

export type DailySlot =
  | { state: "ready"; value: DailyQuestion }
  | { state: "empty" }
  | { state: "unavailable" };

async function loadCandidate(candidate: DailyCandidate) {
  const pool = await fetchCatalogQuestionPool({
    skillId: candidate.skillId,
    minimumDifficulty: 5,
    maximumDifficulty: 7,
  });
  const question = pool.find((row) => row.id === candidate.questionId);
  if (
    !question ||
    question.subject !== candidate.subject ||
    question.difficulty_level < 5 ||
    question.difficulty_level > 7 ||
    !/^[a-f0-9]{64}$/.test(candidate.payloadSha256) ||
    catalogQuestionPayloadHash(question) !== candidate.payloadSha256
  ) {
    return null;
  }
  return question;
}

export async function loadDailySlot(subject: DailySubject, asOf = new Date()): Promise<DailySlot> {
  const day = utcDayKey(asOf);
  const candidate = selectDailyCandidate(DAILY_CANDIDATES, subject, day);
  if (!candidate) return { state: "empty" };
  try {
    const question = await loadCandidate(candidate);
    if (!question) return { state: "empty" };
    return { state: "ready", value: { day, subject, question: toStudentQuizQuestion(question) } };
  } catch (error) {
    console.error("[daily challenge] reviewed question read failed", error);
    return { state: "unavailable" };
  }
}

/** Public response lane: no learner record is created and no key is sent before an answer. */
export async function reviewDailyAnswer(
  subject: DailySubject,
  day: string,
  questionId: string,
  answer: string
): Promise<StudentQuizReview> {
  if (day !== utcDayKey(new Date()))
    throw new Error("A new daily question is available. Refresh the page.");
  const candidate = selectDailyCandidate(DAILY_CANDIDATES, subject, day);
  if (!candidate || candidate.questionId !== questionId) {
    throw new Error("This daily question is no longer available. Refresh the page.");
  }
  const question = await loadCandidate(candidate);
  if (!question) throw new Error("This daily question is no longer available. Refresh the page.");
  if (answer.length > 200 || !answer.trim())
    throw new Error("Enter an answer before revealing it.");
  if (
    question.answer_format === "multiple_choice" &&
    !question.answer_choices.some((choice) => choice.letter === answer)
  ) {
    throw new Error("Choose one of the displayed answers.");
  }
  return toStudentQuizReview(question, evaluateQuizAnswer(answer, question), answer);
}
