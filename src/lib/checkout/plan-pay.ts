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
  | {
      state: "open";
      clientSecret: string;
      /** The checkout behind the one-tap buttons, or "" when it could not be made. */
      tapSecret: string;
      spec: StripePriceSpec;
      /** The buyer's email and mobile number as Stripe holds them, shown on the page. */
      email: string;
      phone: string;
    }
  /** "clearing": paid from a bank, which takes a few days to arrive. The plan is on meanwhile. */
  | { state: "paid" | "clearing"; spec: StripePriceSpec }
  /** The checkout ran out before it was paid (Stripe keeps one for a day): a new one is opened. */
  | { state: "gone"; spec: StripePriceSpec };

/** This account's own plan checkout, or null: a made-up id, somebody else's, or not a student plan. */
async function mine(userId: string, sessionId: string) {
  if (!SESSION_ID.test(sessionId)) return null;
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });
  const meta = subscriptionMetadataSchema.safeParse(session.metadata ?? {});
  if (!meta.success || meta.data.userId !== userId || session.mode !== "subscription") return null;
  if (meta.data.planId === "tutor-affiliate") return null;
  const spec = findStripePrice(meta.data.planId, meta.data.term);
  return spec ? { session, spec } : null;
}

/** The Stripe customer on a checkout, when it was read whole. */
const customerOf = (session: Stripe.Checkout.Session) =>
  session.customer && typeof session.customer !== "string" && !session.customer.deleted
    ? session.customer
    : null;

/** A finished checkout as the page says it: a bank payment is accepted but not yet arrived. */
const stateOf = (session: Stripe.Checkout.Session) =>
  session.payment_status === "unpaid" ? ("clearing" as const) : ("paid" as const);

/** Writes the plan to the account from a finished checkout. The webhook writes the same row. The
 *  mobile number given on the page is kept on the Stripe customer, where the founder reads it. */
async function record(session: Stripe.Checkout.Session): Promise<boolean> {
  const sub = session.subscription;
  const parsed = sub && typeof sub !== "string" ? subscriptionRow(sub) : null;
  if (!parsed) return false;
  const customer = customerOf(session);
  const phone = session.customer_details?.phone;
  if (customer && phone && phone !== customer.phone)
    await stripe.customers.update(customer.id, { phone }).catch(() => null);
  const { error } = await createAdminClient()
    .from("subscriptions")
    .upsert(parsed.row, { onConflict: "stripe_subscription_id" });
  if (error) console.error("[plan-pay] could not record the plan", error.message);
  return !error;
}

/** The moment a payment is made on the page: asks Stripe whether this checkout is finished, and if so
 *  the account holds the plan from now. */
export async function confirmPlanPaid(
  userId: string,
  sessionId: string
): Promise<"paid" | "clearing" | false> {
  try {
    const found = await mine(userId, sessionId);
    if (!found || found.session.status !== "complete") return false;
    return (await record(found.session)) ? stateOf(found.session) : false;
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
      return { state: stateOf(session), spec };
    }
    // paid with the page's other checkout (the one-tap buttons have their own): nothing is left to pay
    const { data: held } = await createAdminClient()
      .from("subscriptions")
      .select("plan_id, status")
      .eq("user_id", userId);
    if (held?.some((s) => s.plan_id === spec.planId && HELD.has(s.status)))
      return { state: "paid", spec };
    if (session.status !== "open" || !session.client_secret) return { state: "gone", spec };
    const customer = customerOf(session);
    // the one-tap buttons have a checkout of their own (see createPlanPaySession)
    const tap = customer
      ? await createPlanPaySession({
          customerId: customer.id,
          spec,
          userId,
          returnUrl: planPayReturnUrl(appUrl),
          tap: true,
        }).catch(() => null)
      : null;
    return {
      state: "open",
      clientSecret: session.client_secret,
      tapSecret: tap?.client_secret ?? "",
      spec,
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
    };
  } catch (e) {
    console.error("[plan-pay] could not open the payment", e);
    return null;
  }
}
