/*
 * Server only. What a student's plan opens in the quiz flows. Every rule comes from
 * `src/lib/plans` (pools, the Free plan's 100 questions and one full-length test); this file only
 * shapes its answers for the assembler.
 */
import {
  canAccess,
  difficultyRangeFor,
  getPlan,
  getUsage,
  PLAN_ENTITLEMENTS,
  questionsLeft,
  type PlanAccess,
  type PlanUsage,
} from "@/lib/plans";

export type QuizAccess = {
  /** Highest difficulty the plan opens (5 for core plans, 7 with the mastery pool). */
  maxDifficulty: number;
  /** Questions left on a limited plan; null when there is no limit. */
  questionsLeft: number | null;
  /** Whether the plan may start a full-length test it has not started before. */
  canStartFullTest: boolean;
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

export class PlanLimitError extends Error {}
