import "server-only";
/*
 * School renewal in Stripe (test mode tonight). The school's first year is free; "Set up
 * renewal" starts a yearly subscription at $8 per seated student whose trial ends on the
 * free-until date, so nothing is charged before then. Returning from Checkout, the session is
 * read back from Stripe and recorded on the school. Later changes go through Stripe's portal.
 */
import { stripe } from "@/lib/integrations/stripe/client";
import {
  appUrl,
  createTestCustomer,
  customerPortalUrl,
  isPlaceholderCustomer,
  mayCreateTestCustomer,
} from "@/lib/billing-portal/stripe";
import { untypedAdmin } from "@/lib/school/db";
import type { SchoolContext } from "./access";
import { schoolStudentCount } from "./roster";
import { SCHOOL_TERMS, trialEndFor } from "./terms";

async function schoolCustomer(ctx: SchoolContext): Promise<string> {
  if (ctx.school.stripeCustomerId && !isPlaceholderCustomer(ctx.school.stripeCustomerId)) {
    return ctx.school.stripeCustomerId;
  }
  if (ctx.school.stripeCustomerId && !mayCreateTestCustomer()) {
    throw new Error("This school's Stripe customer is a placeholder.");
  }
  const id = await createTestCustomer({
    email: ctx.viewer.email,
    name: ctx.school.name,
    metadata: { school_id: ctx.school.id },
  });
  const { error } = await untypedAdmin()
    .from("schools")
    .update({ stripe_customer_id: id, updated_at: new Date().toISOString() })
    .eq("id", ctx.school.id);
  if (error) throw error;
  return id;
}

/** A Stripe Checkout link that sets up the yearly renewal. */
export async function renewalCheckoutUrl(ctx: SchoolContext): Promise<string> {
  const customer = await schoolCustomer(ctx);
  const students = Math.max(1, await schoolStudentCount(ctx.school.id));
  const trialEnd = trialEndFor(ctx.school.freeUntil);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [
      {
        quantity: students,
        price_data: {
          currency: "usd",
          unit_amount: SCHOOL_TERMS.pricePerStudentPerYear * 100,
          recurring: { interval: "year" },
          product_data: { name: "Karman for schools, one student for one year" },
        },
      },
    ],
    subscription_data: {
      ...(trialEnd ? { trial_end: trialEnd } : {}),
      metadata: { school_id: ctx.school.id, plan_id: "school" },
    },
    metadata: { school_id: ctx.school.id, plan_id: "school" },
    success_url: `${appUrl()}/school/billing?renewal={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/school/billing`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout link.");
  return session.url;
}

/** Records a finished renewal checkout. Returns false if the session is not this school's. */
export async function recordRenewal(
  ctx: SchoolContext,
  checkoutSessionId: string
): Promise<boolean> {
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  if (session.metadata?.school_id !== ctx.school.id || session.status !== "complete") return false;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);
  const { error } = await untypedAdmin()
    .from("schools")
    .update({
      stripe_subscription_id: subscriptionId,
      billing_status: "renewal_set",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.school.id);
  if (error) throw error;
  return true;
}

export async function schoolPortalUrl(ctx: SchoolContext): Promise<string> {
  return customerPortalUrl(await schoolCustomer(ctx), "/school/billing");
}
