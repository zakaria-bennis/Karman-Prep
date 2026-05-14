// ============================================================
// POST /api/webhooks/stripe-connect
//
// Stripe Connect webhook events that we care about:
//
//  · account.updated        — Connect account changed; we re-pull
//                             status to update users.stripe_payouts_enabled
//  · payout.paid            — payout from connected account → bank/card
//                             completed; we mark payout_requests.status='paid'
//                             (also reached synchronously in the action,
//                             this is just an extra safety net)
//  · payout.failed          — payout failed; mark request 'failed' + notify
//                             admin
//  · transfer.created       — informational; we already log via the action
//
// Auth: signature verification via STRIPE_CONNECT_WEBHOOK_SECRET
// (separate from the platform's STRIPE_WEBHOOK_SECRET — Stripe
// has different signing secrets per webhook endpoint).
//
// Always returns 200 once we've stored the payload in webhook_events,
// so Stripe stops retrying.
// ============================================================

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { resend, FROM } from "@/lib/integrations/resend/client";

export const runtime = "nodejs";

let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (_stripe) return _stripe;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY missing");
  _stripe = new Stripe(apiKey, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "missing_signature_or_secret" }, { status: 401 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[stripe-connect] signature verification failed:", msg);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Log raw payload (dedup on Stripe event id).
  const { data: webhookRow, error: insErr } = await supabase
    .from("webhook_events")
    .insert({
      source: "stripe_connect",
      external_event_id: event.id,
      event_type: event.type,
      raw_payload: event as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();
  if (insErr) {
    if (insErr.code === "23505") {
      // Duplicate delivery — already processed.
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    console.error("[stripe-connect] log insert failed:", insErr.message);
    return NextResponse.json({ error: "log_failed" }, { status: 500 });
  }
  const webhookEventId = webhookRow.id as string;

  try {
    await processEvent(event, supabase);
    await supabase
      .from("webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", webhookEventId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[stripe-connect] processing ${event.type} failed:`, msg);
    await supabase
      .from("webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: msg,
      })
      .eq("id", webhookEventId);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

type Supabase = ReturnType<typeof createAdminClient>;

async function processEvent(event: Stripe.Event, supabase: Supabase) {
  switch (event.type) {
    case "account.updated":
      return handleAccountUpdated(event, supabase);
    case "payout.paid":
      return handlePayoutPaid(event, supabase);
    case "payout.failed":
      return handlePayoutFailed(event, supabase);
    default:
      return; // ignored event type
  }
}

// ──────────────────────────────────────────────────────────
// account.updated → refresh users.stripe_payouts_enabled
// ──────────────────────────────────────────────────────────
async function handleAccountUpdated(event: Stripe.Event, supabase: Supabase) {
  const acct = event.data.object as Stripe.Account;
  const accountId = acct.id;
  const payoutsEnabled = acct.payouts_enabled === true;

  await supabase
    .from("users")
    .update({
      stripe_payouts_enabled: payoutsEnabled,
      stripe_connect_onboarded_at: payoutsEnabled ? new Date().toISOString() : null,
      payment_info_updated_at: new Date().toISOString(),
    })
    .eq("stripe_connect_account_id", accountId);
}

// ──────────────────────────────────────────────────────────
// payout.paid → mark payout_requests as paid
// ──────────────────────────────────────────────────────────
async function handlePayoutPaid(event: Stripe.Event, supabase: Supabase) {
  const payout = event.data.object as Stripe.Payout;
  const { data: req } = await supabase
    .from("payout_requests")
    .select("id, status, session_ids")
    .eq("stripe_payout_id", payout.id)
    .maybeSingle();
  if (!req) return; // unknown payout — log via webhook_events but no action

  if (req.status !== "paid") {
    await supabase
      .from("payout_requests")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", req.id);
  }
  await supabase
    .from("sessions")
    .update({ payout_status: "paid" })
    .in("id", (req.session_ids as string[]) ?? []);

  try {
    await supabase.rpc("refresh_tutor_earnings_summary");
  } catch {
    /* non-fatal */
  }
}

// ──────────────────────────────────────────────────────────
// payout.failed → mark failed + notify admin
// ──────────────────────────────────────────────────────────
async function handlePayoutFailed(event: Stripe.Event, supabase: Supabase) {
  const payout = event.data.object as Stripe.Payout;
  const { data: req } = await supabase
    .from("payout_requests")
    .select("id, tutor_user_id, session_ids, total_amount, net_amount")
    .eq("stripe_payout_id", payout.id)
    .maybeSingle();
  if (!req) return;

  const failureReason = payout.failure_message || payout.failure_code || "unknown";
  await supabase
    .from("payout_requests")
    .update({
      status: "failed",
      notes: `payout failed: ${failureReason}`,
    })
    .eq("id", req.id);

  await supabase
    .from("sessions")
    .update({ payout_status: "approved" }) // money's at Stripe, not yet in tutor's hand
    .in("id", (req.session_ids as string[]) ?? []);

  // Notify admin
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    try {
      await resend.emails.send({
        from: FROM,
        to: adminEmail,
        subject: `[KarmanPrep] Tutor payout failed — ${req.id}`,
        html: `<p>A tutor payout failed at Stripe.</p>
<ul>
  <li><strong>Request id:</strong> ${req.id}</li>
  <li><strong>Stripe payout id:</strong> ${payout.id}</li>
  <li><strong>Tutor user_id:</strong> ${req.tutor_user_id}</li>
  <li><strong>Net amount:</strong> $${Number(req.net_amount ?? req.total_amount).toFixed(2)}</li>
  <li><strong>Failure reason:</strong> ${failureReason}</li>
</ul>
<p>The money is in the tutor's connected Stripe balance — they need to update their bank/card and retry, or you can contact Stripe support.</p>`,
      });
    } catch (err) {
      console.warn("[stripe-connect] admin notify failed:", err);
    }
  }
}
