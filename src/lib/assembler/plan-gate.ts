/*
 * Server only. What a student's plan opens in the quiz flows. Every rule comes from
 * `src/lib/plans` (pools, the Free plan's 100 questions and one full-length test); this file only
 * shapes its answers for the assembler.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import {
  canAccess,
  challengeSubjectsOpen,
  type ChallengeSubject,
  difficultyRangeFor,
  getPlan,
  getUsage,
  PLAN_ENTITLEMENTS,
  questionsLeft,
  usesPracticeSet,
  type PlanAccess,
  type PlanUsage,
} from "@/lib/plans";
import { FREE_QUESTIONS_MESSAGE, PlanLimitError } from "./plan-limit";

export { PlanLimitError } from "./plan-limit";

export type QuizAccess = {
  /** Highest difficulty the plan opens (5 for core plans, 7 with the mastery pool). */
  maxDifficulty: number;
  /** Questions left on a limited plan; null when there is no limit. */
  questionsLeft: number | null;
  /** Whether the plan may start a full-length test it has not started before. */
  canStartFullTest: boolean;
  /** Core plans read only the Practice plan's fixed set of 5,000. */
  practiceSet: boolean;
};

/** Pure: the quiz-flow view of a resolved plan and its usage (usage only matters with limits). */
export function quizAccessFor(plan: PlanAccess, usage?: PlanUsage): QuizAccess {
  const limited =
    plan.entitlements.questionLimit !== null || plan.entitlements.fullLengthTestLimit !== null;
  const used = usage ?? { questionsAnswered: 0, fullLengthTestsCompleted: 0 };
  return {
    maxDifficulty: difficultyRangeFor(plan).maximumDifficulty,
    questionsLeft: questionsLeft(plan, used),
    canStartFullTest: canAccess(plan, "full-length-test:new", limited ? usage : undefined),
    practiceSet: usesPracticeSet(plan),
  };
}

/** A limited plan (Free) needs usage; unlimited plans skip the count queries. */
export async function loadQuizAccess(clerkId: string): Promise<QuizAccess & { limited: boolean }> {
  // A plan that cannot be read counts as Free (as the student portal does): limits still apply.
  const plan: PlanAccess = await getPlan(clerkId).catch((error: unknown) => {
    console.error("[quiz access] plan could not be read", error);
    return { entitlements: PLAN_ENTITLEMENTS.free };
  });
  const limited =
    plan.entitlements.questionLimit !== null || plan.entitlements.fullLengthTestLimit !== null;
  const usage = limited ? await getUsage(clerkId) : undefined;
  return { ...quizAccessFor(plan, usage), limited };
}

/**
 * The one check every answer-saving path runs before it saves a new answer (skill practice,
 * catalog practice, quiz runs, the Daily Challenge). Throws PlanLimitError once Free's 100
 * questions are used; unlimited plans pass without counting.
 */
export async function assertQuestionsLeft(clerkId: string): Promise<QuizAccess> {
  const access = await loadQuizAccess(clerkId);
  if (access.questionsLeft === 0) throw new PlanLimitError(FREE_QUESTIONS_MESSAGE);
  return access;
}

/**
 * Today's challenge subjects the student has not answered yet. The challenge is free on every plan
 * (founder, 2026-11-23). `day` is the challenge's own day key (src/lib/daily-challenge `utcDayKey`).
 * Call this before saving a challenge answer: a subject not in the list was already answered.
 */
export async function challengeSubjectsLeft(
  clerkId: string,
  day: string
): Promise<ChallengeSubject[]> {
  const { data, error } = await (createAdminClient() as unknown as SupabaseClient)
    .from("daily_challenge_answers")
    .select("subject")
    .eq("day", day)
    .eq("student_id", clerkId)
    .limit(2);
  // an unreadable record opens nothing new rather than everything
  if (error) return [];
  return challengeSubjectsOpen(((data ?? []) as { subject: string }[]).map((r) => r.subject));
}
