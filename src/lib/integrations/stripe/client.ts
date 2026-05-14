// ============================================================
// Stripe utilities — server-side only
// ============================================================

import Stripe from "stripe";

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
 * Maps a subscription tier ID to its Stripe Price ID from env.
 * Throws if the env var is missing (catches misconfiguration early).
 */
export function getPriceId(tier: string): string {
  const map: Record<string, string> = {
    group: process.env.STRIPE_PRICE_GROUP_MONTHLY!,
    small_group: process.env.STRIPE_PRICE_SMALL_GROUP!,
    private: process.env.STRIPE_PRICE_PRIVATE!,
    elite: process.env.STRIPE_PRICE_ELITE_MONTHLY!,
    annual: process.env.STRIPE_PRICE_ANNUAL!,
  };
  const priceId = map[tier];
  if (!priceId) throw new Error(`No Stripe price configured for tier: ${tier}`);
  return priceId;
}

/**
 * Creates a Stripe Checkout Session for the given tier.
 * Includes a 7-day trial on monthly plans.
 */
export async function createCheckoutSession({
  customerId,
  tier,
  userId,
  email,
  successUrl,
  cancelUrl,
}: {
  customerId?: string;
  tier: string;
  userId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const isMonthly = ["group", "elite", "annual"].includes(tier);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerId,
    customer_email: customerId ? undefined : email,
    line_items: [{ price: getPriceId(tier), quantity: 1 }],
    // 7-day free trial for monthly subscriptions
    subscription_data: isMonthly
      ? {
          trial_period_days: 7,
          metadata: { userId, tier },
        }
      : { metadata: { userId, tier } },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, tier },
    allow_promotion_codes: true,
  });

  return session;
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
