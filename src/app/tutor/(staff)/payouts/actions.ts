"use server";

// ============================================================
// /tutor/payouts server actions.
//
// actionRequestPayout(method) — the only one the tutor calls.
//   1. Auth + Stripe-onboarded check
//   2. Find all eligible bookings (recap_email_sent=true,
//      payout_status='pending')
//   3. Sum gross amount + tutor_hours
//   4. Apply 2.5% application fee for instant; 0% for standard
//   5. Insert a payout_requests row
//   6. Mark bookings payout_status='requested', set payout_request_id
//   7. Stripe Transfer platform → connected account (gross)
//   8. Stripe Payout connected account → bank/card
//      (net amount; instant via debit card)
//   9. On success: bookings → payout_status='paid', payout_requests → 'paid'
//      On Stripe failure: bookings → payout_status='pending' rollback
//  10. Refresh tutor_earnings_summary
//
// Auth: tutor self-serve only.
// ============================================================

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import {
  transferToConnectedAccount,
  createPayoutFromConnectedAccount,
  fetchAccountStatus,
} from "@/lib/integrations/stripe/connect";
import { resend, FROM } from "@/lib/integrations/resend/client";

const APPLICATION_FEE_INSTANT = 0.025; // 2.5%
const APPLICATION_FEE_STANDARD = 0; // ACH is free to the tutor

export type PayoutMethod = "instant" | "standard";

export interface PayoutResult {
  ok: true;
  request_id: string;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  total_hours: number;
  booking_count: number;
  method: PayoutMethod;
  arrival_estimate: string;
}

