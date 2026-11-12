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

/** The Challenge's hardest band starts here; the plan sets the top (src/lib/plans). */
export const CHALLENGE_MIN_DIFFICULTY = 5;

/**
 * Today's hard question for a subject, drawn from the live catalog pools.
 * Skills are tried in today's rotating order; the first with an eligible question from
 * difficulty 5 up to the plan's top (5 for core plans, 7 with the mastery pool) supplies it.
 * Eligibility is the same admission check practice uses.
 */
async function loadDailyQuestion(
  subject: DailySubject,
  day: string,
  maxDifficulty: number
): Promise<{ question: QuizQuestionWithChoices; skillId: string } | null> {
  const minimumDifficulty = Math.min(CHALLENGE_MIN_DIFFICULTY, maxDifficulty);
  for (const skillId of rankDailySkills(CATALOG_SKILLS, subject, day)) {
    const pool = (
      await fetchCatalogQuestionPool({
        skillId,
        minimumDifficulty,
        maximumDifficulty: maxDifficulty,
      })
    ).filter(
      (row) =>
        row.subject === subject &&
        row.difficulty_level >= minimumDifficulty &&
        row.difficulty_level <= maxDifficulty
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
    if (id) {
      const question = pool.find((row) => row.id === id);
      return question ? { question, skillId } : null;
    }
  }
  return null;
}

/** `maxDifficulty` is the viewer's plan top (`maxDifficultyFor` in the assembler's plan gate). */
export async function loadDailySlot(
  subject: DailySubject,
  maxDifficulty: number,
  asOf = new Date()
): Promise<DailySlot> {
  const day = utcDayKey(asOf);
  try {
    const found = await loadDailyQuestion(subject, day, maxDifficulty);
    if (!found) return { state: "empty" };
    return {
      state: "ready",
      value: { day, subject, question: toStudentQuizQuestion(found.question) },
    };
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
  answer: string,
  maxDifficulty: number,
  /** Signed-in students earn points; the public lane passes nothing and keeps no record. */
  reward?: {
    clerkId: string;
    award(input: {
      key: string;
      clerkId: string;
      correct: boolean;
      difficulty: number;
      skillId: string | null;
    }): Promise<0 | 10 | 15>;
  }
): Promise<StudentQuizReview> {
  if (day !== utcDayKey(new Date()))
    throw new Error("A new daily question is available. Refresh the page.");
  const found = await loadDailyQuestion(subject, day, maxDifficulty);
  if (!found || found.question.id !== questionId) {
    throw new Error("This daily question is no longer available. Refresh the page.");
  }
  const { question, skillId } = found;
  if (answer.length > 200 || !answer.trim())
    throw new Error("Enter an answer before revealing it.");
  if (
    question.answer_format === "multiple_choice" &&
    !question.answer_choices.some((choice) => choice.letter === answer)
  ) {
    throw new Error("Choose one of the displayed answers.");
  }
  const isCorrect = evaluateQuizAnswer(answer, question);
  const points = reward
    ? await reward.award({
        key: `daily:${day}:${subject}`,
        clerkId: reward.clerkId,
        correct: isCorrect,
        difficulty: question.difficulty_level,
        skillId,
      })
    : 0;
  return { ...toStudentQuizReview(question, isCorrect, answer), points };
}
