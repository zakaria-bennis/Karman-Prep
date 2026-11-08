/*
 * Plan gates for the student portal: what the student's plan opens, and the honest way up when
 * it doesn't. Pure, so pages, tests and client components share one rule.
 *
 * This mirrors the pricing session's access API (`src/lib/plans/`: `PlanId`, `PlanEntitlements`,
 * `canAccess(plan, feature, usage)`), which merges later. When it lands:
 *   - replace `planFromSubscription(sub)` with `await getPlan(userId)` from `@/lib/plans`
 *     (it also counts school seats, tutor codes and one-time purchases);
 *   - keep `canUse` for the portal-only features below, and call `canAccess` for the rest.
 * Every caller goes through this file, so the swap happens in one place.
 */

export const STUDENT_PLAN_IDS = [
  "free",
  "practice",
  "pro",
  "cohort",
  "private-10",
  "private-20",
  "school",
  "tutor-affiliate",
] as const;
export type StudentPlanId = (typeof STUDENT_PLAN_IDS)[number];

/** The same shape as `PlanEntitlements` in `src/lib/plans/catalog.ts`. */
export interface PlanEntitlements {
  pool: "core" | "mastery";
  explanations: readonly ("written" | "video")[];
  /** Questions a plan may answer in total, or null for no limit. */
  questionLimit: number | null;
  fullLengthTestLimit: number | null;
  tutorAdmin: boolean;
}

export interface StudentPlan {
  id: StudentPlanId;
  name: string;
  entitlements: PlanEntitlements;
}

const FREE: PlanEntitlements = {
  pool: "core",
  explanations: ["written"],
  questionLimit: 100,
  fullLengthTestLimit: 1,
  tutorAdmin: false,
};
const PRACTICE: PlanEntitlements = {
  pool: "core",
  explanations: ["written"],
  questionLimit: null,
  fullLengthTestLimit: null,
  tutorAdmin: false,
};
const PRO: PlanEntitlements = {
  pool: "mastery",
  explanations: ["written", "video"],
  questionLimit: null,
  fullLengthTestLimit: null,
  tutorAdmin: false,
};

/** Decisions of 2026-11-08 (pricing session): cohort and private include Pro; schools buy Practice. */
export const ENTITLEMENTS: Readonly<Record<StudentPlanId, PlanEntitlements>> = {
  free: FREE,
  practice: PRACTICE,
  pro: PRO,
  cohort: PRO,
  "private-10": PRO,
  "private-20": PRO,
  school: PRACTICE,
  "tutor-affiliate": { ...PRO, tutorAdmin: true },
};

export const PLAN_NAMES: Readonly<Record<StudentPlanId, string>> = {
  free: "Free",
  practice: "Practice",
  pro: "Pro",
  cohort: "9-week Cohort",
  "private-10": "Private 10",
  "private-20": "Private 20",
  school: "School",
  "tutor-affiliate": "Tutor affiliate",
};

const LIVE = new Set(["active", "trialing", "past_due"]);

/** Old `subscriptions.tier` values, until the pricing migration replaces them with `plan_id`. */
const LEGACY_TIER: Record<string, StudentPlanId> = {
  group: "cohort",
  small_group: "cohort",
  private: "private-10",
  elite: "private-20",
  practice: "practice",
  pro: "pro",
};

export function isStudentPlanId(value: unknown): value is StudentPlanId {
  return typeof value === "string" && (STUDENT_PLAN_IDS as readonly string[]).includes(value);
}

export function planOf(id: StudentPlanId): StudentPlan {
  return { id, name: PLAN_NAMES[id], entitlements: ENTITLEMENTS[id] };
}

/**
 * The plan a `subscriptions` row gives. Reads `plan_id` (pricing branch) or the old `tier`.
 * No row, or a row that isn't live, is the Free plan.
 */
export function planFromSubscription(sub: Record<string, unknown> | null | undefined): StudentPlan {
  if (!sub || typeof sub.status !== "string" || !LIVE.has(sub.status)) return planOf("free");
  if (isStudentPlanId(sub.plan_id)) return planOf(sub.plan_id);
  const legacy = typeof sub.tier === "string" ? LEGACY_TIER[sub.tier] : undefined;
  return planOf(legacy ?? "practice");
}

/** What the student has used, for the Free plan's limits. */
export interface PlanUsage {
  questionsAnswered: number;
  fullLengthTestsCompleted: number;
}

export type PortalFeature =
  | "pool:mastery"
  | "explanations:video"
  | "question:new"
  | "full-length-test:new"
  /** Booked 1:1 sessions with a tutor. */
  | "live:private"
  /** The cohort's group sessions. */
  | "live:cohort"
  /** Workshops and office hours. */
  | "live:workshops";

/** Whether the plan opens a feature (same answers as `canAccess` for the shared features). */
export function canUse(plan: StudentPlan, feature: PortalFeature, usage?: PlanUsage): boolean {
  const e = plan.entitlements;
  switch (feature) {
    case "pool:mastery":
      return e.pool === "mastery";
    case "explanations:video":
      return e.explanations.includes("video");
    case "question:new":
      return e.questionLimit === null || (!!usage && usage.questionsAnswered < e.questionLimit);
    case "full-length-test:new":
      return (
        e.fullLengthTestLimit === null ||
        (!!usage && usage.fullLengthTestsCompleted < e.fullLengthTestLimit)
      );
    case "live:private":
      return plan.id === "private-10" || plan.id === "private-20";
    case "live:cohort":
      return plan.id === "cohort";
    case "live:workshops":
      return plan.id !== "free";
  }
}

/** Calendar shows for anyone who can book something: 1:1s, workshops or office hours. */
export function showsCalendar(plan: StudentPlan): boolean {
  return canUse(plan, "live:workshops");
}

/** The honest way to open a locked feature: which plan opens it, and where to get it. */
export function upgradeFor(feature: PortalFeature): { plan: string; href: string } {
  switch (feature) {
    case "pool:mastery":
    case "explanations:video":
      return { plan: "Pro", href: "/pricing" };
    case "question:new":
    case "full-length-test:new":
    case "live:workshops":
      return { plan: "Practice", href: "/pricing" };
    case "live:private":
      return { plan: "Private 10", href: "/private-tutoring" };
    case "live:cohort":
      return { plan: "the 9-week Cohort", href: "/pricing" };
  }
}

/** Questions left on a plan with a limit, or null when there is no limit. */
export function questionsLeft(plan: StudentPlan, usage: PlanUsage): number | null {
  const limit = plan.entitlements.questionLimit;
  return limit === null ? null : Math.max(0, limit - usage.questionsAnswered);
}
