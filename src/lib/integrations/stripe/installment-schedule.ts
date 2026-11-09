// ============================================================
// After the cohort deposit is paid (checkout.session.completed with
// metadata term "installments"), schedule the three $300 payments:
// a Stripe subscription schedule on the saved card, starting on the
// cohort's start date (or now, once it has started) and ending by
// itself after three months. Idempotent per checkout session.
// ============================================================

import type Stripe from "stripe";
import { MARCH_PROGRAM } from "@/lib/marketing/offer";
import { getCheckoutPrice, stripe } from "./client";
import { cohortBillingAnchor } from "./cohort-installments";
import { cohortInstallmentSpecs } from "./prices";

export async function scheduleCohortInstallments(
  session: Stripe.Checkout.Session
): Promise<string> {
  const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!customer || !paymentIntentId) {
    throw new Error(`Cohort instalments ${session.id}: no customer or payment on the session`);
  }
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const paymentMethod =
    typeof paymentIntent.payment_method === "string"
      ? paymentIntent.payment_method
      : paymentIntent.payment_method?.id;
  if (!paymentMethod) throw new Error(`Cohort instalments ${session.id}: no saved card`);

  const price = await getCheckoutPrice(cohortInstallmentSpecs().installment);
  const schedule = await stripe.subscriptionSchedules.create(
    {
      customer,
      start_date: cohortBillingAnchor() ?? "now",
      end_behavior: "cancel",
      default_settings: { default_payment_method: paymentMethod },
      phases: [
        {
          items: [{ price: price.id, quantity: 1 }],
          duration: { interval: "month", interval_count: MARCH_PROGRAM.installments.count },
        },
      ],
      metadata: { ...(session.metadata ?? {}), checkout_session: session.id },
    },
    { idempotencyKey: `cohort-installments-${session.id}` }
  );
  return schedule.id;
}
