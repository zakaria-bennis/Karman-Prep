/*
 * Plan gates for the student portal: what the student's plan opens, and the honest way up when
 * it doesn't. The plan itself comes from the pricing session's `getPlan` (src/lib/plans, read in
 * src/lib/student/context.ts); `canAccess` there answers pools, explanations and limits. This
 * file adds what only the portal asks: live sessions, workshops, which tabs show, and where to
 * upgrade.
 */
import { canAccess } from "@/lib/plans/access";
import { PLAN_ENTITLEMENTS, type PlanEntitlements, type PlanId } from "@/lib/plans/catalog";

/** The plan ids and access come from the pricing session's `src/lib/plans` (one source). */
export type StudentPlanId = PlanId;

export interface StudentPlan {
  id: PlanId;
  name: string;
  entitlements: PlanEntitlements;
}

export const PLAN_NAMES: Readonly<Record<PlanId, string>> = {
  free: "Free",
  practice: "Practice",
  pro: "Pro",
  cohort: "9-week Cohort",
  "private-10": "Private 10",
  "private-20": "Private 20",
  school: "School",
  "tutor-affiliate": "Tutor affiliate",
};

/** A resolved plan (`getPlan` in src/lib/plans) as the portal shows it. */
export function studentPlan(
  id: PlanId,
  entitlements: PlanEntitlements = PLAN_ENTITLEMENTS[id]
): StudentPlan {
  return { id, name: PLAN_NAMES[id], entitlements };
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

/** Whether the plan opens a feature. Pools, explanations and limits are `canAccess`'s answers. */
export function canUse(plan: StudentPlan, feature: PortalFeature, usage?: PlanUsage): boolean {
  switch (feature) {
    case "pool:mastery":
    case "explanations:video":
    case "question:new":
    case "full-length-test:new":
      return canAccess(plan, feature, usage);
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
