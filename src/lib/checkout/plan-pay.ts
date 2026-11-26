// A renewing plan (Practice, Pro) paid on our own page, /checkout/pay (founder, 2026-11-26: the same
// payment screen as a cohort seat, not Stripe's page). startCheckout opens the checkout and sends the
// buyer to that page with its id; this file is what the page asks: what is to be paid, and whether it
// has been. The plan is recorded the moment Stripe says it is paid, without waiting for Stripe's own
// message, which writes the same row when it arrives. Server only.
import type Stripe from "stripe";
import { createPlanPaySession, stripe } from "@/lib/integrations/stripe/client";
import { findStripePrice, type StripePriceSpec } from "@/lib/integrations/stripe/prices";
import { subscriptionMetadataSchema } from "@/lib/integrations/stripe/schemas";
import { subscriptionRow } from "@/lib/integrations/stripe/subscription-row";
import { createAdminClient } from "@/lib/supabase/server";

const SESSION_ID = /^cs_[A-Za-z0-9_]{10,200}$/;
/** A subscription in one of these states holds its plan. */
const HELD = new Set(["active", "trialing"]);

/** Where the payment page lives, for one checkout. Stripe fills the id in when it sends a buyer back. */
export const planPayPath = (sessionId: string) => `/checkout/pay?s=${sessionId}`;
export const planPayReturnUrl = (appUrl: string) =>
  `${appUrl}/checkout/pay?s={CHECKOUT_SESSION_ID}`;

export type PlanPayment =
  | { state: "open"; clientSecret: string; cardSecret: string; spec: StripePriceSpec }
  | { state: "paid"; spec: StripePriceSpec }
  /** The checkout ran out before it was paid (Stripe keeps one for a day): a new one is opened. */
  | { state: "gone"; spec: StripePriceSpec };

/** This account's own plan checkout, or null: a made-up id, somebody else's, or not a student plan. */
async function mine(userId: string, sessionId: string) {
  if (!SESSION_ID.test(sessionId)) return null;
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  const meta = subscriptionMetadataSchema.safeParse(session.metadata ?? {});
  if (!meta.success || meta.data.userId !== userId || session.mode !== "subscription") return null;
  if (meta.data.planId === "tutor-affiliate") return null;
  const spec = findStripePrice(meta.data.planId, meta.data.term);
  return spec ? { session, spec } : null;
}

/** Writes the plan to the account from a finished checkout. The webhook writes the same row. */
async function record(session: Stripe.Checkout.Session): Promise<boolean> {
  const sub = session.subscription;
  const parsed = sub && typeof sub !== "string" ? subscriptionRow(sub) : null;
  if (!parsed) return false;
  const { error } = await createAdminClient()
    .from("subscriptions")
    .upsert(parsed.row, { onConflict: "stripe_subscription_id" });
  if (error) console.error("[plan-pay] could not record the plan", error.message);
  return !error;
}

/** The moment a payment is made on the page: asks Stripe whether this checkout is finished, and if so
 *  the account holds the plan from now. */
export async function confirmPlanPaid(userId: string, sessionId: string): Promise<boolean> {
  try {
    const found = await mine(userId, sessionId);
    if (!found || found.session.status !== "complete") return false;
    return await record(found.session);
  } catch (e) {
    console.error("[plan-pay] could not confirm the payment with Stripe", e);
    return false;
  }
}

/** What the payment page shows for this checkout. Null when it is not this account's to pay. */
export async function planPayment(
  userId: string,
  sessionId: string,
  appUrl: string
): Promise<PlanPayment | null> {
  try {
    const found = await mine(userId, sessionId);
    if (!found) return null;
    const { session, spec } = found;
    if (session.status === "complete") {
      await record(session);
      return { state: "paid", spec };
    }
    // paid with the page's other checkout (the typed card has one of its own): nothing is left to pay
    const { data: held } = await createAdminClient()
      .from("subscriptions")
      .select("plan_id, status")
      .eq("user_id", userId);
    if (held?.some((s) => s.plan_id === spec.planId && HELD.has(s.status)))
      return { state: "paid", spec };
    if (session.status !== "open" || !session.client_secret) return { state: "gone", spec };
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    // the typed card has a checkout of its own, so Stripe draws plain card fields and nothing else
    const card = customerId
      ? await createPlanPaySession({
          customerId,
          spec,
          userId,
          returnUrl: planPayReturnUrl(appUrl),
          way: "card",
        }).catch(() => null)
      : null;
    return {
      state: "open",
      clientSecret: session.client_secret,
      // if the card's own checkout could not be made, the first one still takes a card
      cardSecret: card?.client_secret ?? session.client_secret,
      spec,
    };
  } catch (e) {
    console.error("[plan-pay] could not open the payment", e);
    return null;
  }
}
