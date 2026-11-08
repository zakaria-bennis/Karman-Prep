import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { centsToDollars, computePayoutSplit } from "./payout-split";
import {
  PayoutBlockedError,
  assertStripeTestMode,
  isStripeTestKey,
  runScholarshipRefund,
  type RefundClaim,
  type RefundProgress,
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
// A small in-memory Stripe for the refund.
// ------------------------------------------------------------

function fakeStripe(opts: { livemode?: boolean; owner?: string } = {}) {
  const refunds: Stripe.Refund[] = [];
  const calls = { refundCreates: 0, searches: 0 };
  const pi = {
    id: "pi_cohort1",
    livemode: opts.livemode ?? false,
    status: "succeeded",
    amount_received: 99500,
    currency: "usd",
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
  };
  return { stripe, calls };
}

const baseClaim: RefundClaim = {
  id: "11111111-1111-4111-8111-111111111111",
  cohortId: "22222222-2222-4222-8222-222222222222",
  userId: "33333333-3333-4333-8333-333333333333",
  clerkId: "user_abc",
  stripePaymentIntentId: null,
  stripeRefundId: null,
  refundAmountCents: null,
};

describe("runScholarshipRefund", () => {
  const saved: RefundProgress[] = [];
  const save = async (p: RefundProgress) => {
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

  it("refunds $995 and leaves a $505 bonus for the bank transfer", async () => {
    const { stripe, calls } = fakeStripe();
    const split = await runScholarshipRefund({
      stripe,
      claim: baseClaim,
      shareCents: 150000,
      cohortPriceCents: 99500,
      save,
    });
    expect(split).toEqual({ refundCents: 99500, bonusCents: 50500 });
    expect(calls).toMatchObject({ searches: 1, refundCreates: 1 });
    expect(Object.assign({}, ...saved)).toMatchObject({
      stripePaymentIntentId: "pi_cohort1",
      stripeRefundId: "re_1",
      refundAmountCents: 99500,
    });
  });

  it("refunds $750 and leaves no bonus for a two-way tie", async () => {
    const { stripe } = fakeStripe();
    const split = await runScholarshipRefund({
      stripe,
      claim: baseClaim,
      shareCents: 75000,
      cohortPriceCents: 99500,
      save,
    });
    expect(split).toEqual({ refundCents: 75000, bonusCents: 0 });
  });

  it("finds its own earlier refund instead of refunding twice", async () => {
    const { stripe, calls } = fakeStripe();
    const args = { stripe, claim: baseClaim, shareCents: 150000, cohortPriceCents: 99500, save };
    await runScholarshipRefund(args);
    const again = await runScholarshipRefund(args);
    expect(again).toEqual({ refundCents: 99500, bonusCents: 50500 });
    expect(calls.refundCreates).toBe(1);
  });

  it("refuses live payments, payments of another student, and live keys", async () => {
    const args = { claim: baseClaim, shareCents: 150000, cohortPriceCents: 99500, save };
    await expect(
      runScholarshipRefund({ ...args, stripe: fakeStripe({ livemode: true }).stripe })
    ).rejects.toThrow(PayoutBlockedError);
    await expect(
      runScholarshipRefund({ ...args, stripe: fakeStripe({ owner: "someone-else" }).stripe })
    ).rejects.toThrow("different student");
    process.env.STRIPE_SECRET_KEY = "sk_live_nope";
    await expect(runScholarshipRefund({ ...args, stripe: fakeStripe().stripe })).rejects.toThrow(
      "test mode only"
    );
  });
});
