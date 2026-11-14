// ============================================================
// recommendPlan: picks the Karman plan that fits a student from
// the onboarding answers. Plan names, prices and facts all come
// from src/lib/marketing/offer.ts (plan ladder, founder 2026-11-08).
//
// How it decides:
//   · Never ask "group or 1-on-1?". Infer how much personal
//     attention the student needs (score gap, time to the SAT,
//     pace, prior prep, study hours) and whether they need
//     outside structure (independence).
//   · Recommend the lightest plan that fits. Never up-sell.
//   · Honest intake (INTAKE in offer.ts): a student already at
//     1500 or higher, or with the SAT under four weeks away, is
//     told a program probably isn't worth the money.
//
//   High personal attention -> Private 10, or Private 20 when the
//                              gap is large or time is short
//   Needs structure         -> the 9-week Cohort
//   Works independently     -> Practice, or Pro when the gap is
//                              large or the goal is 1400 or higher
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
export type LearningPace = "quick" | "average" | "slower";
export type PriorPrepResult = "first_time" | "worked" | "didnt_move";

/** Plans onboarding can recommend. Free, School and Tutor affiliate never are. */
export type RecommendedPlanId = Extract<
  PlanId,
  "practice" | "pro" | "cohort" | "private-10" | "private-20"
>;

export interface RecommendationInput {
  /** Weeks until the student's planned SAT, or null when no date is picked yet. */
  weeksToTest: number | null;
  /** Goal SAT score (400-1600). */
  goalScore: number;
  /** Most recent SAT or PSAT total, or null if they haven't taken either
   *  (treated as 1000). */
  baselineScore: number | null;
  /** Study hours a week the student can commit. */
  hoursPerWeek: number;
  /** How well the student stays on track without outside structure. */
  independence: Independence;
  /** How fast the student picks up new material. */
  pace: LearningPace;
  /** Prior test prep and how it went. */
  priorPrep: PriorPrepResult;
}

export interface Recommendation {
  planId: RecommendedPlanId;
  /** One sentence shown above the reasoning. */
  headline: string;
  /** Two or three sentences grounded in the student's answers. */
  why: string;
  /** Shown as "We also considered", so families see the alternative. */
  alsoConsidered?: { planId: RecommendedPlanId; reason: string };
  /** The answers the decision used, shown as bullet points. */
  signals: string[];
}

/** Baseline assumed when the student hasn't taken the SAT or PSAT. */
const DEFAULT_BASELINE = 1000;
/** A gap (goal minus baseline) this large calls for Pro, or Private 20. */
export const LARGE_GAP = 200;
/** A goal this high needs the hard mastery pool, so Pro over Practice. */
export const MASTERY_GOAL = 1400;
/** This many weeks or fewer to the SAT counts as short: Private 20 over Private 10. */
export const SHORT_WEEKS = 8;
/** Attention points at or above this call for 1:1 tutoring. */
export const PRIVATE_POINTS = 6;

// ─────────────────────────────────────────────────────────────
// What each plan is, and where its button goes
// ─────────────────────────────────────────────────────────────

export interface PlanSummary {
  name: string;
  /** The real price from offer.ts, in words. */
  price: string;
  /** The next step: checkout for Practice and Pro, the application or call otherwise. */
  href: string;
  /** The button's words. */
  action: string;
}

