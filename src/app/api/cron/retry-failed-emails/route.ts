// ============================================================
// POST /api/cron/retry-failed-emails
//
// Drains the failed_emails queue. Picks the oldest rows whose
// next_attempt_at has passed, dispatches by `kind`, and either
// marks the row succeeded (+ updates the booking's *_email_sent
// flag) or records the failure + backs off (or gives up).
//
// Auth: same Bearer token (`CRON_SECRET`) as the other crons.
// Schedule: every 5 minutes via Cloudflare Worker cron (paired with
// the existing ingest-csv-inbox slot — both are short, idempotent,
// and read tiny batches).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  deserializeEmailArgs,
  listPendingFailedEmails,
  markFailedEmailSucceeded,
  recordFailedEmailRetryOutcome,
} from "@/lib/integrations/resend/email-queue";
import {
  sendBookingCancellation,
  sendBookingConfirmation,
  sendBookingReschedule,
} from "@/lib/integrations/resend/booking-emails";
import { updateBooking } from "@/lib/supabase/queries/bookings";

export const runtime = "nodejs";

const BATCH_SIZE = 20;

export async function POST(req: NextRequest) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await listPendingFailedEmails(BATCH_SIZE);
  if (pending.length === 0) {
    return NextResponse.json({ processed: 0, succeeded: 0, failed: 0, gaveUp: 0 });
  }

  let succeeded = 0;
  let failed = 0;
  let gaveUp = 0;

  for (const row of pending) {
    try {
      switch (row.kind) {
        case "booking_confirmation": {
          const args = deserializeEmailArgs(row.payload, ["start", "end"]) as unknown as Parameters<
            typeof sendBookingConfirmation
          >[0];
          await sendBookingConfirmation(args);
          if (row.booking_id) {
            await updateBooking(row.booking_id, { confirmation_email_sent: true });
          }
          break;
        }
        case "booking_cancellation": {
          const args = deserializeEmailArgs(row.payload, ["start", "end"]) as unknown as Parameters<
            typeof sendBookingCancellation
          >[0];
          await sendBookingCancellation(args);
          if (row.booking_id) {
            await updateBooking(row.booking_id, { cancellation_email_sent: true });
          }
          break;
        }
        case "booking_reschedule": {
          const args = deserializeEmailArgs(row.payload, [
            "start",
            "end",
            "oldStart",
          ]) as unknown as Parameters<typeof sendBookingReschedule>[0];
          await sendBookingReschedule(args);
          // No *_email_sent flag on bookings for reschedule — the
          // webhook's start-time freshness check handles dedupe.
          break;
        }
      }
      await markFailedEmailSucceeded(row.id);
      succeeded += 1;
    } catch (err) {
      console.error(`[cron/retry-failed-emails] retry failed for row ${row.id}:`, err);
      await recordFailedEmailRetryOutcome({
        id: row.id,
        priorAttempts: row.attempts,
        error: err,
      });
      // Was this the attempt that crossed the give-up threshold?
      // recordFailedEmailRetryOutcome handles the set; here we just
      // tally for the response.
      const nextAttempts = row.attempts + 1;
      // MAX_ATTEMPTS is 5 (see email-queue.ts); kept in sync with
      // BACKOFF_MS.length.
      if (nextAttempts >= 5) gaveUp += 1;
      else failed += 1;
    }
  }

  return NextResponse.json({
    processed: pending.length,
    succeeded,
    failed,
    gaveUp,
  });
}
