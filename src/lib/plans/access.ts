// ============================================================
// Pure access rules: given a user's resolved plan (and, for the
// free plan, their usage), may they see this pool, this
// explanation, start a new question or a full-length test?
// No database access; safe in any server or client module.
// ============================================================

import { parseDifficulty } from "@/lib/question-bank/import-difficulty";
import { DIFFICULTY_ORDER, type QuizDifficultyLevel } from "@/types/quiz";
import {
  CORE_MAX_DIFFICULTY,
  MAX_DIFFICULTY,
  type ExplanationType,
  type PlanEntitlements,
  type QuestionPool,
} from "./catalog";

export const FEATURES = [
  "pool:core",
  "pool:mastery",
  "explanations:written",
  "explanations:video",
  "question:new",
  "full-length-test:new",
  "tutor-admin",
] as const;
export type Feature = (typeof FEATURES)[number];

/** What a user has used up, for plans with limits (the free plan). See `getUsage`. */
export interface PlanUsage {
  /** Distinct questions the user has answered, ever. */
  questionsAnswered: number;
  /** Full-length tests the user has completed. */
  fullLengthTestsCompleted: number;
}

/** Anything carrying entitlements: a `ResolvedPlan` from `getPlan`, or a test double. */
export interface PlanAccess {
  entitlements: PlanEntitlements;
}

const underLimit = (limit: number | null, used: number | undefined): boolean =>
  limit === null || (used !== undefined && used < limit);

/**
 * Whether the plan opens a feature. `question:new` and `full-length-test:new`
 * need `usage` when the plan has a limit; without it they answer false.
 */
export function canAccess(plan: PlanAccess, feature: Feature, usage?: PlanUsage): boolean {
  const e = plan.entitlements;
  switch (feature) {
    case "pool:core":
      return true;
    case "pool:mastery":
      return e.pool === "mastery";
    case "explanations:written":
      return e.explanations.includes("written");
    case "explanations:video":
      return e.explanations.includes("video");
    case "question:new":
      return underLimit(e.questionLimit, usage?.questionsAnswered);
    case "full-length-test:new":
      return underLimit(e.fullLengthTestLimit, usage?.fullLengthTestsCompleted);
    case "tutor-admin":
      return e.tutorAdmin;
  }
}

/**
 * A question difficulty as stored (`quiz_questions.difficulty_level`, 1 to 7),
 * as a numeric string, or as a legacy label ("mastery" maps to 6). Null when
 * it is none of these.
 */
export function difficultyLevel(value: unknown): QuizDifficultyLevel | null {
  if (typeof value === "number" || (typeof value === "string" && /^\s*\d+\s*$/.test(value))) {
    const level = Number(value);
    return Number.isInteger(level) && level >= 1 && level <= MAX_DIFFICULTY
      ? (level as QuizDifficultyLevel)
      : null;
  }
  if (typeof value === "string" && (DIFFICULTY_ORDER as readonly string[]).includes(value.trim())) {
    return parseDifficulty(value).level;
  }
  return null;
}

/** Difficulty 1 to 5 is core, 6 and 7 mastery. An unreadable difficulty counts as mastery. */
export function poolFor(difficulty: unknown): QuestionPool {
  const level = difficultyLevel(difficulty);
  return level !== null && level <= CORE_MAX_DIFFICULTY ? "core" : "mastery";
}

/**
 * Whether the user may open a question of this difficulty. A question they
 * have already answered stays open to review after the free limit is reached.
 */
export function canSeeQuestion(
  plan: PlanAccess,
  difficulty: unknown,
  usage?: PlanUsage,
  options: {
    alreadyAnswered?: boolean;
    /** The lowest difficulty this question's skill has; see `isCoreFallback`. */
    skillMinDifficulty?: number | null;
  } = {}
): boolean {
  const pool = poolFor(difficulty);
  const open =
    canAccess(plan, pool === "core" ? "pool:core" : "pool:mastery") ||
    isCoreFallback(difficulty, options.skillMinDifficulty);
  if (!open) return false;
  return options.alreadyAnswered === true || canAccess(plan, "question:new", usage);
}

/**
 * Core must cover every skill (founder, 2026-11-08). When a skill has no core
 * questions at all (its easiest question is above difficulty 5), core plans
 * get that skill's easiest rows instead: the questions at its lowest
 * difficulty.
 */
export function isCoreFallback(difficulty: unknown, skillMinDifficulty?: number | null): boolean {
  const level = difficultyLevel(difficulty);
  return (
    level !== null &&
    typeof skillMinDifficulty === "number" &&
    skillMinDifficulty > CORE_MAX_DIFFICULTY &&
    level === skillMinDifficulty
  );
}

/**
 * The difficulty range to query for one skill. Mastery plans get 1 to 7.
 * Core plans get 1 to 5, or, for a skill with no core questions, just that
 * skill's lowest difficulty (`isCoreFallback`).
 */
export function difficultyRangeForSkill(
  plan: PlanAccess,
  skillMinDifficulty: number | null
): { minimumDifficulty: number; maximumDifficulty: number } {
  const range = difficultyRangeFor(plan);
  if (
    plan.entitlements.pool === "core" &&
    skillMinDifficulty !== null &&
    skillMinDifficulty > CORE_MAX_DIFFICULTY
  ) {
    return { minimumDifficulty: skillMinDifficulty, maximumDifficulty: skillMinDifficulty };
  }
  return range;
}

/** Explanation types to show, in display order: ["written"] or ["written", "video"]. */
export function explanationTypes(plan: PlanAccess): ExplanationType[] {
  return [...plan.entitlements.explanations];
}

/**
 * The difficulty range to query for this plan, shaped like the input of
 * `fetchCatalogQuestionPool`: 1 to 5 for core, 1 to 7 for mastery. Filter on
 * `quiz_questions.difficulty_level` with it.
 */
export function difficultyRangeFor(plan: PlanAccess): {
  minimumDifficulty: 1;
  maximumDifficulty: number;
} {
  return {
    minimumDifficulty: 1,
    maximumDifficulty: plan.entitlements.pool === "mastery" ? MAX_DIFFICULTY : CORE_MAX_DIFFICULTY,
  };
}

/** Questions left under the plan's limit; null when there is no limit. */
export function questionsLeft(plan: PlanAccess, usage: PlanUsage): number | null {
  const limit = plan.entitlements.questionLimit;
  return limit === null ? null : Math.max(0, limit - usage.questionsAnswered);
}
