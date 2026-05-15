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
// Retry semantics (audit issue #14):
//   - First delivery: insert webhook_events row, call processEvent.
//     On success → mark processed=true, return 200.
//     On failure → bump `attempts`, save error_message, return 500
//     so Stripe retries (Stripe's built-in webhook retry runs for
//     ~3 days with exponential backoff).
//   - Stripe retry delivery (same event id): dedup index rejects
//     a fresh insert; instead we update-and-retry the existing row
//     if it's still unprocessed and under the attempts cap.
//   - After MAX_ATTEMPTS the row gets `gave_up_at`, an admin alert
//     is sent, and we return 200 from then on so Stripe stops
//     retrying. The row is left in the table for admin triage at
//     /admin (future surface) or via direct SQL.
// ============================================================

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { resend, FROM } from "@/lib/integrations/resend/client";
import {
  decideRetryOutcome,
  MAX_PROCESSING_ATTEMPTS,
} from "@/lib/integrations/stripe/connect-retry";
import type { Json } from "@/types/supabase";

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

  // Insert raw payload (dedup on Stripe event id). On retry from
  // Stripe we hit the unique index; below we look up the prior row
  // and decide whether to reprocess.
  const { data: webhookRow, error: insErr } = await supabase
    .from("webhook_events")
    .insert({
      source: "stripe_connect",
      external_event_id: event.id,
      event_type: event.type,
      raw_payload: event as unknown as Json,
    })
    .select("id, attempts, processed, gave_up_at")
    .single();

  let rowId: string;
  let priorAttempts: number;

  if (insErr) {
    if (insErr.code !== "23505") {
      console.error("[stripe-connect] log insert failed:", insErr.message);
      return NextResponse.json({ error: "log_failed" }, { status: 500 });
    }
    // Duplicate delivery: pull the existing row to decide if we
    // should reprocess (prior attempt failed) or short-circuit
    // (already done, or gave up).
    const { data: prior, error: priorErr } = await supabase
      .from("webhook_events")
      .select("id, attempts, processed, gave_up_at")
      .eq("source", "stripe_connect")
      .eq("external_event_id", event.id)
      .single();
    if (priorErr || !prior) {
      console.error("[stripe-connect] duplicate lookup failed:", priorErr?.message);
      return NextResponse.json({ error: "log_failed" }, { status: 500 });
    }
    if (prior.processed) {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    if (prior.gave_up_at) {
      // We've already alerted admin; tell Stripe to stop bothering.
      return NextResponse.json({ received: true, gave_up: true }, { status: 200 });
    }
    rowId = prior.id;
    priorAttempts = prior.attempts ?? 0;
  } else {
    rowId = webhookRow.id;
    priorAttempts = webhookRow.attempts ?? 0;
  }

  const nextAttempts = priorAttempts + 1;

  let processingError: Error | null = null;
  try {
    await processEvent(event, supabase);
  } catch (err) {
    processingError = err instanceof Error ? err : new Error(String(err));
    console.error(
      `[stripe-connect] processing ${event.type} failed (attempt ${nextAttempts}):`,
      processingError.message
    );
  }

  const outcome = decideRetryOutcome({
    nextAttempts,
    processingThrew: processingError !== null,
  });

  if (!processingError) {
    await supabase
      .from("webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        attempts: nextAttempts,
        error_message: null,
      })
      .eq("id", rowId);
    return NextResponse.json({ received: true }, { status: outcome.responseStatus });
  }

  if (outcome.giveUp) {
    await supabase
      .from("webhook_events")
      .update({
        attempts: nextAttempts,
        error_message: processingError.message,
        gave_up_at: new Date().toISOString(),
      })
      .eq("id", rowId);
    await alertAdminGaveUp(event, rowId, processingError.message);
    return NextResponse.json({ received: true, gave_up: true }, { status: outcome.responseStatus });
  }

  await supabase
    .from("webhook_events")
    .update({
      attempts: nextAttempts,
      error_message: processingError.message,
    })
    .eq("id", rowId);
  return NextResponse.json(
    { error: "processing_failed", attempt: nextAttempts },
    { status: outcome.responseStatus }
  );
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

  const { error } = await supabase
    .from("users")
    .update({
      stripe_payouts_enabled: payoutsEnabled,
      stripe_connect_onboarded_at: payoutsEnabled ? new Date().toISOString() : null,
      payment_info_updated_at: new Date().toISOString(),
    })
    .eq("stripe_connect_account_id", accountId);
  if (error) throw new Error(`users update failed: ${error.message}`);
}

