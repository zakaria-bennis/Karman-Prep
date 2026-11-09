// ============================================================
// Scholarship refund through Stripe — TEST MODE ONLY.
//
// 1. Find the student's cohort payment (a PaymentIntent).
// 2. Refund it: what the family paid, up to the claim's share.
// 3. Whatever is left of the share is the merit bonus. It is paid
//    by bank transfer, sent by hand, and an admin records the date
//    and reference (founder, 8 Nov). Nothing here moves that money.
//
// The refund is safe to retry: it first looks for its own earlier
// refund in Stripe (tagged with the claim id), and a Stripe
// idempotency key stops a double refund. Live keys are refused.
// ============================================================

import type Stripe from "stripe";
import { computePayoutSplit, type Split } from "./payout-split";

export class PayoutBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayoutBlockedError";
  }
}

export function isStripeTestKey(key: string | undefined): boolean {
  return typeof key === "string" && /^(sk|rk)_test_/.test(key);
}

export function assertStripeTestMode(
  key: string | undefined = process.env.STRIPE_SECRET_KEY
): void {
  if (!isStripeTestKey(key)) {
    throw new PayoutBlockedError(
      "Scholarship refunds run in Stripe test mode only. Live payouts stay off until the founder turns them on."
    );
  }
}

/** The slice of the Stripe SDK the refund uses (a fake in tests). */
export interface StripeLike {
  paymentIntents: {
    retrieve(
      id: string,
      params?: Stripe.PaymentIntentRetrieveParams
    ): Promise<Stripe.PaymentIntent>;
    search(params: Stripe.PaymentIntentSearchParams): Promise<{ data: Stripe.PaymentIntent[] }>;
  };
  refunds: {
    list(params: Stripe.RefundListParams): Promise<{ data: Stripe.Refund[] }>;
    create(params: Stripe.RefundCreateParams, opts?: Stripe.RequestOptions): Promise<Stripe.Refund>;
  };
}

export interface RefundClaim {
  id: string;
  cohortId: string;
  userId: string;
  clerkId: string;
  stripePaymentIntentId: string | null;
  stripeRefundId: string | null;
  refundAmountCents: number | null;
}

export interface RefundProgress {
  stripePaymentIntentId?: string;
  stripeLivemode?: boolean;
  stripeRefundId?: string;
  refundAmountCents?: number;
  refundedAt?: string;
}

export interface RefundArgs {
  stripe: StripeLike;
  claim: RefundClaim;
  /** The claim's share of the award ($1,500, or a tie's equal part). */
  shareCents: number;
  cohortPriceCents: number;
  /** A pi_… id the admin pasted, when the payment can't be found automatically. */
  paymentIntentOverride?: string | null;
  /** Persist progress after each step, so a retry resumes where it stopped. */
  save: (progress: RefundProgress) => Promise<void>;
  now?: () => Date;
}

const UUID = /^[0-9a-f-]{36}$/i;
const CLERK = /^user_[A-Za-z0-9]+$/;

async function findCohortPayment(stripe: StripeLike, claim: RefundClaim): Promise<string | null> {
  if (!UUID.test(claim.cohortId) || !UUID.test(claim.userId)) return null;
  const queries = [
    `status:'succeeded' AND metadata['cohort_id']:'${claim.cohortId}' AND metadata['user_id']:'${claim.userId}'`,
  ];
  if (CLERK.test(claim.clerkId)) {
    queries.push(
      `status:'succeeded' AND metadata['cohort_id']:'${claim.cohortId}' AND metadata['userId']:'${claim.clerkId}'`
    );
  }
  for (const query of queries) {
    const found = await stripe.paymentIntents.search({ query, limit: 5 });
    if (found.data.length > 0) return found.data[0].id;
  }
  return null;
}

/** Refunds the cohort payment and returns the split: the refund, and the bonus still due. */
export async function runScholarshipRefund(args: RefundArgs): Promise<Split> {
  const { stripe, claim, save } = args;
  const now = args.now ?? (() => new Date());
  assertStripeTestMode();

  const piId =
    args.paymentIntentOverride ??
    claim.stripePaymentIntentId ??
    (await findCohortPayment(stripe, claim));
  if (!piId) {
    throw new PayoutBlockedError(
      "No cohort payment was found in Stripe for this student. Paste the payment id (it starts with pi_) and try again."
    );
  }
  const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
  if (pi.livemode) {
    throw new PayoutBlockedError(
      "That is a live payment. Scholarship refunds run in test mode only."
    );
  }
  if (pi.status !== "succeeded") {
    throw new PayoutBlockedError("That payment didn't go through, so there is nothing to refund.");
  }
  const owner = pi.metadata?.user_id ?? null;
  if (owner && owner !== claim.userId) {
    throw new PayoutBlockedError("That payment belongs to a different student.");
  }
  const charge =
    pi.latest_charge && typeof pi.latest_charge !== "string"
      ? (pi.latest_charge as Stripe.Charge)
      : null;
  const refundedTotal = charge?.amount_refunded ?? 0;
  await save({ stripePaymentIntentId: pi.id, stripeLivemode: false });

  let refundId = claim.stripeRefundId;
  let ourRefund = claim.refundAmountCents ?? 0;
  if (!refundId) {
    const earlier = (await stripe.refunds.list({ payment_intent: pi.id, limit: 100 })).data.find(
      (r) =>
        r.metadata?.scholarship_claim_id === claim.id &&
        r.status !== "failed" &&
        r.status !== "canceled"
    );
    if (earlier) {
      refundId = earlier.id;
      ourRefund = earlier.amount;
      await save({
        stripeRefundId: earlier.id,
        refundAmountCents: earlier.amount,
        refundedAt: now().toISOString(),
      });
    }
  }
  if (refundId) {
    return { refundCents: ourRefund, bonusCents: Math.max(0, args.shareCents - ourRefund) };
  }

  const split = computePayoutSplit({
    awardCents: args.shareCents,
    cohortPriceCents: args.cohortPriceCents,
    paidCents: pi.amount_received,
    refundedElsewhereCents: Math.max(0, refundedTotal - ourRefund),
  });
  if (split.refundCents > 0) {
    const refund = await stripe.refunds.create(
      {
        payment_intent: pi.id,
        amount: split.refundCents,
        reason: "requested_by_customer",
        metadata: { kind: "cohort_scholarship", scholarship_claim_id: claim.id },
      },
      { idempotencyKey: `scholarship-refund-${claim.id}-${split.refundCents}` }
    );
    await save({
      stripeRefundId: refund.id,
      refundAmountCents: refund.amount,
      refundedAt: now().toISOString(),
    });
  }
  return split;
}
