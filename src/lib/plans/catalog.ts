// ============================================================
// What each plan opens on the platform. Built from the plan facts
// in src/lib/marketing/offer.ts (founder's plan table, 2026-11-08),
// so a change there changes access here. Pure data, safe anywhere.
// ============================================================

import {
  FREE_PLAN,
  MARCH_PROGRAM,
  PLAN_IDS,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  SCHOOL_PLAN,
  TUTOR_AFFILIATE_PLAN,
  type PlanId,
} from "@/lib/marketing/offer";

export { PLAN_IDS, type PlanId };

/** `core` = difficulty 1 to 5. `mastery` = every question, difficulty 6 and 7 included. */
export type QuestionPool = "core" | "mastery";
export type ExplanationType = "written" | "video";

export interface PlanEntitlements {
  /** The widest question pool the plan opens. */
  pool: QuestionPool;
  /** Explanation types the plan shows, in display order. */
  explanations: readonly ExplanationType[];
  /** Distinct questions the user may ever answer; null = no limit. */
  questionLimit: number | null;
  /** Full-length tests the user may complete; null = no limit. */
  fullLengthTestLimit: number | null;
  /** Admin rights over the students who redeemed the user's affiliate code. */
  tutorAdmin: boolean;
  /** How many students the user may sponsor at once (tutor-affiliate only). */
  maxSponsoredStudents?: number;
}

/** Plans Stripe bills as a recurring subscription (rows in `public.subscriptions`). */
export const SUBSCRIPTION_PLAN_IDS = ["practice", "pro", "tutor-affiliate"] as const;
export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLAN_IDS)[number];

/** Plans bought with one payment. They become a `purchase` grant. */
export const ONE_TIME_PLAN_IDS = [
  MARCH_PROGRAM.planId,
  ...PRIVATE_PACKAGES.map((pkg) => pkg.id),
] as const satisfies readonly PlanId[];
export type OneTimePlanId = (typeof ONE_TIME_PLAN_IDS)[number];

/** Plans a row in `public.plan_grants` may hold (matches the table's check constraint). */
export const GRANT_PLAN_IDS = ["practice", "pro", ...ONE_TIME_PLAN_IDS] as const;
export type GrantPlanId = (typeof GRANT_PLAN_IDS)[number];

/** Highest difficulty in the core pool. Difficulty runs 1 to 7; 6 and 7 are the mastery pool. */
export const CORE_MAX_DIFFICULTY = 5;
export const MAX_DIFFICULTY = 7;

const practice: PlanEntitlements = {
  pool: PRACTICE_PLAN.pool,
  explanations: [PRACTICE_PLAN.explanations],
  questionLimit: null,
  fullLengthTestLimit: null,
  tutorAdmin: false,
};

/** Pro shows video explanations as well as written ones. */
const pro: PlanEntitlements = {
  pool: PRO_PLAN.pool,
  explanations: ["written", PRO_PLAN.explanations],
  questionLimit: null,
  fullLengthTestLimit: null,
  tutorAdmin: false,
};

/** The plan a school or a tutor-affiliate code gives each student. */
const STUDENT_PLAN = { practice, pro } as const;

/** Every plan's platform access. */
export const PLAN_ENTITLEMENTS: Readonly<Record<PlanId, PlanEntitlements>> = {
  free: {
    pool: "core",
    explanations: ["written"],
    questionLimit: FREE_PLAN.questionLimit,
    fullLengthTestLimit: FREE_PLAN.fullLengthTests,
    tutorAdmin: false,
  },
  practice,
  pro,
  // Decision (2026-11-08): the cohort and both private packages include Pro.
  cohort: pro,
  "private-10": pro,
  "private-20": pro,
  // A school buys each student a Practice plan of their own.
  school: STUDENT_PLAN[SCHOOL_PLAN.studentPlan],
  // Decision (2026-11-08): the tutor gets Pro for themselves, plus admin rights
  // over the students who redeem their code.
  "tutor-affiliate": {
    ...pro,
    tutorAdmin: true,
    maxSponsoredStudents: TUTOR_AFFILIATE_PLAN.maxStudents,
  },
};

/** free 0 < practice and school 1 < pro, cohort, private and tutor-affiliate 2. */
const RANK: Readonly<Record<PlanId, number>> = {
  free: 0,
  practice: 1,
  school: 1,
  pro: 2,
  cohort: 2,
  "private-10": 2,
  "private-20": 2,
  "tutor-affiliate": 2,
};

/** Breaks ties between plans of the same rank: the plan that adds more comes first. */
const TIE_ORDER: readonly PlanId[] = [
  "tutor-affiliate",
  "private-20",
  "private-10",
  "cohort",
  "pro",
  "practice",
  "school",
  "free",
];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

/** How generous a plan's platform access is: 0 (free), 1 (practice level), 2 (pro level). */
export function planRank(planId: PlanId): number {
  return RANK[planId];
}

/** Sort comparator: the most generous plan first. */
export function compareGenerosity(a: PlanId, b: PlanId): number {
  return RANK[b] - RANK[a] || TIE_ORDER.indexOf(a) - TIE_ORDER.indexOf(b);
}

/** The most generous plan in the list; "free" for an empty list. */
export function mostGenerous(planIds: readonly PlanId[]): PlanId {
  return [...planIds].sort(compareGenerosity)[0] ?? "free";
}

const unlimitedOrMax = (limits: (number | null)[]): number | null =>
  limits.some((limit) => limit === null) ? null : Math.max(...(limits as number[]));

/**
 * Union of several plans' access: the wider pool, every explanation type, the
 * higher limit (no limit beats any number) and any tutor rights. Always
 * includes the free plan, which everyone holds.
 */
export function mergeEntitlements(planIds: readonly PlanId[]): PlanEntitlements {
  const all = ["free" as const, ...planIds].map((id) => PLAN_ENTITLEMENTS[id]);
  const sponsored = all.flatMap((e) =>
    e.maxSponsoredStudents === undefined ? [] : [e.maxSponsoredStudents]
  );
  const types = new Set(all.flatMap((e) => e.explanations));
  return {
    pool: all.some((e) => e.pool === "mastery") ? "mastery" : "core",
    explanations: (["written", "video"] as const).filter((type) => types.has(type)),
    questionLimit: unlimitedOrMax(all.map((e) => e.questionLimit)),
    fullLengthTestLimit: unlimitedOrMax(all.map((e) => e.fullLengthTestLimit)),
    tutorAdmin: all.some((e) => e.tutorAdmin),
    ...(sponsored.length ? { maxSponsoredStudents: Math.max(...sponsored) } : {}),
  };
}
