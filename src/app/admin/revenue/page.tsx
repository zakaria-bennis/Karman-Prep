// ============================================================
// /admin/revenue: the money view.
//
// Raw rows come from Supabase (./_load: what the Stripe webhook
// writes). ./_ledger rebuilds every charge from them, ./_metrics
// turns that into the headline numbers, the charts and the
// tables for 30 days, 13 weeks and 12 months, bucketed in
// Austin time. Prices come from offer.ts via ./_economics.
//
// Sample mode: with ?sample=1, or by itself while the database
// holds fewer than SAMPLE_THRESHOLD paid rows, the page draws
// from ./_sample instead, and every panel says "Sample data".
// ?sample=0 always shows the real numbers. Never both at once.
//
// For real numbers in production:
//   · the Stripe webhook (/api/stripe/webhook) points at the live
//     site with these events on: checkout.session.completed,
//     checkout.session.async_payment_succeeded,
//     customer.subscription.created / .updated / .deleted,
//     charge.refunded;
//   · something presses "Snapshot MRR now" nightly (a cron calling
//     snapshotRevenueAction's logic), so rebuilt MRR has a check;
//   · whether a Cohort seat chose the deposit plan is not stored
//     yet: until it is (a column on plan_grants, or a payments
//     table fed by invoice.paid), real seats count at full price.
// ============================================================

import type { Metadata } from "next";
import RevenueClient from "./RevenueClient";
import { snapshotRevenueAction } from "./actions";
import { loadRevenueInput } from "./_load";
import { buildRevenue, paidRowCount } from "./_metrics";
import { sampleInput } from "./_sample";
import type { RevenueData } from "./_types";

export const metadata: Metadata = { title: "Admin: Revenue | Karman" };
export const dynamic = "force-dynamic";

/** Paid rows (subscriptions and purchases) needed before the charts show real numbers by themselves. */
const SAMPLE_THRESHOLD = 12;

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ask = typeof sp.sample === "string" ? sp.sample : undefined;
  const now = Date.now();
  const real = await loadRevenueInput(now);
  const realPaidRows = paidRowCount(real);
  const sampleReason =
    ask === "1" ? "asked" : ask !== "0" && realPaidRows < SAMPLE_THRESHOLD ? "thin" : null;

  const data: RevenueData = {
    ...buildRevenue(sampleReason ? sampleInput(now) : real, now),
    sample: sampleReason !== null,
    sampleReason,
    realPaidRows,
    sampleThreshold: SAMPLE_THRESHOLD,
  };
  return <RevenueClient data={data} snapshotAction={snapshotRevenueAction} />;
}