export async function actionRequestPayout(method: PayoutMethod): Promise<PayoutResult> {
  const { userId: clerkId } = await safeAuth();
  if (!clerkId) throw new Error("not_signed_in");

  const supabase = createAdminClient();

  // 1. Caller + Stripe onboarded check
  const { data: caller } = await supabase
    .from("users")
    .select(
      "id, role, email, first_name, last_name, stripe_connect_account_id, stripe_payouts_enabled"
    )
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!caller) throw new Error("user_not_found");
  if (caller.role !== "tutor" && caller.role !== "admin") throw new Error("forbidden");
  if (!caller.stripe_connect_account_id) throw new Error("not_onboarded");
  if (!caller.stripe_payouts_enabled) throw new Error("payouts_not_enabled");

  // For instant payouts, double-check the capability is live (cached
  // flag may be out of date if the tutor just added a debit card).
  if (method === "instant") {
    const status = await fetchAccountStatus(caller.stripe_connect_account_id as string);
    if (!status.instant_payouts_active) {
      throw new Error("instant_not_available");
    }
  }

  // 2. Eligible SESSIONS (per-session pay — group sessions count once)
  const { data: eligible } = await supabase
    .from("sessions")
    .select("id, payout_amount, tutor_hours")
    .eq("tutor_id", caller.id)
    .eq("recap_email_sent", true)
    .eq("payout_status", "pending");

  if (!eligible || eligible.length === 0) {
    throw new Error("no_eligible_sessions");
  }

  // 3. Sum
  const gross = round2(eligible.reduce((s, b) => s + Number(b.payout_amount ?? 0), 0));
  const totalHours = round2(eligible.reduce((s, b) => s + Number(b.tutor_hours ?? 0), 0));
  if (gross <= 0) throw new Error("zero_amount");

  // 4. Fees
  const feeRate = method === "instant" ? APPLICATION_FEE_INSTANT : APPLICATION_FEE_STANDARD;
  const fee = round2(gross * feeRate);
  const net = round2(gross - fee);

  // 5. Create the payout_requests row up-front so we have an id to
  //    reference even if Stripe calls fail mid-flow.
  const sessionIds = eligible.map((s) => s.id as string);
  const { data: requestRow, error: insErr } = await supabase
    .from("payout_requests")
    .insert({
      tutor_user_id: caller.id,
      total_amount: gross,
      total_hours: totalHours,
      booking_ids: [], // legacy column kept; not used post-sessions migration
      session_ids: sessionIds, // canonical going forward
      payout_method: method,
      payment_method: "stripe",
      application_fee_amount: fee,
      net_amount: net,
      status: "pending_approval", // bumped to 'paid' once Stripe completes
    })
    .select("id")
    .single();
  if (insErr || !requestRow) {
    throw new Error(`request_insert_failed: ${insErr?.message ?? "unknown"}`);
  }
  const requestId = requestRow.id as string;

  // 6. Mark sessions as 'requested' so the same session can't be
  //    double-paid by a concurrent click.
  await supabase
    .from("sessions")
    .update({ payout_status: "requested", payout_request_id: requestId })
    .in("id", sessionIds);

  // 7. Transfer platform → connected account (gross dollars).
  let transferId: string;
  try {
    transferId = await transferToConnectedAccount({
      amount: gross,
      connectedAccountId: caller.stripe_connect_account_id as string,
      description: `KarmanPrep tutor earnings — ${eligible.length} session${eligible.length === 1 ? "" : "s"}`,
      metadata: {
        request_id: requestId,
        tutor_user_id: caller.id as string,
      },
    });
  } catch (err) {
    await rollback(supabase, requestId, sessionIds, err);
    throw new Error(`transfer_failed: ${errMessage(err)}`);
  }

  // 8. Payout from connected account → bank or debit card (net dollars
  //    — Stripe automatically deducts the application fee from the
  //    transferred balance).
  let payoutId: string;
  try {
    payoutId = await createPayoutFromConnectedAccount({
      amount: net,
      connectedAccountId: caller.stripe_connect_account_id as string,
      method,
      description: `KarmanPrep payout — ${eligible.length} session${eligible.length === 1 ? "" : "s"}`,
      metadata: {
        request_id: requestId,
        platform: "karmanprep",
      },
    });
  } catch (err) {
    // The transfer already moved money to the connected account.
    // Don't roll back the bookings — the money is in their Stripe
    // balance. Mark the request as 'failed' for admin to investigate.
    await supabase
      .from("payout_requests")
      .update({
        status: "failed",
        notes: `payout_failed: ${errMessage(err)} (transfer_id=${transferId})`,
        stripe_transfer_id: transferId,
      })
      .eq("id", requestId);
    await supabase
      .from("sessions")
      .update({ payout_status: "approved" }) // money's at Stripe but not yet in tutor's hand
      .in("id", sessionIds);
    throw new Error(`payout_failed: ${errMessage(err)}`);
  }

  // 9. Mark everything paid. (Stripe webhook will also confirm
  //    asynchronously via payout.paid; this just keeps UI snappy.)
  const now = new Date().toISOString();
  await supabase
    .from("payout_requests")
    .update({
      status: "paid",
      stripe_transfer_id: transferId,
      stripe_payout_id: payoutId,
      approved_at: now,
      paid_at: now,
    })
    .eq("id", requestId);
  await supabase.from("sessions").update({ payout_status: "paid" }).in("id", sessionIds);

  // 10. Refresh earnings view
  try {
    await supabase.rpc("refresh_tutor_earnings_summary");
  } catch (err) {
    console.warn("[payouts] earnings refresh failed (non-fatal):", err);
  }

  // Notify tutor by email (nice-to-have, not blocking)
  try {
    const tutorName = [caller.first_name, caller.last_name].filter(Boolean).join(" ") || "there";
    await resend.emails.send({
      from: FROM,
      to: caller.email!,
      subject: `Payout sent — $${net.toFixed(2)}`,
      html: `<p>Hi ${tutorName},</p>
<p>Your KarmanPrep payout of <strong>$${net.toFixed(2)}</strong> is on its way${
        method === "instant"
          ? " — should arrive on your debit card in seconds"
          : " via ACH — typically 2-3 business days"
      }.</p>
<p>${eligible.length} session${eligible.length === 1 ? "" : "s"} · ${totalHours.toFixed(2)} hours · ${
        method === "instant" ? `$${fee.toFixed(2)} fee` : "no fee"
      } · gross $${gross.toFixed(2)}</p>
<p>—<br/>KarmanPrep</p>`,
    });
  } catch (err) {
    console.warn("[payouts] notification email failed (non-fatal):", err);
  }

  revalidatePath("/tutor/earnings");
  revalidatePath("/tutor/payouts");

  return {
    ok: true,
    request_id: requestId,
    gross_amount: gross,
    fee_amount: fee,
    net_amount: net,
    total_hours: totalHours,
    booking_count: eligible.length,
    method,
    arrival_estimate: method === "instant" ? "in seconds" : "in 2-3 business days",
  };
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
async function rollback(
  supabase: ReturnType<typeof createAdminClient>,
  requestId: string,
  sessionIds: string[],
  err: unknown
) {
  await supabase
    .from("payout_requests")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      notes: `rolled back: ${errMessage(err)}`,
    })
    .eq("id", requestId);
  await supabase
    .from("sessions")
    .update({ payout_status: "pending", payout_request_id: null })
    .in("id", sessionIds);
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
