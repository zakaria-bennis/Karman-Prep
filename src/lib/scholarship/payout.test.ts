import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { centsToDollars, computePayoutSplit } from "./payout-split";
import {
  PayoutBlockedError,
  assertStripeTestMode,
  isStripeTestKey,
  runScholarshipPayout,
  type PayoutClaim,
  type PayoutProgress,
  type StripeLike,
} from "./payout";

describe("computePayoutSplit", () => {
  it("refunds $995 and pays a $505 bonus when the cohort was paid in full", () => {
    expect(
      computePayoutSplit({
        awardCents: 150000,
        cohortPriceCents: 99500,
        paidCents: 99500,
        refundedElsewhereCents: 0,
      })
    ).toEqual({ refundCents: 99500, bonusCents: 50500 });
  });

  it("never refunds more than is left and makes up the rest with the bonus", () => {
    expect(
      computePayoutSplit({
        awardCents: 150000,
        cohortPriceCents: 99500,
        paidCents: 99500,
        refundedElsewhereCents: 20000,
      })
    ).toEqual({ refundCents: 79500, bonusCents: 70500 });
    expect(
      computePayoutSplit({
        awardCents: 150000,
        cohortPriceCents: 99500,
        paidCents: 0,
        refundedElsewhereCents: 0,
      })
    ).toEqual({ refundCents: 0, bonusCents: 150000 });
  });

  it("rejects fractional or negative amounts", () => {
    expect(() =>
      computePayoutSplit({
        awardCents: 1.5,
        cohortPriceCents: 1,
        paidCents: 1,
        refundedElsewhereCents: 0,
      })
    ).toThrow();
    expect(() =>
      computePayoutSplit({
        awardCents: 1,
        cohortPriceCents: -1,
        paidCents: 1,
        refundedElsewhereCents: 0,
      })
    ).toThrow();
  });

  it("formats cents as dollars", () => {
    expect(centsToDollars(50500)).toBe("$505");
    expect(centsToDollars(150050)).toBe("$1,500.50");
  });
});

describe("test-mode guard", () => {
  it("accepts only test keys", () => {
    expect(isStripeTestKey("sk_test_abc")).toBe(true);
    expect(isStripeTestKey("rk_test_abc")).toBe(true);
    expect(isStripeTestKey("sk_live_abc")).toBe(false);
    expect(isStripeTestKey(undefined)).toBe(false);
    expect(() => assertStripeTestMode("sk_live_abc")).toThrow(PayoutBlockedError);
  });
});

// ------------------------------------------------------------
// A small in-memory Stripe for the payout flow.
// ------------------------------------------------------------

function fakeStripe(opts: { livemode?: boolean; failBonusOnce?: boolean; owner?: string } = {}) {
  const refunds: Stripe.Refund[] = [];
  const txns: Stripe.CustomerBalanceTransaction[] = [];
  const calls = { refundCreates: 0, bonusCreates: 0, searches: 0 };
  let bonusFailures = opts.failBonusOnce ? 1 : 0;
  const pi = {
    id: "pi_cohort1",
    livemode: opts.livemode ?? false,
    status: "succeeded",
    amount_received: 99500,
    currency: "usd",
    customer: "cus_family1",
    metadata: opts.owner ? { user_id: opts.owner } : {},
  };
  const stripe: StripeLike = {
    paymentIntents: {
      async retrieve() {
        const refunded = refunds.reduce((s, r) => s + r.amount, 0);
        return {
          ...pi,
          latest_charge: { amount_refunded: refunded },
        } as unknown as Stripe.PaymentIntent;
      },
      async search() {
        calls.searches += 1;
        return { data: [pi as unknown as Stripe.PaymentIntent] };
      },
    },
    refunds: {
      async list() {
        return { data: refunds };
      },
      async create(params) {
        calls.refundCreates += 1;
        const r = {
          id: `re_${refunds.length + 1}`,
          amount: params.amount,
          status: "succeeded",
          metadata: params.metadata,
        };
        refunds.push(r as unknown as Stripe.Refund);
        return r as unknown as Stripe.Refund;
      },
    },
    customers: {
      async create() {
        return { id: "cus_new" } as Stripe.Customer;
      },
      async listBalanceTransactions() {
        return { data: txns };
      },
      async createBalanceTransaction(_id, params) {
        if (bonusFailures > 0) {
          bonusFailures -= 1;
          throw new Error("card_declined");
        }
        calls.bonusCreates += 1;
        const t = {
          id: `cbtxn_${txns.length + 1}`,
          amount: params.amount,
          metadata: params.metadata,
        };
        txns.push(t as unknown as Stripe.CustomerBalanceTransaction);
        return t as unknown as Stripe.CustomerBalanceTransaction;
      },
    },
  };
  return { stripe, calls };
}

