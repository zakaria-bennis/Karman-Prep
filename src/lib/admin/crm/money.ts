// ============================================================
// Admin CRM: what a contact has paid, estimated from local rows.
// The database keeps no payment amounts (only refunds), so a
// subscription counts its list price once per billing period
// started, and a one-time purchase counts its list price. Prices
// come from offer.ts. Stripe holds the exact amounts.
// ============================================================

import {
  MARCH_PROGRAM,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  TUTOR_AFFILIATE_PLAN,
} from "@/lib/marketing/offer";
import type { PlanId } from "@/lib/admin/plans";
import type { CrmSubscription } from "./types";

const dollars = (n: number) => Math.round(n * 100);

/** List price in cents of one billing period ("month" or "quarter"), or null when unknown. */
export function subscriptionPeriodCents(planId: PlanId | null, term: string | null): number | null {
  const quarter = term === "quarter";
  if (planId === "practice")
    return dollars(quarter ? PRACTICE_PLAN.threeMonths : PRACTICE_PLAN.monthly);
  if (planId === "pro") return dollars(quarter ? PRO_PLAN.threeMonths : PRO_PLAN.monthly);
  if (planId === "tutor-affiliate" && !quarter) return dollars(TUTOR_AFFILIATE_PLAN.monthly);
  return null;
}

/** List price in cents of a one-time plan, or null. */
export function purchaseCents(planId: PlanId | null): number | null {
  if (planId === MARCH_PROGRAM.planId) return dollars(MARCH_PROGRAM.price);
  const pkg = PRIVATE_PACKAGES.find((p) => p.id === planId);
  return pkg ? dollars(pkg.price) : null;
}

/** Whole calendar months from a to b (b on or after a). */
export function monthsBetween(a: Date, b: Date): number {
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) m -= 1;
  return Math.max(0, m);
}

const NEVER_PAID = new Set(["incomplete", "incomplete_expired"]);

/** Billing periods a subscription has started: the first payment, then one per period. */
export function periodsStarted(sub: CrmSubscription, now: Date): number {
  if (NEVER_PAID.has(sub.status) || !sub.createdAt) return 0;
  const created = Date.parse(sub.createdAt);
  const trial = sub.trialEnd ? Date.parse(sub.trialEnd) : NaN;
  const start = new Date(Number.isFinite(trial) && trial > created ? trial : created);
  const endMs = Math.min(
    sub.canceledAt ? Date.parse(sub.canceledAt) : now.getTime(),
    now.getTime()
  );
  if (start.getTime() > endMs) return 0;
  const months = monthsBetween(start, new Date(endMs));
  return Math.floor(months / (sub.billingTerm === "quarter" ? 3 : 1)) + 1;
}

export { formatCents } from "./format";
