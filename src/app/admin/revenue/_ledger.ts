// ============================================================
// The money ledger behind /admin/revenue, rebuilt from what the
// Stripe webhook writes to Supabase:
//   · subscriptions (Practice, Pro, Tutor affiliate): one charge
//     at the start and at every renewal (monthly, or every 3
//     months) until cancelled; the latest cycle of a past-due
//     subscription is unpaid and left out.
//   · plan_grants purchases (Cohort, Private 10, Private 20): one
//     charge on the day bought, or for a Cohort seat on the
//     instalment plan, the deposit and each $300 payment on its
//     date (cohort-installments.ts sets the dates).
//   · refunds: subtracted on the day issued.
// These are the amounts Stripe should have charged, not a read
// of Stripe itself: a declined renewal that later recovered, a
// coupon or a proration would differ. See the page's "Where the
// numbers come from" note for the swap-in.
// Prices come from ./_economics (which reads offer.ts).
// ============================================================

import { MARCH_PROGRAM } from "@/lib/marketing/offer";
import {
  cohortBillingAnchor,
  type CohortPayment,
} from "@/lib/integrations/stripe/cohort-installments";
import {
  ONE_TIME_PLANS,
  isOneTimePlan,
  isRenewingPlan,
  monthlyValue,
  paymentFor,
} from "./_economics";
import { addMonths } from "./_time";

/** Plan families the revenue chart is split by (Private 10 and 20 share one). */
export const FAMILIES = ["practice", "pro", "tutor-affiliate", "cohort", "private"] as const;
export type Family = (typeof FAMILIES)[number];

export interface RawSub {
  userId: string;
  planId: string;
  /** "month" or "quarter" */
  term: string;
  status: string;
  createdAt: string;
  canceledAt: string | null;
  trialEnd?: string | null;
  name?: string | null;
  email?: string | null;
}

export interface RawPurchase {
  userId: string;
  planId: string;
  createdAt: string;
  expiresAt: string | null;
  /** Cohort only: paid at once or by deposit and instalments. Null when not recorded. */
  payment: CohortPayment | null;
}

export interface RawRefund {
  amountCents: number;
  issuedAt: string;
  reason: string | null;
}

export type ChargeKind = "renewal" | "one_time" | "deposit" | "installment" | "booked";

export interface Charge {
  at: number;
  amount: number;
  planId: string;
  family: Family;
  userId: string;
  kind: ChargeKind;
}

/** Statuses Stripe never collected a payment for. */
const NEVER_PAID = new Set(["incomplete", "incomplete_expired"]);
/** Statuses whose latest renewal failed. */
const UNPAID_NOW = new Set(["past_due", "unpaid"]);
/** Statuses that count toward MRR today. */
const LIVE_NOW = new Set(["active", "trialing"]);

/** A renewing subscription Stripe collected at least one payment for. */
export function everPaid(sub: RawSub): boolean {
  return isRenewingPlan(sub.planId) && !NEVER_PAID.has(sub.status);
}

export function familyOf(planId: string): Family | null {
  if (planId === "private-10" || planId === "private-20") return "private";
  if (planId === "cohort" || isRenewingPlan(planId)) return planId as Family;
  return null;
}

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

/** Every payment a renewing subscription made up to `now`. */
export function subscriptionCharges(sub: RawSub, now: number): Charge[] {
  if (!isRenewingPlan(sub.planId) || NEVER_PAID.has(sub.status)) return [];
  const created = ms(sub.createdAt);
  const trialEnd = ms(sub.trialEnd);
  const first = Number.isFinite(trialEnd) && trialEnd > created ? trialEnd : created;
  const canceled = ms(sub.canceledAt);
  const end = Math.min(now, Number.isFinite(canceled) ? canceled : Infinity);
  const every = sub.term === "quarter" ? 3 : 1;
  const amount = paymentFor(sub.planId, sub.term);
  const out: Charge[] = [];
  for (let k = 0; ; k++) {
    const at = addMonths(first, k * every);
    // A charge on the cancel instant itself never happened.
    if (at > end || (Number.isFinite(canceled) && at >= canceled)) break;
    out.push({
      at,
      amount,
      planId: sub.planId,
      family: sub.planId,
      userId: sub.userId,
      kind: "renewal",
    });
  }
  if (UNPAID_NOW.has(sub.status) && out.length > 1) out.pop();
  return out;
}

/** The instalment dates of a cohort seat bought on the deposit plan (deposit excluded). */
export function installmentDates(boughtAt: number): number[] {
  const anchor = cohortBillingAnchor(new Date(boughtAt), MARCH_PROGRAM.startDate);
  const first = anchor === null ? boughtAt : anchor * 1000;
  return Array.from({ length: MARCH_PROGRAM.installments.count }, (_, k) => addMonths(first, k));
}