/** "twice a week" for the cohort's two classes. */
function timesAWeek(n: number): string {
  if (n === 1) return "once a week";
  if (n === 2) return "twice a week";
  return `${n} times a week`;
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
        price: `${formatPrice(plan.monthly)} a month, or ${formatPrice(plan.threeMonths)} for 3 months`,
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
        href: "/private-tutoring#call",
        action: `Book a free ${CALL_MINUTES}-minute call`,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Attention scoring: higher means more personal attention needed
// ─────────────────────────────────────────────────────────────

interface Score {
  points: number;
  signal: string | null;
}

function gapOf(input: RecommendationInput): number {
  return Math.max(0, input.goalScore - (input.baselineScore ?? DEFAULT_BASELINE));
}

function scoreGap(input: RecommendationInput): Score {
  const gap = gapOf(input);
  if (gap >= LARGE_GAP) return { points: 3, signal: `Closing a ${gap}-point gap to the goal.` };
  if (gap >= 130) return { points: 2, signal: `A ${gap}-point goal is a substantial improvement.` };
  if (gap >= 80) return { points: 1, signal: `A ${gap}-point jump is moderate but real work.` };
  return {
    points: 0,
    signal: input.baselineScore ? `Only a ${gap}-point jump from the last score.` : null,
  };
}

function scoreTime(input: RecommendationInput): Score {
  const w = input.weeksToTest;
  if (w == null) return { points: 0, signal: null };
  if (w <= 6) return { points: 3, signal: `Only ${w} weeks until test day, so every hour counts.` };
  if (w <= 12) return { points: 2, signal: `${w} weeks until test day: a tight runway.` };
  if (w <= 20) return { points: 1, signal: `${w} weeks until test day, with no time to waste.` };
  return { points: 0, signal: `${w} weeks until test day: plenty of runway.` };
}

function scorePace(input: RecommendationInput): Score {
  switch (input.pace) {
    case "slower":
      return { points: 2, signal: "Likes to work through new material several ways first." };
    case "average":
      return { points: 1, signal: "Picks up new material at a typical pace." };
    case "quick":
      return { points: 0, signal: "Picks up new material quickly, usually on the first try." };
  }
}

function scorePriorPrep(input: RecommendationInput): Score {
  switch (input.priorPrep) {
    case "didnt_move":
      return { points: 2, signal: "Tried prep before and the score didn't move." };
    case "worked":
      return { points: 0, signal: "Prior prep worked, so already knows how to study for it." };
    case "first_time":
      return { points: 0, signal: null };
  }
}

function scoreHours(input: RecommendationInput): Score {
  if (input.hoursPerWeek < 3) {
    return {
      points: 1,
      signal: `Only about ${input.hoursPerWeek} hours a week to study, so every hour counts.`,
    };
  }
  return { points: 0, signal: null };
}

function independenceSignal(independence: Independence): string {
  switch (independence) {
    case "needs_structure":
      return "Finds it hard to keep to a study plan without someone expecting them.";
    case "with_checkins":
      return "Does best with regular check-ins.";
    case "on_my_own":
      return "Works well alone and can drive their own prep.";
  }
}

/** Why the honest-intake rule applies, or null when it doesn't. */
function intakeReason(input: RecommendationInput): string | null {
  if (input.baselineScore != null && input.baselineScore >= INTAKE.scoreFrom) {
    return `You're already scoring ${input.baselineScore}`;
  }
  if (input.weeksToTest != null && input.weeksToTest < INTAKE.minWeeks) {
    return `Your SAT is less than ${INTAKE.minWeeks} weeks away`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Public entry
// ─────────────────────────────────────────────────────────────

export function recommendPlan(input: RecommendationInput): Recommendation {
  const scores = [
    scoreGap(input),
    scoreTime(input),
    scorePace(input),
    scorePriorPrep(input),
    scoreHours(input),
  ];
  const attention = scores.reduce((sum, s) => sum + s.points, 0);
  const signals = [
    ...scores.map((s) => s.signal).filter((s): s is string => s !== null),
    independenceSignal(input.independence),
  ];

  const gap = gapOf(input);
  const largeGap = gap >= LARGE_GAP;
  const shortTime = input.weeksToTest != null && input.weeksToTest <= SHORT_WEEKS;
  const selfPaced: "practice" | "pro" =
    largeGap || input.goalScore >= MASTERY_GOAL ? "pro" : "practice";

  const intake = intakeReason(input);
  if (intake) {
    const opener = `${intake}, so a program probably isn't the best use of your money.`;
    return selfPacedRecommendation(selfPaced, signals, opener);
  }

  if (attention >= PRIVATE_POINTS) {
    return largeGap || shortTime
      ? privateTwenty(input, gap, largeGap, shortTime, signals)
      : privateTen(signals);
  }

  if (input.independence === "on_my_own") {
    const opener =
      selfPaced === "practice"
        ? "You stay on track on your own, so you don't need live classes to reach your goal."
        : input.goalScore >= MASTERY_GOAL
          ? `You stay on track on your own, and a goal of ${input.goalScore} means working through the hardest questions.`
          : `You stay on track on your own, and a ${gap}-point jump means working through the hardest questions too.`;
    return selfPacedRecommendation(selfPaced, signals, opener);
  }

  return cohort(selfPaced, signals);
}

// ─────────────────────────────────────────────────────────────
// One builder per plan
// ─────────────────────────────────────────────────────────────

function selfPacedRecommendation(
  planId: "practice" | "pro",
  signals: string[],
  opener: string
): Recommendation {
  if (planId === "practice") {
    return {
      planId,
      headline: `${PRACTICE_PLAN.name} is the right fit.`,
      why: `${opener} ${PRACTICE_PLAN.name} gives you the core question pool with written explanations, the Daily 10 and full-length practice tests, on your own schedule.`,
      alsoConsidered: {
        planId: "pro",
        reason: `${PRO_PLAN.name} adds the hard mastery questions, and video explanations as they're recorded, for ${formatPrice(PRO_PLAN.monthly)} a month. Move up if the goal climbs to ${MASTERY_GOAL} or higher.`,
      },
      signals,
    };
  }
  return {
    planId,
    headline: `${PRO_PLAN.name} is the right fit.`,
    why: `${opener} ${PRO_PLAN.name} opens every question, the hard mastery pool included, with written explanations, and video explanations added as they're recorded.`,
    alsoConsidered: {
      planId: "practice",
      reason: `${PRACTICE_PLAN.name} is the core question pool with written explanations, for ${formatPrice(PRACTICE_PLAN.monthly)} a month, if you'd rather leave out the hardest questions.`,
    },
    signals,
  };
}

function cohort(selfPaced: "practice" | "pro", signals: string[]): Recommendation {
  const alternative = selfPaced === "practice" ? PRACTICE_PLAN : PRO_PLAN;
  return {
    planId: "cohort",
    headline: `The ${MARCH_PROGRAM.planName} is the right fit.`,
    why:
      "You do your best work with a set schedule and someone expecting you. " +
      `The Cohort is ${MARCH_PROGRAM.totalClasses} live classes of ${MARCH_PROGRAM.classMinutes} minutes over ${MARCH_PROGRAM.weeks} weeks, ${timesAWeek(MARCH_PROGRAM.classesPerWeek)}, ` +
      `in a group of at most ${MARCH_PROGRAM.paidSeats} students at your score level. Everything in ${PRO_PLAN.name} is included.`,
    alsoConsidered: {
      planId: alternative.id,
      reason: `If you'd rather set your own schedule, ${alternative.name} is ${formatPrice(alternative.monthly)} a month, or ${formatPrice(alternative.threeMonths)} for 3 months, with no live classes.`,
    },
    signals,
  };
}

function privateTen(signals: string[]): Recommendation {
  const pkg = privatePackage("private-10");
  return {
    planId: "private-10",
    headline: `${pkg.name} is the right fit.`,
    why:
      "You'll move fastest with a tutor working only with you, who builds each session around your mistakes. " +
      `${pkg.name} is ${pkg.hours} hours of 1:1 tutoring, scheduled around your week, with everything in ${PRO_PLAN.name}.`,
    alsoConsidered: {
      planId: "cohort",
      reason: `The Cohort costs ${formatPrice(MARCH_PROGRAM.price)} and meets ${timesAWeek(MARCH_PROGRAM.classesPerWeek)} in a group of at most ${MARCH_PROGRAM.paidSeats}, if you'd rather learn alongside others.`,
    },
    signals,
  };
}

function privateTwenty(
  input: RecommendationInput,
  gap: number,
  largeGap: boolean,
  shortTime: boolean,
  signals: string[]
): Recommendation {
  const pkg = privatePackage("private-20");
  const smaller = privatePackage("private-10");
  const reason =
    largeGap && shortTime
      ? `With a ${gap}-point jump and ${input.weeksToTest} weeks to go`
      : largeGap
        ? `With a ${gap}-point jump to make`
        : `With ${input.weeksToTest} weeks to go`;
  return {
    planId: "private-20",
    headline: `${pkg.name} is the right fit.`,
    why:
      `${reason}, you need a tutor working only with you and enough hours to get there. ` +
      `${pkg.name} is ${pkg.hours} hours of 1:1 tutoring, scheduled around your week, with everything in ${PRO_PLAN.name}.`,
    alsoConsidered: {
      planId: "private-10",
      reason: `${smaller.name} is ${smaller.hours} hours for ${formatPrice(smaller.price)}. It fits if you can start early and keep a steady weekly pace.`,
    },
    signals,
  };
}
