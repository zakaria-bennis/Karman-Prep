import { describe, expect, it } from "vitest";
import {
  MARCH_PROGRAM,
  PRACTICE_PLAN,
  PRO_PLAN,
  TUTOR_AFFILIATE_PLAN,
} from "@/lib/marketing/offer";
import {
  installmentDates,
  ledger,
  monthlyChurn,
  mrrAt,
  purchaseCharges,
  subscriptionCharges,
  type RawPurchase,
  type RawSub,
} from "./_ledger";
import {
  buildPeriod,
  cohortPayments,
  paidRowCount,
  retention,
  type RevenueInput,
} from "./_metrics";
import { sampleInput } from "./_sample";
import { addMonths, bucketIndex, buildBuckets, monthKey, zonedMidnight } from "./_time";

const NOW = Date.parse("2026-11-12T18:00:00Z");
const DAY = 86_400_000;

function sub(over: Partial<RawSub>): RawSub {
  return {
    userId: "u1",
    planId: "practice",
    term: "month",
    status: "active",
    createdAt: "2026-09-01T15:00:00Z",
    canceledAt: null,
    ...over,
  };
}

function input(over: Partial<RevenueInput>): RevenueInput {
  return {
    subs: [],
    purchases: [],
    refunds: [],
    bookings: [],
    schools: [],
    freeStudents: 0,
    sponsoredStudents: 0,
    snapshots: [],
    ...over,
  };
}

describe("MRR from mixed billing intervals", () => {
  it("counts a 3-month plan at a third of its price a month", () => {
    const subs = [
      sub({ userId: "a", planId: "practice", term: "month" }),
      sub({ userId: "b", planId: "pro", term: "quarter" }),
      sub({ userId: "c", planId: "tutor-affiliate", term: "month" }),
    ];
    const expected = Math.round(
      PRACTICE_PLAN.monthly + PRO_PLAN.threeMonths / 3 + TUTOR_AFFILIATE_PLAN.monthly
    );
    expect(mrrAt(subs, NOW, NOW)).toBe(expected);
  });

  it("drops past-due subscriptions from today's MRR but keeps them in history", () => {
    const subs = [sub({ status: "past_due" })];
    expect(mrrAt(subs, NOW, NOW)).toBe(0);
    expect(mrrAt(subs, Date.parse("2026-10-01T00:00:00Z"), NOW)).toBe(PRACTICE_PLAN.monthly);
  });

  it("ignores subscriptions that were never paid", () => {
    expect(mrrAt([sub({ status: "incomplete" })], NOW, NOW)).toBe(0);
    expect(subscriptionCharges(sub({ status: "incomplete" }), NOW)).toEqual([]);
  });
});

describe("charges rebuilt from subscriptions", () => {
  it("charges a monthly plan at the start and every month until now", () => {
    const charges = subscriptionCharges(sub({ createdAt: "2026-09-01T15:00:00Z" }), NOW);
    expect(charges.map((c) => new Date(c.at).toISOString().slice(0, 10))).toEqual([
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
    ]);
    expect(charges.every((c) => c.amount === PRACTICE_PLAN.monthly)).toBe(true);
  });

  it("charges a 3-month plan once per quarter, and stops at the cancel date", () => {
    const quarterly = subscriptionCharges(
      sub({ planId: "pro", term: "quarter", createdAt: "2026-03-10T15:00:00Z" }),
      NOW
    );
    expect(quarterly).toHaveLength(3); // Mar, Jun, Sep
    expect(quarterly[0].amount).toBe(PRO_PLAN.threeMonths);
    const canceled = subscriptionCharges(
      sub({
        createdAt: "2026-06-05T15:00:00Z",
        status: "canceled",
        canceledAt: "2026-08-05T15:00:00Z",
      }),
      NOW
    );
    expect(canceled).toHaveLength(2); // Jun 5, Jul 5; Aug 5 is the cancel instant
  });

  it("leaves out the failed renewal of a past-due subscription", () => {
    expect(subscriptionCharges(sub({ status: "past_due" }), NOW)).toHaveLength(2);
  });
});

describe("cohort deposits vs paid in full vs instalments", () => {
  const seat = (
    payment: RawPurchase["payment"],
    createdAt = "2026-11-01T15:00:00Z"
  ): RawPurchase => ({
    userId: `seat-${payment}`,
    planId: "cohort",
    createdAt,
    expiresAt: null,
    payment,
  });

  it("charges the deposit now and the payments from the cohort's start", () => {
    const charges = purchaseCharges(seat("installments"), NOW);
    expect(charges).toEqual([
      expect.objectContaining({ amount: MARCH_PROGRAM.depositAmount, kind: "deposit" }),
    ]);
    const dates = installmentDates(Date.parse("2026-11-01T15:00:00Z"));
    expect(dates.map((d) => new Date(d).toISOString().slice(0, 10))).toEqual([
      MARCH_PROGRAM.startDate,
      "2027-02-04",
      "2027-03-04",
    ]);
    // Once all three are due, the seat has paid the full price.
    const later = purchaseCharges(seat("installments"), Date.parse("2027-04-01T00:00:00Z"));
    expect(later.reduce((s, c) => s + c.amount, 0)).toBe(MARCH_PROGRAM.price);
  });

  it("charges a full seat once, and marks a seat with no recorded option as booked", () => {
    expect(purchaseCharges(seat("full"), NOW)).toEqual([
      expect.objectContaining({ amount: MARCH_PROGRAM.price, kind: "one_time" }),
    ]);
    expect(purchaseCharges(seat(null), NOW)[0].kind).toBe("booked");
  });

  it("splits seats and counts what is collected and still to come", () => {
    const summary = cohortPayments(
      [seat("full"), seat("installments"), seat("installments"), seat(null)],
      NOW
    );
    expect(summary).toMatchObject({
      seats: 4,
      paidInFull: 1,
      onInstallments: 2,
      notRecorded: 1,
      notRecordedValue: MARCH_PROGRAM.price,
      installmentProgress: [2, 0, 0, 0],
      collected: MARCH_PROGRAM.price + 2 * MARCH_PROGRAM.depositAmount,
      scheduled: 2 * MARCH_PROGRAM.installments.count * MARCH_PROGRAM.installments.amount,
    });
    expect(summary.upcoming[0]).toMatchObject({
      count: 2,
      amount: 2 * MARCH_PROGRAM.installments.amount,
    });
  });
});

