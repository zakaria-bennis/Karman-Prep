// One Stripe subscription as its row in `subscriptions`. Used by the webhook, and by the plan payment
// page, which records a plan the moment it is paid without waiting for Stripe's message.
import type Stripe from "stripe";
import { subscriptionMetadataSchema } from "./schemas";

/**
 * The `subscriptions` row for a Stripe subscription, or null when it was not
 * made by our Checkout (no userId) or bills a price we do not sell. The plan
 * and term come from the price first, because a plan switch in the Stripe
 * portal changes the price but not the subscription's own metadata.
 */
export function subscriptionRow(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0];
  const priceMeta = item?.price?.metadata ?? {};
  const meta = subscriptionMetadataSchema.safeParse({
    userId: sub.metadata?.userId,
    planId: priceMeta.plan_id ?? sub.metadata?.planId,
    term: priceMeta.term ?? sub.metadata?.term,
  });
  if (!meta.success) {
    console.warn(`[stripe] skipped subscription ${sub.id}: bad metadata`, meta.error.issues);
    return null;
  }
  return {
    userId: meta.data.userId,
    row: {
      user_id: meta.data.userId,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      plan_id: meta.data.planId,
      billing_term: meta.data.term,
      status: sub.status,
      current_period_end: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      // Stamped when the status flips to canceled, so the Revenue
      // dashboard can compute real monthly churn.
      canceled_at: sub.status === "canceled" ? new Date().toISOString() : null,
    },
  };
}
