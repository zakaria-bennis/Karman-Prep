// ============================================================
// What each plan brings in, for the admin Revenue dashboard.
// Prices come from src/lib/marketing/offer.ts (plan ladder,
// founder 2026-11-08):
//   · Renewing plans: a `subscriptions` row with plan_id
//     (practice, pro, tutor-affiliate) and billing_term (month,
//     quarter). Counted at their monthly value: the monthly
//     price, or the 3-month price over 3.
//   · One-time plans: a `plan_grants` row with source 'purchase'
//     (cohort, private-10, private-20). Counted when bought.
// ============================================================

import {
  MARCH_PROGRAM,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  TUTOR_AFFILIATE_PLAN,
  formatPrice,
} from "@/lib/marketing/offer";
import {
  ONE_TIME_PLAN_IDS,
  SUBSCRIPTION_PLAN_IDS,
  type OneTimePlanId,
  type SubscriptionPlanId,
} from "@/lib/plans/catalog";
import type { TierBreakdown } from "./_types";

interface RenewingPlan {
  label: string;
  monthly: number;
  /** One payment for 3 months, or null when the plan is monthly only. */
  threeMonths: number | null;
  color: string;
}

interface OneTimePlan {
  label: string;
  price: number;
  /** Tutoring hours in the package, or null for the cohort. */
  hours: number | null;
  color: string;
}

function privatePackage(id: "private-10" | "private-20") {
  const pkg = PRIVATE_PACKAGES.find((p) => p.id === id);
  if (!pkg) throw new Error(`offer.ts has no private package ${id}`);
  return pkg;
}

export const RENEWING_PLANS: Record<SubscriptionPlanId, RenewingPlan> = {
  practice: {
    label: PRACTICE_PLAN.name,
    monthly: PRACTICE_PLAN.monthly,
    threeMonths: PRACTICE_PLAN.threeMonths,
    color: "#2FA8FF",
  },
  pro: {
    label: PRO_PLAN.name,
    monthly: PRO_PLAN.monthly,
    threeMonths: PRO_PLAN.threeMonths,
    color: "#8BA86A",
  },
  "tutor-affiliate": {
    label: TUTOR_AFFILIATE_PLAN.name,
    monthly: TUTOR_AFFILIATE_PLAN.monthly,
    threeMonths: null,
    color: "#E0A24A",
  },
};

export const ONE_TIME_PLANS: Record<OneTimePlanId, OneTimePlan> = {
  cohort: {
    label: MARCH_PROGRAM.planName,
    price: MARCH_PROGRAM.price,
    hours: null,
    color: "#C8AB6A",
  },
  "private-10": {
    label: privatePackage("private-10").name,
    price: privatePackage("private-10").price,
    hours: privatePackage("private-10").hours,
    color: "#B07A5A",
  },
  "private-20": {
    label: privatePackage("private-20").name,
    price: privatePackage("private-20").price,
    hours: privatePackage("private-20").hours,
    color: "#7A6AA8",
  },
};

export function isRenewingPlan(id: string): id is SubscriptionPlanId {
  return (SUBSCRIPTION_PLAN_IDS as readonly string[]).includes(id);
}

export function isOneTimePlan(id: string): id is OneTimePlanId {
  return (ONE_TIME_PLAN_IDS as readonly string[]).includes(id);
}

/** What one renewing subscription bills, per payment. */
export function paymentFor(planId: SubscriptionPlanId, term: string): number {
  const plan = RENEWING_PLANS[planId];
  return term === "quarter" && plan.threeMonths !== null ? plan.threeMonths : plan.monthly;
}

/** One renewing subscription's monthly value: the monthly price, or the 3-month price over 3. */
export function monthlyValue(planId: SubscriptionPlanId, term: string): number {
  const plan = RENEWING_PLANS[planId];
  return term === "quarter" && plan.threeMonths !== null ? plan.threeMonths / 3 : plan.monthly;
}

export interface SubscriptionLine {
  plan_id: string;
  billing_term: string;
}

export interface PurchaseLine {
  plan_id: string;
}

/** Monthly value of every active renewing subscription, in whole dollars. */
export function renewingMrr(activeSubs: SubscriptionLine[]): number {
  const total = activeSubs.reduce(
    (sum, s) => sum + (isRenewingPlan(s.plan_id) ? monthlyValue(s.plan_id, s.billing_term) : 0),
    0
  );
  return Math.round(total);
}

/**
 * One row per plan for the table and the pie. Renewing plans show their
 * active subscribers at monthly value; one-time plans show the students who
 * hold one now and the purchases made in the last 30 days.
 */
export function planBreakdown(
  activeSubs: SubscriptionLine[],
  activeGrants: PurchaseLine[],
  purchases30d: PurchaseLine[]
): TierBreakdown[] {
  const renewing = SUBSCRIPTION_PLAN_IDS.map((planId): TierBreakdown => {
    const plan = RENEWING_PLANS[planId];
    const subs = activeSubs.filter((s) => s.plan_id === planId);
    const quarterly = subs.filter((s) => s.billing_term === "quarter" && plan.threeMonths !== null);
    const monthly = subs.length - quarterly.length;
    const parts = [`${monthly} monthly × ${formatPrice(plan.monthly)}`];
    if (plan.threeMonths !== null && quarterly.length > 0) {
      parts.push(`${quarterly.length} every 3 months × ${formatPrice(plan.threeMonths)}`);
    }
    return {
      tier: planId,
      label: plan.label,
      color: plan.color,
      model: "subscription",
      price: plan.monthly,
      studentCount: subs.length,
      revenue: renewingMrr(subs),
      unitsLabel: parts.join(", "),
    };
  });

  const oneTime = ONE_TIME_PLAN_IDS.map((planId): TierBreakdown => {
    const plan = ONE_TIME_PLANS[planId];
    const bought = purchases30d.filter((p) => p.plan_id === planId).length;
    return {
      tier: planId,
      label: plan.label,
      color: plan.color,
      model: "one_time",
      price: plan.price,
      studentCount: activeGrants.filter((g) => g.plan_id === planId).length,
      revenue: bought * plan.price,
      unitsLabel: `${bought} bought in the last 30 days × ${formatPrice(plan.price)}`,
    };
  });

  return [...renewing, ...oneTime];
}
