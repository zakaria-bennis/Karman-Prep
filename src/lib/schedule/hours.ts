import "server-only";
// Buying extra tutoring hours from the Schedule tab (founder, 2026-11-17).
//   One payment is opened when the tab is, for one hour. Changing how many hours changes that same
//   payment, so nothing has to reload. What it costs is worked out here, never taken from the
//   browser (see hoursPriceCents: bulk is cheaper).
//   A family that has paid Karman before has a card on file: that card is offered first, as one
//   button. Every payment for hours keeps its card for next time.
//   A paid purchase is kept once in private_hour_purchases, whether the page or Stripe's webhook
//   reports it first.
import type Stripe from "stripe";
import { getOrCreateCustomer, stripe } from "@/lib/integrations/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import { HOURS_KIND, HOURS_MAX, hoursPriceCents } from "./hours-shared";

/** Selling hours for real money waits for the founder: bookings are not real yet, so on a live
 *  Stripe key this stays shut until PRIVATE_HOURS_SALES is "on". A test key is always allowed. */
export function hoursSalesOpen(env: Record<string, string | undefined>): boolean {
  const key = env.STRIPE_SECRET_KEY ?? "";
  if (!key) return false;
  return !key.startsWith("sk_live") || env.PRIVATE_HOURS_SALES === "on";
}

const whole = (hours: number) => Math.min(HOURS_MAX, Math.max(1, Math.round(hours)));

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
}
/** The card the family last paid with, if Stripe holds one for them. */
export async function savedCard(customerId: string): Promise<SavedCard | null> {
  const cards = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
  const card = cards.data[0];
  return card?.card ? { id: card.id, brand: card.card.brand, last4: card.card.last4 } : null;
}

export async function openHoursPayment(args: { clerkId: string; email: string; hours: number }) {
  const customer = await getOrCreateCustomer(args.clerkId, args.email);
  const hours = whole(args.hours);
  const [intent, card] = await Promise.all([
    stripe.paymentIntents.create({
      amount: hoursPriceCents(hours),
      currency: "usd",
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      // a card is kept, so the next purchase is one button. It is asked of cards only: asked of
      // the whole payment, Stripe would take away the ways to pay that cannot be kept (pay later)
      payment_method_options: { card: { setup_future_usage: "on_session" } },
      description: "Private tutoring hours",
      metadata: { kind: HOURS_KIND, userId: args.clerkId, hours: String(hours) },
    }),
    savedCard(customer.id),
  ]);
  return { intent, card };
}

const mine = (intent: Stripe.PaymentIntent, clerkId: string) =>
  intent.metadata?.kind === HOURS_KIND && intent.metadata.userId === clerkId;

/** Changes how many hours an open payment is for. Null when it is not this person's, or is
 *  already under way. */
export async function setHours(
  intentId: string,
  clerkId: string,
  hours: number
): Promise<number | null> {
  const intent = await stripe.paymentIntents.retrieve(intentId);
  if (!mine(intent, clerkId)) return null;
  if (!["requires_payment_method", "requires_confirmation"].includes(intent.status)) return null;
  const next = whole(hours);
  const amount = hoursPriceCents(next);
  await stripe.paymentIntents.update(intentId, {
    amount,
    metadata: { ...intent.metadata, hours: String(next) },
  });
  return amount;
}

/** What a payment bought, once it has succeeded. The hours are believed only when the amount paid
 *  is what that many hours cost. */
function bought(intent: Stripe.PaymentIntent): { hours: number; amountCents: number } | null {
  if (intent.metadata?.kind !== HOURS_KIND || intent.status !== "succeeded") return null;
  const hours = Number(intent.metadata.hours);
  if (!Number.isInteger(hours) || hours < 1 || hours > HOURS_MAX) return null;
  if (intent.amount_received !== hoursPriceCents(hours)) return null;
  return { hours, amountCents: intent.amount_received };
}

/** Keeps one row for a paid purchase of hours. Safe to run twice. */
export async function recordHoursPayment(intent: Stripe.PaymentIntent): Promise<string> {
  const paid = bought(intent);
  if (!paid) return "not a paid purchase of hours";
  const clerkId = intent.metadata.userId;
  const supa = createAdminClient();
  const { data: user } = await supa
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!user) return "no such user";
  const { error } = await supa.from("private_hour_purchases").upsert(
    {
      user_id: user.id,
      hours: paid.hours,
      amount_cents: paid.amountCents,
      stripe_payment_intent_id: intent.id,
    },
    { onConflict: "stripe_payment_intent_id", ignoreDuplicates: true }
  );
  if (error) throw error;
  return `${paid.hours} hours`;
}

/** The page asks whether its payment went through. If it did, the purchase is kept here too, in
 *  case the webhook is slow. Null unless it is this person's and paid. */
export async function hoursPaid(
  intentId: string,
  clerkId: string
): Promise<{ hours: number } | null> {
  const intent = await stripe.paymentIntents.retrieve(intentId);
  if (!mine(intent, clerkId)) return null;
  const paid = bought(intent);
  if (!paid) return null;
  await recordHoursPayment(intent).catch((error: unknown) =>
    // the table arrives with migration 20261117060000; the webhook keeps the purchase once it has
    console.error("[schedule/hours] the purchase was paid but not kept yet:", error)
  );
  return { hours: paid.hours };
}
