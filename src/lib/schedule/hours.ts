import "server-only";
// Buying extra tutoring hours from the Schedule tab (founder, 2026-11-17: "very easy to purchase
// more hours, whether it be in bulk or in single hours, straight from the schedule").
// One payment page serves every amount: the session is made for one hour, and the family changes
// how many on the page itself, so the one-tap buttons (Apple Pay, Link, Google Pay) are ready the
// moment the page opens. The price of an hour comes from offer.ts.
import type Stripe from "stripe";
import { getOrCreateCustomer, stripe } from "@/lib/integrations/stripe/client";
import { GUARANTEE } from "@/lib/marketing/offer";
import { createAdminClient } from "@/lib/supabase/server";
import { HOURS_KIND, HOURS_MAX } from "./hours-shared";

/** Selling hours for real money waits for the founder: bookings are not real yet, so on a live
 *  Stripe key this stays shut until PRIVATE_HOURS_SALES is "on". A test key is always allowed. */
export function hoursSalesOpen(env: Record<string, string | undefined>): boolean {
  const key = env.STRIPE_SECRET_KEY ?? "";
  if (!key) return false;
  return !key.startsWith("sk_live") || env.PRIVATE_HOURS_SALES === "on";
}

export async function createHoursCheckout(args: {
  clerkId: string;
  email: string;
  hours: number;
  returnUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const customer = await getOrCreateCustomer(args.clerkId, args.email);
  const metadata = { kind: HOURS_KIND, userId: args.clerkId };
  return stripe.checkout.sessions.create({
    customer: customer.id,
    ui_mode: "elements",
    return_url: args.returnUrl,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(GUARANTEE.private.extraSessionPrice * 100),
          product_data: { name: "Private tutoring, one hour" },
        },
        quantity: Math.min(HOURS_MAX, Math.max(1, Math.round(args.hours))),
        adjustable_quantity: { enabled: true, minimum: 1, maximum: HOURS_MAX },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
  });
}

/** What a finished payment bought. Null unless it is this person's, for hours, and paid. */
export async function hoursPaid(
  sessionId: string,
  clerkId: string
): Promise<{ hours: number; amountCents: number } | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  if (session.metadata?.kind !== HOURS_KIND || session.metadata.userId !== clerkId) return null;
  if (session.status !== "complete" || session.payment_status !== "paid") return null;
  const hours = session.line_items?.data[0]?.quantity ?? 0;
  return hours > 0 ? { hours, amountCents: session.amount_total ?? 0 } : null;
}

/** The webhook's part: keeps one row for a paid purchase of hours. Safe to run twice. */
export async function recordHoursPurchase(session: Stripe.Checkout.Session): Promise<string> {
  const clerkId = session.metadata?.userId;
  if (!clerkId) return "no buyer";
  const paid = await hoursPaid(session.id, clerkId);
  if (!paid) return "not paid";
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
      stripe_checkout_session_id: session.id,
    },
    { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true }
  );
  if (error) throw error;
  return `${paid.hours} hours`;
}
