import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import { loadCatalogQuestionEvidence } from "@/lib/catalog-practice/supabase-store";
import { admitCatalogPool } from "@/lib/catalog-practice/session";
import { toStudentQuizQuestion, toStudentQuizReview } from "@/lib/student-quiz-payload";
import { evaluateQuizAnswer } from "@/lib/quiz-session";
import type { QuizQuestionWithChoices, StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import { rankDailySkills, selectDailyQuestionId, utcDayKey, type DailySubject } from "./selection";

export interface DailyQuestion {
  day: string;
  subject: DailySubject;
  question: StudentQuizQuestion;
}

export type DailySlot =
  | { state: "ready"; value: DailyQuestion }
  | { state: "empty" }
  | { state: "unavailable" };

/**
 * Today's hard question for a subject, drawn from the live catalog pools.
 * Skills are tried in today's rotating order; the first with an eligible difficulty 5–7
 * question supplies it. Eligibility is the same admission check practice uses.
 */
async function loadDailyQuestion(
  subject: DailySubject,
  day: string
): Promise<QuizQuestionWithChoices | null> {
  for (const skillId of rankDailySkills(CATALOG_SKILLS, subject, day)) {
    const pool = (
      await fetchCatalogQuestionPool({ skillId, minimumDifficulty: 5, maximumDifficulty: 7 })
    ).filter(
      (row) => row.subject === subject && row.difficulty_level >= 5 && row.difficulty_level <= 7
    );
    if (!pool.length) continue;
    const admitted = admitCatalogPool(
      skillId,
      pool,
      await loadCatalogQuestionEvidence(pool.map((row) => row.id))
    );
    const id = selectDailyQuestionId(
      admitted.map((item) => item.binding.questionId),
      subject,
      day
    );
    if (id) return pool.find((row) => row.id === id) ?? null;
  }
  return null;
}

export async function loadDailySlot(subject: DailySubject, asOf = new Date()): Promise<DailySlot> {
  const day = utcDayKey(asOf);
  try {
    const question = await loadDailyQuestion(subject, day);
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
  const question = await loadDailyQuestion(subject, day);
  if (!question || question.id !== questionId) {
    throw new Error("This daily question is no longer available. Refresh the page.");
  }
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
