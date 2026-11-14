// ============================================================
// Pay first, account after (founder, 2026-11-14). A visitor with no
// account goes straight to Stripe from a plan button. Stripe sends them
// back to /checkout/done with the checkout session's id; they make an
// account (or sign in), and that account claims the purchase here.
// Until then nothing in our database points at the payment: Stripe
// holds it, and the session id (long, unguessable, shown only to the
// buyer and emailed to the address they paid with) is the claim.
// Server only.
// ============================================================

import type Stripe from "stripe";
import { z } from "zod";
import { trackServer } from "@/lib/analytics/server";
import { FROM, resend } from "@/lib/integrations/resend/client";
import { createGuestCheckoutSession, stripe } from "@/lib/integrations/stripe/client";
import { findStripePrice, isSubscriptionPlan } from "@/lib/integrations/stripe/prices";
import { createCheckoutBodySchema } from "@/lib/integrations/stripe/schemas";
import { recordPurchaseGrant } from "@/lib/plans";
import { ONE_TIME_PLAN_IDS, SUBSCRIPTION_PLAN_IDS } from "@/lib/plans/catalog";
import { createAdminClient } from "@/lib/supabase/server";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Stripe's checkout session ids: "cs_test_..." or "cs_live_...". */
export const sessionIdSchema = z.string().regex(/^cs_(test|live)_[A-Za-z0-9]{10,200}$/);

/** Plans a visitor can buy before having an account. A cohort seat is reserved on /reserve, and a
 *  tutor's plan belongs to a tutor account, so neither is sold this way. */
const GUEST_PLANS = new Set<string>(["practice", "pro", "private-10", "private-20"]);

/** Where the buyer lands after paying. */
export const donePath = (sessionId: string) => `/checkout/done?s=${sessionId}`;

/** Opens Stripe Checkout for a visitor with no account. Null when this plan is not sold that way. */
export async function startGuestCheckout(input: unknown): Promise<string | null> {
  const parsed = createCheckoutBodySchema.safeParse(input);
  if (!parsed.success || !GUEST_PLANS.has(parsed.data.plan)) return null;
  const spec = findStripePrice(parsed.data.plan, parsed.data.term);
  if (!spec) return null;
  const session = await createGuestCheckoutSession({
    spec,
    successUrl: `${appUrl()}/checkout/done?s={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl()}/pricing`,
  });
  return session.url;
}

const guestMeta = z.object({
  guest: z.literal("1"),
  planId: z.enum([...SUBSCRIPTION_PLAN_IDS, ...ONE_TIME_PLAN_IDS]),
  term: z.string(),
  claimedBy: z.string().optional(),
});

export type GuestPurchase =
  | { state: "missing" } // not ours, not paid, or never existed
  | { state: "open"; email: string | null; hasAccount: boolean } // paid, waiting for an account
  | { state: "claimed"; by: string };

async function paidGuestSession(sessionId: string) {
  if (!sessionIdSchema.safeParse(sessionId).success) return null;
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  } catch {
    return null;
  }
  const meta = guestMeta.safeParse(session.metadata);
  if (!meta.success || session.status !== "complete" || session.payment_status === "unpaid")
    return null;
  return { session, meta: meta.data };
}

/** What stands behind a /checkout/done link. */
export async function guestPurchase(sessionId: string): Promise<GuestPurchase> {
  const found = await paidGuestSession(sessionId);
  if (!found) return { state: "missing" };
  if (found.meta.claimedBy) return { state: "claimed", by: found.meta.claimedBy };
  const email = found.session.customer_details?.email?.toLowerCase() ?? null;
  let hasAccount = false;
  if (email) {
    const { data } = await createAdminClient()
      .from("users")
      .select("id")
      .ilike("email", email)
      .limit(1);
    hasAccount = !!data?.length;
  }
  return { state: "open", email, hasAccount };
}

/**
 * Gives a paid guest purchase to an account. Safe to repeat: the same account claiming twice is
 * "ok" again; a second account is refused. "missing" when the link is not a paid guest purchase.
 */
export async function claimGuestPurchase(
  sessionId: string,
  userId: string
): Promise<"ok" | "taken" | "missing"> {
  const found = await paidGuestSession(sessionId);
  if (!found) return "missing";
  const { session, meta } = found;
  if (meta.claimedBy && meta.claimedBy !== userId) return "taken";

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) return "missing";

  if (isSubscriptionPlan(meta.planId)) {
    const sub = session.subscription as Stripe.Subscription | null;
    if (!sub || typeof sub === "string") return "missing";
    const item = sub.items?.data?.[0];
    const { error } = await createAdminClient()
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          plan_id: meta.planId,
          billing_term: meta.term,
          status: sub.status,
          current_period_end: item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
          canceled_at: null,
        },
        { onConflict: "stripe_subscription_id" }
      );
    if (error) throw error;
    // From here the webhook knows whose subscription this is (renewals, plan changes, the end).
    await stripe.subscriptions.update(sub.id, {
      metadata: { userId, planId: meta.planId, term: meta.term },
    });
  } else {
    await recordPurchaseGrant({
      userId,
      planId: meta.planId as (typeof ONE_TIME_PLAN_IDS)[number],
      checkoutSessionId: session.id,
    });
  }
  // The customer is this account's from now on (Manage plan, the next purchase).
  await stripe.customers.update(customerId, { metadata: { userId } });
  if (!meta.claimedBy) {
    await stripe.checkout.sessions.update(session.id, {
      metadata: { ...session.metadata, claimedBy: userId },
    });
    await trackServer("paid", userId, { plan: meta.planId });
  }
  return "ok";
}

/**
 * The email a guest buyer gets when the payment lands: the link that opens their plan, in case the
 * tab was closed before the account was made. Never throws: a failed email must not fail a webhook.
 */
export async function sendFinishEmail(session: Stripe.Checkout.Session): Promise<void> {
  const to = session.customer_details?.email;
  if (!to || !process.env.RESEND_API_KEY || session.metadata?.claimedBy) return;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your Karman plan is paid. One step left",
      text: [
        "Thank you. Your payment went through.",
        "",
        "One step is left: make your account, or sign in, so your plan opens. This link is yours:",
        `${appUrl()}${donePath(session.id)}`,
        "",
        "It works for one account. If you already finished, you can ignore this email.",
        "",
        "Karman Prep",
      ].join("\n"),
    });
  } catch (e) {
    console.error("[checkout] finish email failed", e);
  }
}
