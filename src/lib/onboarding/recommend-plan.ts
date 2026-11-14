// ============================================================
// recommendPlan: picks the Karman plan that fits a student from the plan-finder's answers. Plan names,
// prices and facts all come from src/lib/marketing/offer.ts.
//
// How it decides (founder, 2026-11-14: the cohort is the plan most students belong in; private tutoring
// only when there is no other way to the goal; Pro before Practice):
//
//   1. Honest intake (INTAKE in offer.ts): already at 1500 or higher, or the SAT under four weeks away.
//      A program is not worth the money, so the answer is the platform alone.
//   2. Private tutoring, only when the cohort cannot get the student there:
//        - the SAT comes before a cohort could finish, and there are real points to gain;
//        - the gap is 300 points or more;
//        - prep was tried before, the score did not improve, the student needs questions walked
//          through, and the gap is 150 or more.
//      20 hours when the gap is 200 or more, otherwise 10.
//   3. The platform alone, for a student who sticks to a plan alone, learns from written explanations
//      and has fewer than 150 points to gain.
//   4. Everyone else: the cohort.
//
//   On the platform, Pro is the answer. Practice only fits a goal under 1300 with fewer than 100 points
//   to gain, because Practice leaves out the hardest questions.
// ============================================================

import {
  CALL_MINUTES,
  INTAKE,
  MARCH_PROGRAM,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  formatPrice,
  type PlanId,
} from "@/lib/marketing/offer";

export type Independence = "on_my_own" | "with_checkins" | "needs_structure";
/** What happens when the student misses an SAT question. */
export type LearningPace = "quick" | "average" | "slower";
export type PriorPrepResult = "first_time" | "worked" | "didnt_move";

/** Plans the plan-finder can recommend. Free, School and Tutor affiliate never are. */
export type RecommendedPlanId = Extract<
  PlanId,
  "practice" | "pro" | "cohort" | "private-10" | "private-20"
>;

export interface RecommendationInput {
  /** Weeks until the student's planned SAT, or null when no date is picked yet. */
  weeksToTest: number | null;
  /** Goal SAT score (400-1600). */
  goalScore: number;
  /** Most recent SAT total, or null if they haven't taken it (treated as 1000). */
  baselineScore: number | null;
  /** Study hours a week the student can give. */
  hoursPerWeek: number;
  /** How the student studies best. */
  independence: Independence;
  /** What happens when the student misses a question. */
  pace: LearningPace;
  /** Prior SAT prep and how it went. */
  priorPrep: PriorPrepResult;
}

export interface Recommendation {
  planId: RecommendedPlanId;
  /** The plan, named in one line. */
  headline: string;
  /** One or two short sentences: why this plan, from the student's own answers. */
  why: string;
  /** The answers the decision turned on. Three at most. */
  signals: string[];
  /** The next plan down or across, in one line. */
  alsoConsidered?: { planId: RecommendedPlanId; reason: string };
}

/** Baseline assumed when the student hasn't taken the SAT. */
const DEFAULT_BASELINE = 1000;
/** At this gap or more, the cohort alone is not enough: private tutoring. */
export const PRIVATE_GAP = 300;
/** At this gap or more, private tutoring is the 20-hour package. */
export const LONG_PACKAGE_GAP = 200;
/** Under this gap, a student who studies well alone can use the platform alone. */
export const SELF_STUDY_GAP = 150;
/** Practice only fits a goal under this, with fewer than PRACTICE_GAP points to gain. */
export const PRACTICE_GOAL = 1300;
export const PRACTICE_GAP = 100;
/** Under this gap there is nothing for a tutor to rush: the platform is enough before a near SAT. */
const SMALL_GAP = 80;

export interface PlanSummary {
  name: string;
  /** The real price from offer.ts, in words. */
  price: string;
  /** The next step: checkout for Practice and Pro, the reservation, or the call booking. */
  href: string;
  /** The button's words. */
  action: string;
}

function privatePackage(id: "private-10" | "private-20") {
  const pkg = PRIVATE_PACKAGES.find((p) => p.id === id);
  if (!pkg) throw new Error(`offer.ts has no private package ${id}`);
  return pkg;
}

export function planSummary(planId: RecommendedPlanId): PlanSummary {
  switch (planId) {
    case "practice":
    case "pro": {
      const plan = planId === "practice" ? PRACTICE_PLAN : PRO_PLAN;
      return {
        name: plan.name,
        price: `${formatPrice(plan.monthly)} a month`,
        href: `/checkout/start?plan=${plan.id}&term=month`,
        action: `Start ${plan.name}`,
      };
    }
    case "cohort":
      return {
        name: MARCH_PROGRAM.planName,
        price: formatPrice(MARCH_PROGRAM.price),
        href: "/reserve",
        action: "Reserve a seat",
      };
    case "private-10":
    case "private-20": {
      const pkg = privatePackage(planId);
      return {
        name: pkg.name,
        price: `${formatPrice(pkg.price)} for ${pkg.hours} hours`,
        href: "/call",
        action: `Book a free ${CALL_MINUTES}-minute call`,
      };
    }
  }
}

