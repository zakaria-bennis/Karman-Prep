// ============================================================
// Stripe utilities — server-side only
// ============================================================

import Stripe from "stripe";
import { priceLabel, type StripePriceSpec } from "./prices";

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
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  spec: StripePriceSpec;
  userId: string;
  /** The cohort a Cohort seat is for, when the family picked one. */
  cohortId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const price = await getCheckoutPrice(spec);
  const cohort: Record<string, string> =
    spec.planId === "cohort" && cohortId ? { cohort_id: cohortId } : {};
  const metadata = { userId, planId: spec.planId, term: spec.term, ...cohort };
  const shared: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ["card"],
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
    mode: "payment",
    // The admin scholarship payout refunds the cohort price by cohort_id.
    payment_intent_data: { metadata: { userId, planId: spec.planId, ...cohort } },
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
