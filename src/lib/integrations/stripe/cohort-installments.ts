// ============================================================
// The cohort's instalment plan (founder, 2026-11-08): a $95 deposit at
// checkout (the card is saved), then three monthly payments of $300
// ($95 + 3 x $300 = $995). The webhook creates a Stripe subscription
// schedule for the payments: three months from the cohort's start date,
// ending by itself (installment-schedule.ts). Test mode tonight.
// ============================================================

import { MARCH_PROGRAM } from "@/lib/marketing/offer";

/** How a cohort seat is paid: $995 at once, or the deposit and three payments. */
export const COHORT_PAYMENT_OPTIONS = ["full", "installments"] as const;
export type CohortPayment = (typeof COHORT_PAYMENT_OPTIONS)[number];

const DAY_SECONDS = 24 * 60 * 60;

/**
 * The first $300 payment date, as Unix seconds: the cohort's start date (noon UTC), when it
 * is more than two days away. Null once the cohort has started: the first payment is then
 * charged with the deposit. CONFIRM: later cohorts need their own start date here.
 */
export function cohortBillingAnchor(
  now: Date = new Date(),
  startDate: string = MARCH_PROGRAM.startDate
): number | null {
  const start = Date.parse(`${startDate}T12:00:00Z`);
  if (Number.isNaN(start)) return null;
  return start - now.getTime() > 2 * DAY_SECONDS * 1000 ? Math.floor(start / 1000) : null;
}
