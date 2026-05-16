// ============================================================
// POST /api/stripe/webhook
// Handles Stripe webhook events for subscription lifecycle.
// Must be a raw body handler — no JSON.parse middleware.
// ============================================================

import { NextResponse } from "next/server";
import { stripe } from "@/lib/integrations/stripe/client";
import { withWebhookInstrumentation } from "@/lib/observability/webhook";
import {
  chargeMetadataSchema,
  subscriptionMetadataSchema,
} from "@/lib/integrations/stripe/schemas";
import { createAdminClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/integrations/resend/emails";
import { dropFromActiveCohort, restoreLastCohort } from "@/lib/supabase/queries/cohorts";
import { ensureCohortChannels } from "@/lib/chat/provisioning";
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
const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);

/** Verifies the Stripe signature and returns the parsed event */
async function parseWebhookEvent(req: Request): Promise<Stripe.Event> {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) throw new Error("Missing stripe-signature header");

  // constructEventAsync uses Web Crypto under the hood — required on
  // Cloudflare Workers (no Node crypto module). Works in Node too.
  return stripe.webhooks.constructEventAsync(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
}

export const POST = withWebhookInstrumentation("stripe", async (req: Request) => {
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
        const meta = subscriptionMetadataSchema.safeParse(sub.metadata);
        if (!meta.success) {
          // Either userId missing (subscription created outside our flow)
          // or tier wasn't one of the 4 locked values. Skip rather than
          // insert garbage. Return 200 — no retry helps.
          console.warn(
            `[webhook] subscription.created skipped — bad metadata on ${sub.id}:`,
            meta.error.issues
          );
          break;
        }
        const { userId, tier } = meta.data;

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          tier,
          status: sub.status,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        });

        // Auto-restore cohort membership if the user previously had one
        // and is now active/trialing again. No-op if they're already in
        // a cohort or if their old cohort is full / completed.
        if (ACTIVE_STATUSES.has(sub.status)) {
          const restored = await restoreLastCohort(userId);
          if (restored) {
            console.log(
              `[webhook] Restored ${userId} to cohort ${restored} on subscription.created`
            );
            // Auto-provision Slack channels for this cohort if they don't
            // exist yet. Idempotent — safe to call on every restore. Wrapped
            // so a Slack failure doesn't break the rest of the webhook flow.
            ensureCohortChannels(restored).catch((err) =>
              console.error(`[webhook] ensureCohortChannels failed for ${restored}:`, err)
            );
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
        const meta = subscriptionMetadataSchema.safeParse(sub.metadata);
        if (!meta.success) {
          console.warn(
            `[webhook] subscription.updated skipped — bad metadata on ${sub.id}:`,
            meta.error.issues
          );
          break;
        }
        const { userId, tier } = meta.data;

        await supabase
          .from("subscriptions")
          .update({
            status: sub.status,
            tier,
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            // Stamp canceled_at the moment status flips to canceled,
            // so the Revenue dashboard can compute real monthly churn.
            // Stripe also sends `customer.subscription.deleted` (handled
            // below), but `subscription.updated` fires first when a
            // user cancels at period end.
            canceled_at: sub.status === "canceled" ? new Date().toISOString() : null,
          })
          .eq("stripe_subscription_id", sub.id);

        // Cohort lifecycle hooks
        if (INACTIVE_STATUSES.has(sub.status)) {
          const dropped = await dropFromActiveCohort(userId);
          if (dropped) {
            console.log(
              `[webhook] Dropped ${userId} from cohort ${dropped} (status=${sub.status})`
            );
          }
        } else if (ACTIVE_STATUSES.has(sub.status)) {
          const restored = await restoreLastCohort(userId);
          if (restored) {
            console.log(
              `[webhook] Restored ${userId} to cohort ${restored} (status=${sub.status})`
            );
            ensureCohortChannels(restored).catch((err) =>
              console.error(`[webhook] ensureCohortChannels failed for ${restored}:`, err)
            );
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
          .update({ status: "canceled", canceled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);

        // Always drop on hard cancel. The cohort_members row stays
        // with left_at set so the user can be auto-re-added if they
        // re-subscribe later.
        if (userId) {
          const dropped = await dropFromActiveCohort(userId);
          if (dropped) {
            console.log(
              `[webhook] Dropped ${userId} from cohort ${dropped} on subscription.deleted`
            );
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

      // ---- Refund issued ----
      // Powers the refund-rate KPI on /admin/revenue. Idempotent
      // via stripe_refund_id UNIQUE constraint — duplicate webhook
      // deliveries silently no-op.
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        // userId on charge metadata is optional — refunds for ad-hoc
        // charges (rare) may not carry it. Subscription resolves via
        // the subscription id below regardless.
        const userId = chargeMetadataSchema.safeParse(charge.metadata).data?.userId ?? null;
        const subscriptionId = (charge as unknown as { subscription?: string }).subscription;

        // A charge can carry multiple refunds; iterate just in case.
        const refundsList = (charge.refunds?.data ?? []) as Stripe.Refund[];
        for (const r of refundsList) {
          // Resolve the parent subscription in our DB (if any).
          let subDbId: string | null = null;
          if (subscriptionId) {
            const { data } = await supabase
              .from("subscriptions")
              .select("id")
              .eq("stripe_subscription_id", subscriptionId)
              .maybeSingle();
            subDbId = (data as { id?: string } | null)?.id ?? null;
          }
          let userDbId: string | null = null;
          if (userId) {
            const { data } = await supabase
              .from("users")
              .select("id")
              .eq("clerk_id", userId)
              .maybeSingle();
            userDbId = (data as { id?: string } | null)?.id ?? null;
          }
          await supabase.from("refunds").upsert(
            {
              stripe_refund_id: r.id,
              subscription_id: subDbId,
              user_id: userDbId,
              amount_cents: r.amount,
              reason: r.reason ?? null,
              issued_at: new Date(r.created * 1000).toISOString(),
            },
            { onConflict: "stripe_refund_id" }
          );
        }
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
});

// Note: Next.js App Router reads the raw body via req.text() — no extra config needed.