// ──────────────────────────────────────────────────────────
// payout.paid → mark payout_requests as paid
// ──────────────────────────────────────────────────────────
async function handlePayoutPaid(event: Stripe.Event, supabase: Supabase) {
  const payout = event.data.object as Stripe.Payout;
  const { data: req, error: reqErr } = await supabase
    .from("payout_requests")
    .select("id, status, session_ids")
    .eq("stripe_payout_id", payout.id)
    .maybeSingle();
  if (reqErr) throw new Error(`payout_requests select failed: ${reqErr.message}`);
  if (!req) return; // unknown payout — log via webhook_events but no action

  if (req.status !== "paid") {
    const { error: updErr } = await supabase
      .from("payout_requests")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    if (updErr) throw new Error(`payout_requests update failed: ${updErr.message}`);
  }
  const sessionIds = (req.session_ids as string[]) ?? [];
  if (sessionIds.length > 0) {
    const { error: sessErr } = await supabase
      .from("sessions")
      .update({ payout_status: "paid" })
      .in("id", sessionIds);
    if (sessErr) throw new Error(`sessions update failed: ${sessErr.message}`);
  }

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
  const { data: req, error: reqErr } = await supabase
    .from("payout_requests")
    .select("id, tutor_user_id, session_ids, total_amount, net_amount")
    .eq("stripe_payout_id", payout.id)
    .maybeSingle();
  if (reqErr) throw new Error(`payout_requests select failed: ${reqErr.message}`);
  if (!req) return;

  const failureReason = payout.failure_message || payout.failure_code || "unknown";
  const { error: updErr } = await supabase
    .from("payout_requests")
    .update({
      status: "failed",
      notes: `payout failed: ${failureReason}`,
    })
    .eq("id", req.id);
  if (updErr) throw new Error(`payout_requests update failed: ${updErr.message}`);

  const sessionIds = (req.session_ids as string[]) ?? [];
  if (sessionIds.length > 0) {
    const { error: sessErr } = await supabase
      .from("sessions")
      .update({ payout_status: "approved" }) // money's at Stripe, not yet in tutor's hand
      .in("id", sessionIds);
    if (sessErr) throw new Error(`sessions update failed: ${sessErr.message}`);
  }

  // Notify admin — best-effort. If this throws, the outer retry
  // loop reruns the whole handler; the payout_requests update is
  // idempotent so reruns are safe.
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

// ──────────────────────────────────────────────────────────
// Give-up alert — fired once per webhook_events row that hit the
// processing cap. Best-effort; if the email send itself errors we
// still return 200 so Stripe stops retrying.
// ──────────────────────────────────────────────────────────
async function alertAdminGaveUp(event: Stripe.Event, webhookEventId: string, lastError: string) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.error(
      "[stripe-connect] gave up on webhook but ADMIN_NOTIFICATION_EMAIL is unset — row left for triage:",
      webhookEventId,
      "lastError:",
      lastError
    );
    return;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `[KarmanPrep] Stripe Connect webhook stuck after ${MAX_PROCESSING_ATTEMPTS} tries`,
      html: `<p>Processing of a Stripe Connect webhook keeps failing.</p>
<ul>
  <li><strong>Event id:</strong> ${event.id}</li>
  <li><strong>Event type:</strong> ${event.type}</li>
  <li><strong>webhook_events.id:</strong> ${webhookEventId}</li>
  <li><strong>Last error:</strong> ${lastError}</li>
</ul>
<p>The row has been parked with <code>gave_up_at</code> set. Inspect Sentry + the row payload, fix the underlying cause, then clear <code>gave_up_at</code> + <code>attempts</code> if you want the row picked up by a future retry mechanism.</p>`,
    });
  } catch (err) {
    console.error("[stripe-connect] give-up admin alert send failed:", err);
  }
}