/** What a one-time purchase has paid up to `now`. */
export function purchaseCharges(p: RawPurchase, now: number): Charge[] {
  if (!isOneTimePlan(p.planId)) return [];
  const at = ms(p.createdAt);
  if (!Number.isFinite(at) || at > now) return [];
  const family = familyOf(p.planId) as Family;
  const base = { planId: p.planId, family, userId: p.userId };
  if (p.planId === "cohort" && p.payment === "installments") {
    const out: Charge[] = [{ ...base, at, amount: MARCH_PROGRAM.depositAmount, kind: "deposit" }];
    for (const due of installmentDates(at)) {
      if (due <= now) {
        out.push({
          ...base,
          at: due,
          amount: MARCH_PROGRAM.installments.amount,
          kind: "installment",
        });
      }
    }
    return out;
  }
  // Not recorded: counted at the full price on the day bought, and marked so.
  const kind: ChargeKind = p.planId === "cohort" && p.payment === null ? "booked" : "one_time";
  return [{ ...base, at, amount: ONE_TIME_PLANS[p.planId].price, kind }];
}

/** Every charge, oldest first. */
export function ledger(subs: RawSub[], purchases: RawPurchase[], now: number): Charge[] {
  return [
    ...subs.flatMap((s) => subscriptionCharges(s, now)),
    ...purchases.flatMap((p) => purchaseCharges(p, now)),
  ].sort((a, b) => a.at - b.at);
}

/** Whether a subscription was paying at instant t. At or after `now`, only active and trialing count. */
export function liveAt(sub: RawSub, t: number, now: number): boolean {
  if (!isRenewingPlan(sub.planId) || NEVER_PAID.has(sub.status)) return false;
  if (t >= now) return LIVE_NOW.has(sub.status);
  const canceled = ms(sub.canceledAt);
  return ms(sub.createdAt) <= t && (!Number.isFinite(canceled) || canceled > t);
}

/** Monthly recurring revenue at instant t, in dollars (quarterly plans count a third a month). */
export function mrrAt(subs: RawSub[], t: number, now: number): number {
  let total = 0;
  for (const s of subs) {
    if (liveAt(s, t, now) && isRenewingPlan(s.planId)) total += monthlyValue(s.planId, s.term);
  }
  return Math.round(total);
}

export function subscribersAt(subs: RawSub[], t: number, now: number): number {
  return subs.filter((s) => liveAt(s, t, now)).length;
}

/** A purchase grant still open at instant t. */
export function holdsAt(p: RawPurchase, t: number): boolean {
  const exp = ms(p.expiresAt);
  return isOneTimePlan(p.planId) && ms(p.createdAt) <= t && (!Number.isFinite(exp) || exp > t);
}

/** Distinct people paying at instant t: a live subscription or an open one-time plan. */
export function payingCustomersAt(
  subs: RawSub[],
  purchases: RawPurchase[],
  t: number,
  now: number
): number {
  const ids = new Set<string>();
  for (const s of subs) if (liveAt(s, t, now)) ids.add(s.userId);
  for (const p of purchases) if (holdsAt(p, Math.min(t, now))) ids.add(p.userId);
  return ids.size;
}

/** When each paying person first paid (subscription start or purchase). */
export function firstPaidAt(subs: RawSub[], purchases: RawPurchase[]): Map<string, number> {
  const first = new Map<string, number>();
  const see = (id: string, at: number) => {
    if (!Number.isFinite(at)) return;
    const cur = first.get(id);
    if (cur === undefined || at < cur) first.set(id, at);
  };
  for (const s of subs) {
    if (isRenewingPlan(s.planId) && !NEVER_PAID.has(s.status)) see(s.userId, ms(s.createdAt));
  }
  for (const p of purchases) if (isOneTimePlan(p.planId)) see(p.userId, ms(p.createdAt));
  return first;
}

/** Subscriptions that ended in [from, to). */
export function cancellationsIn(subs: RawSub[], from: number, to: number): RawSub[] {
  return subs.filter((s) => {
    if (!isRenewingPlan(s.planId) || NEVER_PAID.has(s.status)) return false;
    const c = ms(s.canceledAt);
    return Number.isFinite(c) && c >= from && c < to;
  });
}

/**
 * Monthly churn over a window: subscriptions that ended in it, over the subscriber-months
 * lived in it (each subscription counts the part of the window it was live for, in 30-day
 * months). For a steady month this is cancellations over subscribers; over 12 months of
 * growth it stays a true monthly rate. Null when nobody was subscribed in the window.
 */
export function monthlyChurn(subs: RawSub[], from: number, to: number): number | null {
  let exposure = 0;
  for (const s of subs) {
    if (!everPaid(s)) continue;
    const start = Math.max(from, ms(s.createdAt));
    const c = ms(s.canceledAt);
    const end = Math.min(to, Number.isFinite(c) ? c : Infinity);
    if (end > start) exposure += (end - start) / (30 * 86_400_000);
  }
  if (exposure <= 0) return null;
  return Math.min(1, cancellationsIn(subs, from, to).length / exposure);
}

/** LTV of a subscriber: average monthly revenue over monthly churn. Null without churn. */
export function lifetimeValue(
  mrr: number,
  subscribers: number,
  churn: number | null
): number | null {
  if (!churn || subscribers === 0 || mrr === 0) return null;
  return Math.round(mrr / subscribers / churn);
}