describe("month bucketing in America/Chicago", () => {
  it("puts 11 pm on Oct 31 in Austin in October, though it is November in UTC", () => {
    const late = Date.parse("2026-11-01T04:30:00Z"); // 11:30 pm CDT on Oct 31
    expect(monthKey(late)).toBe("2026-10");
    const buckets = buildBuckets("month", 12, NOW);
    expect(buckets[bucketIndex(buckets, late)].key).toBe("2026-10");
  });

  it("starts months at Austin midnight on both sides of the DST change", () => {
    expect(new Date(zonedMidnight(2026, 11, 1)).toISOString()).toBe("2026-11-01T05:00:00.000Z"); // CDT
    expect(new Date(zonedMidnight(2026, 12, 1)).toISOString()).toBe("2026-12-01T06:00:00.000Z"); // CST
  });

  it("builds 12 contiguous months ending with the current one", () => {
    const buckets = buildBuckets("month", 12, NOW);
    expect(buckets).toHaveLength(12);
    expect(buckets[0].key).toBe("2025-12");
    expect(buckets[11].key).toBe("2026-11");
    for (let i = 1; i < buckets.length; i++) expect(buckets[i].start).toBe(buckets[i - 1].end);
  });

  it("starts weeks on Monday", () => {
    const weeks = buildBuckets("week", 13, NOW);
    expect(weeks[12].key).toBe("2026-11-09");
    expect(weeks[12].label).toBe("Week of Nov 9");
  });

  it("clamps month addition to the end of a short month", () => {
    expect(new Date(addMonths(Date.parse("2026-01-31T12:00:00Z"), 1)).toISOString()).toBe(
      "2026-02-28T12:00:00.000Z"
    );
  });
});

describe("period view", () => {
  it("adds up charges less refunds, and churn over those live at the start", () => {
    const data = input({
      subs: [
        sub({ userId: "a", createdAt: "2026-09-01T15:00:00Z" }),
        sub({
          userId: "b",
          createdAt: "2026-09-01T15:00:00Z",
          status: "canceled",
          canceledAt: "2026-11-03T15:00:00Z",
        }),
      ],
      refunds: [{ amountCents: 1950, issuedAt: "2026-11-05T15:00:00Z", reason: null }],
    });
    const view = buildPeriod(data, "30d", NOW);
    // The window runs from Oct 14 (Austin) to now: both renewed on Nov 1, nothing else.
    expect(view.gross).toBe(2 * PRACTICE_PLAN.monthly);
    expect(view.kpis.net.value).toBe(2 * PRACTICE_PLAN.monthly - 20);
    expect(view.refunds.count).toBe(1);
    expect(view.kpis.mrr.value).toBe(PRACTICE_PLAN.monthly);
    expect(view.kpis.mrr.prior).toBe(2 * PRACTICE_PLAN.monthly);
    // Exposure: a lived the whole window, b until Nov 3; one cancellation over that.
    const from = zonedMidnight(2026, 10, 14);
    const months = (NOW - from + (Date.parse("2026-11-03T15:00:00Z") - from)) / (30 * DAY);
    expect(view.kpis.churn.value).toBeCloseTo(1 / months, 5);
    expect(view.buckets.reduce((s, b) => s + b.churned, 0)).toBe(1);
    expect(monthlyChurn(data.subs, NOW + DAY, NOW + 2 * DAY)).toBe(0);
    expect(monthlyChurn([], from, NOW)).toBeNull();
  });

  it("lists the plan ladder in the founder's order with prices from offer.ts", () => {
    const view = buildPeriod(input({ freeStudents: 7 }), "12m", NOW);
    expect(view.plans.map((p) => p.id)).toEqual([
      "free",
      "practice",
      "pro",
      "cohort",
      "private-10",
      "private-20",
      "tutor-affiliate",
      "schools",
    ]);
    expect(view.plans[0].customers).toBe(7);
    expect(view.plans[1].price).toContain(`$${PRACTICE_PLAN.monthly}`);
  });
});

describe("retention and sample data", () => {
  it("groups subscribers by their Austin sign-up month", () => {
    const rows = retention(
      [
        sub({ createdAt: "2026-07-01T03:00:00Z" }),
        sub({
          createdAt: "2026-07-15T12:00:00Z",
          status: "canceled",
          canceledAt: "2026-08-20T12:00:00Z",
        }),
      ],
      NOW
    );
    expect(rows.map((r) => r.month)).toEqual(["2026-07", "2026-06"]);
    expect(rows[0]).toEqual({ month: "2026-07", size: 1, counts: [1, 0, 0, null] });
  });

  it("makes the same sample for the same day, with enough rows to draw every chart", () => {
    const a = sampleInput(NOW);
    expect(sampleInput(NOW)).toEqual(a);
    expect(paidRowCount(a)).toBeGreaterThan(60);
    const all = ledger(a.subs, a.purchases, NOW);
    expect(all.every((c) => c.at <= NOW)).toBe(true);
  });
});