const baseClaim: PayoutClaim = {
  id: "11111111-1111-4111-8111-111111111111",
  cohortId: "22222222-2222-4222-8222-222222222222",
  userId: "33333333-3333-4333-8333-333333333333",
  clerkId: "user_abc",
  studentEmail: "maya@example.com",
  studentName: "Maya Thompson",
  stripePaymentIntentId: null,
  stripeCustomerId: null,
  stripeRefundId: null,
  refundAmountCents: null,
  stripeBonusId: null,
  bonusAmountCents: null,
};

describe("runScholarshipPayout", () => {
  const saved: PayoutProgress[] = [];
  const save = async (p: PayoutProgress) => {
    saved.push(p);
  };
  let previousKey: string | undefined;

  beforeEach(() => {
    saved.length = 0;
    previousKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
  });
  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = previousKey;
  });

  it("finds the payment, refunds $995 and credits $505", async () => {
    const { stripe, calls } = fakeStripe();
    const split = await runScholarshipPayout({
      stripe,
      claim: baseClaim,
      awardCents: 150000,
      cohortPriceCents: 99500,
      save,
    });
    expect(split).toEqual({ refundCents: 99500, bonusCents: 50500 });
    expect(calls).toMatchObject({ searches: 1, refundCreates: 1, bonusCreates: 1 });
    const merged = Object.assign({}, ...saved) as PayoutProgress;
    expect(merged).toMatchObject({
      stripePaymentIntentId: "pi_cohort1",
      stripeRefundId: "re_1",
      refundAmountCents: 99500,
      bonusMethod: "customer_balance",
      stripeBonusId: "cbtxn_1",
      bonusAmountCents: 50500,
      stripeCustomerId: "cus_family1",
    });
  });

  it("resumes after a failed bonus without refunding twice", async () => {
    const { stripe, calls } = fakeStripe({ failBonusOnce: true });
    await expect(
      runScholarshipPayout({
        stripe,
        claim: baseClaim,
        awardCents: 150000,
        cohortPriceCents: 99500,
        save,
      })
    ).rejects.toThrow("card_declined");
    const progress = Object.assign({}, ...saved) as PayoutProgress;
    const retried = await runScholarshipPayout({
      stripe,
      claim: {
        ...baseClaim,
        stripePaymentIntentId: progress.stripePaymentIntentId ?? null,
        stripeRefundId: progress.stripeRefundId ?? null,
        refundAmountCents: progress.refundAmountCents ?? null,
      },
      awardCents: 150000,
      cohortPriceCents: 99500,
      save,
    });
    expect(retried).toEqual({ refundCents: 99500, bonusCents: 50500 });
    expect(calls.refundCreates).toBe(1);
    expect(calls.bonusCreates).toBe(1);
  });

  it("finds its own earlier refund in Stripe when the database missed it", async () => {
    const { stripe, calls } = fakeStripe();
    await runScholarshipPayout({
      stripe,
      claim: baseClaim,
      awardCents: 150000,
      cohortPriceCents: 99500,
      save,
    });
    await runScholarshipPayout({
      stripe,
      claim: baseClaim,
      awardCents: 150000,
      cohortPriceCents: 99500,
      save,
    });
    expect(calls.refundCreates).toBe(1);
    expect(calls.bonusCreates).toBe(1);
  });

  it("refuses live payments, payments of another student, and live keys", async () => {
    await expect(
      runScholarshipPayout({
        stripe: fakeStripe({ livemode: true }).stripe,
        claim: baseClaim,
        awardCents: 150000,
        cohortPriceCents: 99500,
        save,
      })
    ).rejects.toThrow(PayoutBlockedError);
    await expect(
      runScholarshipPayout({
        stripe: fakeStripe({ owner: "someone-else" }).stripe,
        claim: baseClaim,
        awardCents: 150000,
        cohortPriceCents: 99500,
        save,
      })
    ).rejects.toThrow("different student");
    process.env.STRIPE_SECRET_KEY = "sk_live_nope";
    await expect(
      runScholarshipPayout({
        stripe: fakeStripe().stripe,
        claim: baseClaim,
        awardCents: 150000,
        cohortPriceCents: 99500,
        save,
      })
    ).rejects.toThrow("test mode only");
  });
});
