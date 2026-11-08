// ============================================================
// POST /api/stripe/webhook
// Keeps `subscriptions` (Practice, Pro, Tutor affiliate) and
// `plan_grants` (Cohort, Private 10, Private 20) in step with Stripe.
// Must be a raw body handler — no JSON.parse middleware.
//
// Every write is idempotent (keyed on the Stripe subscription,
// checkout session or refund id), and any failure returns 500 so
// Stripe retries the event.
// ============================================================

import { NextResponse } from "next/server";
import { stripe } from "@/lib/integrations/stripe/client";
import { scheduleCohortInstallments } from "@/lib/integrations/stripe/installment-schedule";
import { withWebhookInstrumentation } from "@/lib/observability/webhook";
import {
  chargeMetadataSchema,
  purchaseMetadataSchema,
  subscriptionMetadataSchema,
} from "@/lib/integrations/stripe/schemas";
import { createAdminClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/integrations/resend/emails";
import { recordPurchaseGrant } from "@/lib/plans";
import Stripe from "stripe";

/** Verifies the Stripe signature and returns the parsed event */
async function parseWebhookEvent(req: Request): Promise<Stripe.Event> {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) throw new Error("Missing stripe-signature header");

  // constructEventAsync uses Web Crypto under the hood — required on
  // Cloudflare Workers (no Node crypto module). Works in Node too.
  return stripe.webhooks.constructEventAsync(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
}

/**
 * The `subscriptions` row for a Stripe subscription, or null when it was not
 * made by our Checkout (no userId) or bills a price we do not sell. The plan
 * and term come from the price first, because a plan switch in the Stripe
 * portal changes the price but not the subscription's own metadata.
 */
function subscriptionRow(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0];
  const priceMeta = item?.price?.metadata ?? {};
  const meta = subscriptionMetadataSchema.safeParse({
    userId: sub.metadata?.userId,
    planId: priceMeta.plan_id ?? sub.metadata?.planId,
    term: priceMeta.term ?? sub.metadata?.term,
  });
  if (!meta.success) {
    console.warn(`[webhook] skipped subscription ${sub.id}: bad metadata`, meta.error.issues);
    return null;
  }
  return {
    userId: meta.data.userId,
    row: {
      user_id: meta.data.userId,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      plan_id: meta.data.planId,
      billing_term: meta.data.term,
      status: sub.status,
      current_period_end: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      // Stamped when the status flips to canceled, so the Revenue
      // dashboard can compute real monthly churn.
      canceled_at: sub.status === "canceled" ? new Date().toISOString() : null,
    },
  };
}

export const POST = withWebhookInstrumentation(
  "stripe",
  async (req: Request) => {
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
        // ---- Renewing plan started or changed (renewal, plan switch, past due) ----
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const parsed = subscriptionRow(sub);
          // No retry helps a subscription made outside our flow: acknowledge it.
          if (!parsed) break;

          // Upsert on both events: Stripe may deliver `updated` before `created`.
          const { data: saved, error: saveError } = await supabase
            .from("subscriptions")
            .upsert(parsed.row, { onConflict: "stripe_subscription_id" })
            .select("id")
            .single();
          if (saveError) throw saveError;
          if (!saved) throw new Error("Subscription was not persisted");

          if (event.type === "customer.subscription.created") {
            const { data: user, error: userError } = await supabase
              .from("users")
              .select("email")
              .eq("clerk_id", parsed.userId)
              .maybeSingle();
            if (userError) throw userError;

            if (user?.email) {
              await sendWelcomeEmail({
                to: user.email,
                firstName: user.email.split("@")[0],
                role: "student",
              });
            }
          }
          break;
        }

        // ---- Renewing plan ended ----
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const { data: saved, error: saveError } = await supabase
            .from("subscriptions")
            .update({ status: "canceled", canceled_at: new Date().toISOString() })
            .eq("stripe_subscription_id", sub.id)
            .select("id")
            .single();
          if (saveError) throw saveError;
          if (!saved) throw new Error("Subscription was not persisted");
          break;
        }

        // ---- One payment (Cohort, Private 10, Private 20) ----
        // Renewing plans also complete a session; their subscription
        // events above do the work, so only `payment` sessions count here.
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode !== "payment") break;
          if (session.payment_status === "unpaid") {
            // A delayed payment method: async_payment_succeeded follows.
            console.log(`[webhook] checkout ${session.id} completed unpaid; waiting for payment`);
            break;
          }
          const meta = purchaseMetadataSchema.safeParse(session.metadata);
          if (!meta.success) {
            console.warn(
              `[webhook] skipped checkout ${session.id}: bad metadata`,
              meta.error.issues
            );
            break;
          }
          await recordPurchaseGrant({
            userId: meta.data.userId,
            planId: meta.data.planId,
            checkoutSessionId: session.id,
          });
          // The cohort's instalment plan: the deposit is in; schedule the three payments.
          if (meta.data.planId === "cohort" && session.metadata?.term === "installments") {
            const scheduleId = await scheduleCohortInstallments(session);
            console.log(`[webhook] cohort instalments for ${session.id}: schedule ${scheduleId}`);
          }
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
              const { data, error } = await supabase
                .from("subscriptions")
                .select("id")
                .eq("stripe_subscription_id", subscriptionId)
                .maybeSingle();
              if (error) throw error;
              subDbId = (data as { id?: string } | null)?.id ?? null;
            }
            let userDbId: string | null = null;
            if (userId) {
              const { data, error } = await supabase
                .from("users")
                .select("id")
                .eq("clerk_id", userId)
                .maybeSingle();
              if (error) throw error;
              userDbId = (data as { id?: string } | null)?.id ?? null;
            }
            const { data: saved, error: saveError } = await supabase
              .from("refunds")
              .upsert(
                {
                  stripe_refund_id: r.id,
                  subscription_id: subDbId,
                  user_id: userDbId,
                  amount_cents: r.amount,
                  reason: r.reason ?? null,
                  issued_at: new Date(r.created * 1000).toISOString(),
                },
                { onConflict: "stripe_refund_id" }
              )
              .select("id")
              .single();
            if (saveError) throw saveError;
            if (!saved) throw new Error("Refund was not persisted");
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
  },
  { retryOnError: true }
);

// Note: Next.js App Router reads the raw body via req.text() — no extra config needed.
