// ============================================================
// Sample rows for /admin/revenue, used only when the page is in
// sample mode (?sample=1, or too few paid rows to draw a chart).
// Every panel then wears a "Sample data" badge, and no sample row
// is ever mixed into real ones. The same seed gives the same rows
// for the same day. People are "Sample student 12", never names.
// Plans and prices are the real ones (./_economics, offer.ts);
// only the customers, dates and cancellations are made up.
// ============================================================

import type { CohortPayment } from "@/lib/integrations/stripe/cohort-installments";
import type { RawPurchase, RawRefund, RawSub } from "./_ledger";
import type { RawBooking, RawSchool, RevenueInput } from "./_metrics";
import { addMonths } from "./_time";

const DAY = 86_400_000;

/** A small, fast, seeded random number generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Monthly chance a subscriber cancels, by plan (made up, for the sample only). */
const HAZARD: Record<string, number> = { practice: 0.11, pro: 0.07, "tutor-affiliate": 0.05 };

export function sampleInput(now: number, seed = 20261112): RevenueInput {
  const r = rng(seed);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const subs: RawSub[] = [];
  const purchases: RawPurchase[] = [];
  const refunds: RawRefund[] = [];
  const bookings: RawBooking[] = [];
  let n = 0;
  const person = () => {
    n += 1;
    return { userId: `sample_${n}`, name: `Sample student ${n}`, email: null };
  };
  const iso = (t: number) => new Date(t).toISOString();

  // Fourteen months of sign-ups, growing as the word spreads.
  for (let back = 13; back >= 0; back--) {
    const monthStart = addMonths(now, -back) - 15 * DAY;
    const growth = 13 - back;
    const plans: Array<[string, number]> = [
      ["practice", 3 + growth * 1.1],
      ["pro", 2 + growth * 0.8],
      ["tutor-affiliate", growth > 6 ? 0.6 : 0.2],
    ];
    for (const [planId, rate] of plans) {
      const count = Math.round(rate * (0.7 + r() * 0.6));
      for (let i = 0; i < count; i++) {
        const created = monthStart + r() * 30 * DAY;
        if (created > now) continue;
        const term = planId !== "tutor-affiliate" && r() < 0.35 ? "quarter" : "month";
        let months = 0;
        while (r() > HAZARD[planId] && months < 40) months += 1;
        const cancelAt = addMonths(created, months + 1) - r() * 20 * DAY;
        const canceled = cancelAt < now ? cancelAt : null;
        const status = canceled ? "canceled" : r() < 0.05 ? "past_due" : "active";
        subs.push({
          ...person(),
          planId,
          term,
          status,
          createdAt: iso(created),
          canceledAt: canceled ? iso(canceled) : null,
        });
      }
    }
    // Private packages, a few a month.
    for (const planId of ["private-10", "private-20"] as const) {
      const count = Math.round(
        (planId === "private-10" ? 0.9 : 0.5) * (0.4 + r() * 1.2) * (1 + growth / 10)
      );
      for (let i = 0; i < count; i++) {
        const created = monthStart + r() * 30 * DAY;
        if (created > now) continue;
        purchases.push({
          ...person(),
          planId,
          createdAt: iso(created),
          expiresAt: null,
          payment: null,
        });
      }
    }
  }

  // Cohort seats: enrolment opened this month, some paid in full, most on the deposit plan.
  const seatOptions: CohortPayment[] = [
    "installments",
    "installments",
    "full",
    "installments",
    "full",
    "installments",
    "installments",
  ];
  seatOptions.forEach((payment, i) => {
    const created = now - (2 + i * 3.5 + r() * 2) * DAY;
    purchases.push({
      ...person(),
      planId: "cohort",
      createdAt: iso(created),
      expiresAt: null,
      payment,
    });
  });

  // Refunds: about one charge in forty, often part of it.
  const prices: Record<string, number> = { practice: 39, pro: 69, "tutor-affiliate": 199 };
  for (const s of subs) {
    if (r() < 0.06) {
      const at = Date.parse(s.createdAt) + r() * 10 * DAY;
      if (at < now) {
        refunds.push({
          amountCents: Math.round(prices[s.planId] * (r() < 0.5 ? 1 : 0.5) * 100),
          issuedAt: iso(at),
          reason: pick(["requested_by_customer", "duplicate", "requested_by_customer", null]),
        });
      }
    }
  }
  for (const p of purchases.filter((x) => x.planId !== "cohort")) {
    if (r() < 0.08) {
      const at = Date.parse(p.createdAt) + (3 + r() * 20) * DAY;
      if (at < now)
        refunds.push({ amountCents: 30000, issuedAt: iso(at), reason: "requested_by_customer" });
    }
  }

  // Private sessions with two sample tutors, about one a week per package.
  const tutors = [
    { tutorId: "sample_tutor_a", tutorName: "Sample tutor A" },
    { tutorId: "sample_tutor_b", tutorName: "Sample tutor B" },
  ];
  for (const p of purchases.filter((x) => x.planId !== "cohort")) {
    const tutor = pick(tutors);
    const weeks = p.planId === "private-20" ? 20 : 10;
    for (let w = 0; w < weeks; w++) {
      const start = Date.parse(p.createdAt) + (w * 7 + 2) * DAY;
      if (start > now) break;
      bookings.push({
        ...tutor,
        studentClerkId: p.userId,
        minutes: 60,
        start: iso(start),
        isPrivate: true,
      });
    }
  }

  const schools: RawSchool[] = [
    {
      name: "Sample school",
      freeUntil: new Date(addMonths(now, 9)).toISOString().slice(0, 10),
      billingStatus: "free_year",
      seats: 64,
    },
  ];

  return {
    subs,
    purchases,
    refunds,
    bookings,
    schools,
    freeStudents: 180 + Math.round(r() * 40),
    sponsoredStudents: 23,
    snapshots: [],
  };
}
