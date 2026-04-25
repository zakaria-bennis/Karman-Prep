// ============================================================
// POST /api/stripe/webhook
// Handles Stripe webhook events for subscription lifecycle.
// Must be a raw body handler — no JSON.parse middleware.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/resend/emails";
import {
  dropFromActiveCohort,
  restoreLastCohort,
} from "@/lib/supabase/queries/cohorts";
import Stripe from "stripe";

// Stripe subscription statuses that mean the seat is no longer paid for.
// On any of these, the student is dropped from their active cohort.
const INACTIVE_STATUSES = new Set<Stripe.Subscription.Status>([
  "canceled",
  "unpaid",
  "incomplete_expired",
  "past_due",
]);

// Statuses that mean the seat IS paid for. Triggers cohort restore
// from the user's last membership (if any seat is still open).
const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
]);

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

        // Auto-restore cohort membership if the user previously had one
        // and is now active/trialing again. No-op if they're already in
        // a cohort or if their old cohort is full / completed.
        if (ACTIVE_STATUSES.has(sub.status)) {
          const restored = await restoreLastCohort(userId);
          if (restored) {
            console.log(`[webhook] Restored ${userId} to cohort ${restored} on subscription.created`);
          }
        }

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

      // ---- Subscription updated (upgrade / downgrade / renewed / paused) ----
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

        // Cohort lifecycle hooks
        if (INACTIVE_STATUSES.has(sub.status)) {
          const dropped = await dropFromActiveCohort(userId);
          if (dropped) {
            console.log(`[webhook] Dropped ${userId} from cohort ${dropped} (status=${sub.status})`);
          }
        } else if (ACTIVE_STATUSES.has(sub.status)) {
          const restored = await restoreLastCohort(userId);
          if (restored) {
            console.log(`[webhook] Restored ${userId} to cohort ${restored} (status=${sub.status})`);
          }
        }

        break;
      }

      // ---- Subscription canceled ----
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;

        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);

        // Always drop on hard cancel. The cohort_members row stays
        // with left_at set so the user can be auto-re-added if they
        // re-subscribe later.
        if (userId) {
          const dropped = await dropFromActiveCohort(userId);
          if (dropped) {
            console.log(`[webhook] Dropped ${userId} from cohort ${dropped} on subscription.deleted`);
          }
        }

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
