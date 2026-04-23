// ============================================================
// POST /api/stripe/webhook
// Handles Stripe webhook events for subscription lifecycle.
// Must be a raw body handler — no JSON.parse middleware.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/resend/emails";
import Stripe from "stripe";

/** Verifies the Stripe signature and returns the parsed event */
async function parseWebhookEvent(req: NextRequest): Promise<Stripe.Event> {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) throw new Error("Missing stripe-signature header");

  return stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  try {
    event = await parseWebhookEvent(req);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      // ---- Subscription created (also fires when trial starts) ----
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const tier = sub.metadata?.tier || "group";

        if (!userId) break;

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          tier,
          status: sub.status,
          trial_end: sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
        });

        // Send welcome email
        const { data: user } = await supabase
          .from("users")
          .select("email")
          .eq("clerk_id", userId)
          .single();

        if (user?.email) {
          await sendWelcomeEmail({
            to: user.email,
            firstName: user.email.split("@")[0],
            role: "student",
          });
        }
        break;
      }

      // ---- Subscription updated (upgrade / downgrade / renewed) ----
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const tier = sub.metadata?.tier || "group";

        if (!userId) break;

        await supabase
          .from("subscriptions")
          .update({
            status: sub.status,
            tier,
            trial_end: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", sub.id);

        break;
      }

      // ---- Subscription canceled ----
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);

        break;
      }

      // ---- Trial will end soon ----
      case "customer.subscription.trial_will_end": {
        // Could trigger a trial-ending email here
        console.log("[webhook] Trial ending soon for subscription:", event.data.object);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook] Handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

// Note: Next.js App Router reads the raw body via req.text() — no extra config needed.
