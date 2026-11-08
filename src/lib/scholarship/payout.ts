// ============================================================
// Scholarship payout through Stripe — TEST MODE ONLY.
//
// 1. Find the student's cohort payment (a PaymentIntent).
// 2. Refund it: what the family paid, up to the cohort price.
// 3. Pay the merit bonus for the rest of the award as a credit
//    on the family's Stripe customer balance.
//
// Why a credit, not a transfer: a Stripe transfer needs a
// connected (Connect) account for the family, and families
// don't have one. A customer-balance credit works on every
// Stripe account. It lowers the family's future Karman invoices;
// it is not cash. How the bonus reaches families in live mode is
// a founder decision (see docs/overnight/reports/admin-scholarship.md).
//
// Every step is safe to retry: each one first looks for its own
// earlier result in Stripe (tagged with the claim id) and Stripe
// idempotency keys stop double refunds or double credits.
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
      "Scholarship payouts run in Stripe test mode only. Live payouts stay off until the founder turns them on."
    );
  }
}

/** The slice of the Stripe SDK the payout uses (a fake in tests). */
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
  customers: {
    create(
      params: Stripe.CustomerCreateParams,
      opts?: Stripe.RequestOptions
    ): Promise<Stripe.Customer>;
    listBalanceTransactions(
      id: string,
      params?: Stripe.CustomerListBalanceTransactionsParams
    ): Promise<{ data: Stripe.CustomerBalanceTransaction[] }>;
    createBalanceTransaction(
      id: string,
      params: Stripe.CustomerCreateBalanceTransactionParams,
      opts?: Stripe.RequestOptions
    ): Promise<Stripe.CustomerBalanceTransaction>;
  };
}

export interface PayoutClaim {
  id: string;
  cohortId: string;
  userId: string;
  clerkId: string;
  studentEmail: string | null;
  studentName: string | null;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  stripeRefundId: string | null;
  refundAmountCents: number | null;
  stripeBonusId: string | null;
  bonusAmountCents: number | null;
}

export interface PayoutProgress {
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  stripeLivemode?: boolean;
  stripeRefundId?: string;
  refundAmountCents?: number;
  refundedAt?: string;
  bonusMethod?: "customer_balance";
  stripeBonusId?: string;
  bonusAmountCents?: number;
  bonusPaidAt?: string;
}

export interface PayoutArgs {
  stripe: StripeLike;
  claim: PayoutClaim;
  awardCents: number;
  cohortPriceCents: number;
  /** A pi_… id the admin pasted, when the payment can't be found automatically. */
  paymentIntentOverride?: string | null;
  /** Persist progress after each step, so a retry resumes where it stopped. */
  save: (progress: PayoutProgress) => Promise<void>;
  now?: () => Date;
}

const UUID = /^[0-9a-f-]{36}$/i;
const CLERK = /^user_[A-Za-z0-9]+$/;

async function findCohortPayment(stripe: StripeLike, claim: PayoutClaim): Promise<string | null> {
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

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function runScholarshipPayout(args: PayoutArgs): Promise<Split> {
  const { stripe, claim, save } = args;
  const now = args.now ?? (() => new Date());
  assertStripeTestMode();

  // 1. The cohort payment.
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
      "That is a live payment. Scholarship payouts run in test mode only."
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

  // 2. The refund (look for our own earlier refund first).
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
  const split = refundId
    ? { refundCents: ourRefund, bonusCents: Math.max(0, args.awardCents - ourRefund) }
    : computePayoutSplit({
        awardCents: args.awardCents,
        cohortPriceCents: args.cohortPriceCents,
        paidCents: pi.amount_received,
        refundedElsewhereCents: Math.max(0, refundedTotal - ourRefund),
      });

  if (!refundId && split.refundCents > 0) {
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

  // 3. The merit bonus, as a customer-balance credit.
  if (split.bonusCents > 0 && !claim.stripeBonusId) {
    let customerId = idOf(pi.customer) ?? claim.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: claim.studentEmail ?? undefined,
          name: claim.studentName ?? undefined,
          metadata: { user_id: claim.userId },
        },
        { idempotencyKey: `scholarship-customer-${claim.id}` }
      );
      customerId = customer.id;
    }
    await save({ stripeCustomerId: customerId });

    const earlier = (
      await stripe.customers.listBalanceTransactions(customerId, { limit: 100 })
    ).data.find((t) => t.metadata?.scholarship_claim_id === claim.id);
    const txn =
      earlier ??
      (await stripe.customers.createBalanceTransaction(
        customerId,
        {
          amount: -split.bonusCents,
          currency: pi.currency,
          description: "Karman cohort scholarship: merit bonus",
          metadata: { kind: "cohort_scholarship_bonus", scholarship_claim_id: claim.id },
        },
        { idempotencyKey: `scholarship-bonus-${claim.id}-${split.bonusCents}` }
      ));
    await save({
      bonusMethod: "customer_balance",
      stripeBonusId: txn.id,
      bonusAmountCents: Math.abs(txn.amount),
      bonusPaidAt: now().toISOString(),
    });
  }
  return split;
}