const gapOf = (input: RecommendationInput) =>
  Math.max(0, input.goalScore - (input.baselineScore ?? DEFAULT_BASELINE));

/** The answers worth showing back, most telling first. */
function signalsOf(input: RecommendationInput, gap: number): string[] {
  const w = input.weeksToTest;
  return [
    gap > 0 ? `${gap} points to gain` : null,
    w != null ? `${w} weeks until your SAT` : null,
    input.priorPrep === "didnt_move" ? "Prep before didn't improve your score" : null,
    input.pace === "slower" ? "You learn best when someone walks you through it" : null,
    input.independence === "on_my_own"
      ? "You stick to a plan on your own"
      : input.independence === "needs_structure"
        ? "You work best when someone is expecting you"
        : "You do best with a teacher and a set time",
    `About ${input.hoursPerWeek} hours a week to study`,
  ]
    .filter((s): s is string => s !== null)
    .slice(0, 3);
}

export function recommendPlan(input: RecommendationInput): Recommendation {
  const gap = gapOf(input);
  const weeks = input.weeksToTest;
  const signals = signalsOf(input, gap);
  const platform: "practice" | "pro" =
    input.goalScore < PRACTICE_GOAL && gap < PRACTICE_GAP ? "practice" : "pro";

  // 1. honest intake
  if (input.baselineScore != null && input.baselineScore >= INTAKE.scoreFrom)
    return selfPaced(
      platform,
      signals,
      `You're already at ${input.baselineScore}, so a program isn't worth your money.`
    );
  if (weeks != null && weeks < INTAKE.minWeeks)
    return selfPaced(
      platform,
      signals,
      `Your SAT is under ${INTAKE.minWeeks} weeks away, so a program isn't worth your money.`
    );

  // 2. private tutoring, only when the cohort cannot get the student there
  const tooSoon = weeks != null && weeks < MARCH_PROGRAM.weeks;
  const stuck =
    input.priorPrep === "didnt_move" && input.pace === "slower" && gap >= SELF_STUDY_GAP;
  const reason =
    tooSoon && gap >= SMALL_GAP
      ? `Your SAT is ${weeks} weeks away, and the cohort takes ${MARCH_PROGRAM.weeks}.`
      : gap >= PRIVATE_GAP
        ? `${gap} points is more than a class can promise.`
        : stuck
          ? "Prep didn't work before, so a class is not the fix."
          : null;
  if (reason)
    return tutoring(gap >= LONG_PACKAGE_GAP ? "private-20" : "private-10", signals, reason);
  if (tooSoon)
    return selfPaced(platform, signals, `Your SAT is ${weeks} weeks away, too soon for a cohort.`);

  // 3. the platform alone
  if (input.independence === "on_my_own" && input.pace !== "slower" && gap < SELF_STUDY_GAP)
    return selfPaced(platform, signals, "You study well alone, so you don't need live classes.");

  // 4. the cohort
  return {
    planId: "cohort",
    headline: `The ${MARCH_PROGRAM.planName}`,
    why: `${MARCH_PROGRAM.totalClasses} live classes over ${MARCH_PROGRAM.weeks} weeks, with at most ${MARCH_PROGRAM.paidSeats} students at your score level. Everything in ${PRO_PLAN.name} is included.`,
    signals,
    alsoConsidered: {
      planId: "pro",
      reason: `${formatPrice(PRO_PLAN.monthly)} a month, with no live classes.`,
    },
  };
}

function selfPaced(planId: "practice" | "pro", signals: string[], opener: string): Recommendation {
  if (planId === "practice")
    return {
      planId,
      headline: PRACTICE_PLAN.name,
      why: `${opener} ${PRACTICE_PLAN.name} is the core questions with written explanations, the Daily 10 and full-length practice tests.`,
      signals,
      alsoConsidered: {
        planId: "pro",
        reason: `${formatPrice(PRO_PLAN.monthly)} a month. It adds the hardest questions.`,
      },
    };
  return {
    planId,
    headline: PRO_PLAN.name,
    why: `${opener} ${PRO_PLAN.name} opens every question, the hardest included, with full-length practice tests.`,
    signals,
    alsoConsidered: {
      planId: "cohort",
      reason: `${formatPrice(MARCH_PROGRAM.price)}. ${MARCH_PROGRAM.totalClasses} live classes, if you want a teacher.`,
    },
  };
}

function tutoring(
  planId: "private-10" | "private-20",
  signals: string[],
  reason: string
): Recommendation {
  const pkg = privatePackage(planId);
  return {
    planId,
    headline: pkg.name,
    why: `${reason} ${pkg.hours} hours with a tutor working only with you, at the hours you choose. Everything in ${PRO_PLAN.name} is included.`,
    signals,
    alsoConsidered: {
      planId: "cohort",
      reason: `${formatPrice(MARCH_PROGRAM.price)}. ${MARCH_PROGRAM.totalClasses} live classes in a small group.`,
    },
  };
}
