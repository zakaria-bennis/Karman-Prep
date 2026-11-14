// ============================================================
// Stripe utilities — server-side only
// ============================================================

import Stripe from "stripe";
import { type CohortPayment } from "./cohort-installments";
import {
  cohortInstallmentSpecs,
  findStripePrice,
  priceLabel,
  type StripePriceSpec,
} from "./prices";

/**
 * Card plus Stripe Link on every checkout. Founder, 2026-11-12: push Link, because a returning
 * Link customer has everything saved and finishes in a tap. Checkout puts the Link button above
 * the card form on its own; listing "link" next to "card" is what Stripe's docs require when
 * payment_method_types is given. Link must also be on in the Dashboard's payment method settings.
 */
export const CARD_METHODS = ["card", "link"] as const;

/**
 * Card, Link and buy now, pay later on one-payment checkouts (Cohort, Private 10, Private 20).
 * Founder, 2026-11-08. Checked on the Stripe test account on 8 Nov: Klarna, Affirm and
 * Afterpay all open on $995, $1,495 and $2,495. Each must also be on in live mode at launch.
 */
export const ONE_PAYMENT_METHODS = [
  ...CARD_METHODS,
  "klarna",
  "affirm",
  "afterpay_clearpay",
] as const;

/** Server-side Stripe client. Never import in browser code.
 *
 *  Configured with the fetch-based HTTP client so it works in both
 *  Node (local dev) and Cloudflare Workers (prod via OpenNext). The
 *  default uses Node's http module which breaks on the edge runtime
 *  — fetch is portable everywhere. Webhook signature verification
 *  must use stripe.webhooks.constructEventAsync (Web Crypto under
 *  the hood) — see /api/stripe/webhook/route.ts. */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
  httpClient: Stripe.createFetchHttpClient(),
});

/**
 * The active Stripe price for a plan, found by its lookup key. Throws when
 * the price is missing (the setup script has not run against this Stripe
 * account) or when its amount or interval differs from offer.ts, so a
 * family is never charged a price the site does not show.
 */
export async function getCheckoutPrice(spec: StripePriceSpec): Promise<Stripe.Price> {
  const { data } = await stripe.prices.list({
    lookup_keys: [spec.lookupKey],
    active: true,
    limit: 1,
  });
  const price = data[0];
  if (!price) {
    throw new Error(
      `No active Stripe price has lookup key ${spec.lookupKey}. Run scripts/stripe/setup-test-products.mjs.`
    );
  }
  const months = price.recurring ? price.recurring.interval_count : null;
  const sameInterval =
    spec.intervalMonths === null
      ? price.type === "one_time"
      : price.recurring?.interval === "month" && months === spec.intervalMonths;
  if (price.unit_amount !== spec.amount * 100 || price.currency !== "usd" || !sameInterval) {
    throw new Error(
      `Stripe price ${price.id} (${spec.lookupKey}) does not match offer.ts (${priceLabel(spec)}). Run scripts/stripe/setup-test-products.mjs.`
    );
  }
  return price;
}

/**
 * Creates a Stripe Checkout Session for one plan. Renewing plans use
 * `mode: "subscription"`, one-payment plans `mode: "payment"`. The same
 * metadata goes on the session and on the subscription or payment, so
 * the webhook can tell who bought what.
 */
export async function createCheckoutSession({
  customerId,
  spec,
  userId,
  cohortId,
  payment,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  spec: StripePriceSpec;
  userId: string;
  /** The cohort a Cohort seat is for, when the family picked one. */
  cohortId?: string;
  /** Cohort only: "installments" for the $95 deposit and three monthly payments. */
  payment?: CohortPayment;
  successUrl: string;
  cancelUrl: string;
}) {
  const cohort: Record<string, string> =
    spec.planId === "cohort" && cohortId ? { cohort_id: cohortId } : {};

  // The cohort's instalment plan: the $95 deposit now, with the card saved for the three
  // monthly $300 payments that the webhook schedules from the cohort's start.
  if (spec.planId === "cohort" && payment === "installments") {
    const deposit = await getCheckoutPrice(cohortInstallmentSpecs().deposit);
    const metadata = { userId, planId: spec.planId, term: "installments", ...cohort };
    return stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: [...CARD_METHODS],
      line_items: [{ price: deposit.id, quantity: 1 }],
      payment_intent_data: { setup_future_usage: "off_session", metadata },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });
  }

  const price = await getCheckoutPrice(spec);
  const metadata = { userId, planId: spec.planId, term: spec.term, ...cohort };
  const shared: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: [...CARD_METHODS],
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    allow_promotion_codes: true,
  };

  if (spec.intervalMonths) {
    return stripe.checkout.sessions.create({
      ...shared,
      mode: "subscription",
      subscription_data: { metadata: { userId, planId: spec.planId, term: spec.term } },
    });
  }
  return stripe.checkout.sessions.create({
    ...shared,
    payment_method_types: [...ONE_PAYMENT_METHODS],
    mode: "payment",
    // The admin scholarship payout refunds the cohort price by cohort_id.
    payment_intent_data: { metadata: { userId, planId: spec.planId, ...cohort } },
  });
}

/**
 * Checkout for a cohort seat reserved from the marketing site, before the student has an account
 * (src/lib/reserve). The same prices and payment methods as a signed-in cohort checkout; the metadata
 * carries the reservation instead of a user, and the webhook settles it by that id.
 */
export async function createReservationCheckoutSession({
  customerId,
  reservationId,
  programId,
  payment,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  reservationId: string;
  programId: string;
  payment: CohortPayment;
  successUrl: string;
  cancelUrl: string;
}) {
  const metadata = { reservationId, planId: "cohort", term: payment, programId };
  const shared = { customer: customerId, success_url: successUrl, cancel_url: cancelUrl, metadata };
  if (payment === "installments") {
    const deposit = await getCheckoutPrice(cohortInstallmentSpecs().deposit);
    return stripe.checkout.sessions.create({
      ...shared,
      mode: "payment",
      payment_method_types: [...CARD_METHODS],
      line_items: [{ price: deposit.id, quantity: 1 }],
      payment_intent_data: { setup_future_usage: "off_session", metadata },
    });
  }
  const spec = findStripePrice("cohort");
  if (!spec) throw new Error("The cohort has no Stripe price in prices.ts");
  const price = await getCheckoutPrice(spec);
  return stripe.checkout.sessions.create({
    ...shared,
    mode: "payment",
    payment_method_types: [...ONE_PAYMENT_METHODS],
    line_items: [{ price: price.id, quantity: 1 }],
    payment_intent_data: { metadata },
  });
}

/**
 * Creates or retrieves a Stripe customer for the given Clerk user.
 */
export async function getOrCreateCustomer(userId: string, email: string) {
  // Search for an existing customer by metadata
  const existing = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });

  if (existing.data.length > 0) return existing.data[0];

  return stripe.customers.create({
    email,
    metadata: { userId },
  });
}
