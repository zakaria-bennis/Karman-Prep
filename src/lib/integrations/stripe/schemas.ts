// ============================================================
// Zod schemas for Stripe boundaries.
//
// Where these add value (and where they don't):
//
//   · Webhook BODY → we don't validate. Stripe's signature
//     verification + the SDK's typed Event discriminated union
//     already do that job. Adding Zod on top would be duplicate
//     work for less coverage than what Stripe gives us.
//
//   · Webhook METADATA fields → we DO validate. Stripe types
//     metadata as `Record<string, string>` because customers set
//     it freely, so the SDK can't narrow it. Anything we set in
//     Checkout flows back through metadata on Subscription /
//     Charge events. A typo'd tier or a subscription created
//     outside our flow (no metadata at all) would otherwise be
//     happily inserted into our `subscriptions` table.
//
//   · Checkout REQUEST body → we DO validate. The client posts
//     `{ tier }` and we forward it to Stripe price-ID lookup.
//     Without validation, a malformed `tier` flows downstream
//     and surfaces as a confusing Stripe error.
// ============================================================

import { z } from "zod";

/** The four locked plan tiers. Mirrors `SubscriptionTier` in @/types,
 *  but kept here so this schema is self-contained at the Stripe
 *  boundary. If a new tier is added to the type union, update here. */
export const subscriptionTierSchema = z.enum(["group", "small_group", "private", "elite"]);

export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;

/** Metadata we set on Stripe Subscription objects via Checkout.
 *  `userId` is the Clerk user id. `tier` is the locked plan id.
 *  Both can be missing on subscriptions created outside our flow
 *  (manual Stripe dashboard creation, legacy data) — `safeParse`
 *  callers should handle that gracefully. */
export const subscriptionMetadataSchema = z.object({
  userId: z.string().min(1, "userId required"),
  tier: subscriptionTierSchema,
});

/** Metadata we set on Stripe Charge objects via Checkout. We only
 *  read `userId` from charge metadata (in `charge.refunded`). */
export const chargeMetadataSchema = z.object({
  userId: z.string().min(1, "userId required"),
});

/** Body shape for POST /api/stripe/checkout. */
export const createCheckoutBodySchema = z.object({
  tier: subscriptionTierSchema,
});
