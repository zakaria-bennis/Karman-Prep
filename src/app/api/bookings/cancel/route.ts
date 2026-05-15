// ============================================================
// POST /api/bookings/cancel
//
// Cancels a booking. Allowed by either the student or the tutor
// on the booking. Within-24h cancellations forfeit credit for
// Private + Elite tiers; Group + small_group never forfeit.
//
// Email is NOT sent here — fired by the Cal webhook handler (P4)
// when Cal echoes the BOOKING_CANCELLED event back. That keeps
// emails idempotent regardless of which side initiated the
// cancel (UI button vs. Cal native UI vs. tutor cancellation).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cancelBooking, CalAdapterError } from "@/lib/integrations/cal";
import {
  findBookingById,
  getUserUuidByClerkId,
  isWithinCancellationWindow,
  shouldForfeitCredit,
  updateBooking,
} from "@/lib/supabase/queries/bookings";
import { consumeTokenForBooking, releaseTokenFromBooking } from "@/lib/supabase/queries/tokens";
import { cancelBookingBodySchema } from "../schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = cancelBookingBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const booking = await findBookingById(body.bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "scheduled") {
    return NextResponse.json({ error: `Booking is already ${booking.status}` }, { status: 409 });
  }

  // Ownership: only the student or tutor on the booking may cancel.
  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid || (callerUuid !== booking.student_id && callerUuid !== booking.tutor_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isTutorInitiated = callerUuid === booking.tutor_id;

  const withinWindow = isWithinCancellationWindow(booking.scheduled_start);
  // Tutor-initiated cancellations never forfeit the student's credit —
  // the student didn't choose to drop. They get a token refund (via
  // the !withinWindow branch below) regardless of timing.
  const forfeit = isTutorInitiated ? false : shouldForfeitCredit(booking.plan_tier, withinWindow);

  // Cancel on Cal first, then update DB. If Cal fails, DB row
  // stays 'scheduled' — surfaces 502 so the caller can retry.
  // Exception: Cal returns 400 "already cancelled" if the booking
  // was cancelled out-of-band (Cal native UI, prior attempt that
  // succeeded on Cal but failed on our DB write). That's the desired
  // final state — treat as success and let the DB catch up.
  if (booking.cal_booking_uid) {
    try {
      await cancelBooking(booking.cal_booking_uid, body.reason);
    } catch (err) {
      const isAdapter = err instanceof CalAdapterError;
      const alreadyCancelled =
        isAdapter &&
        err.statusCode === 400 &&
        JSON.stringify(err.body ?? "")
          .toLowerCase()
          .includes("already");
      if (!alreadyCancelled) {
        console.error("[api/bookings/cancel] cal error:", isAdapter ? err.toString() : err);
        return NextResponse.json({ error: "Failed to cancel on Cal.com" }, { status: 502 });
      }
      console.warn(
        `[api/bookings/cancel] booking ${booking.id} already cancelled on Cal — syncing DB`
      );
    }
  }

  const updated = await updateBooking(booking.id, {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancelled_within_window: withinWindow,
    credit_forfeited: forfeit,
  });

  // Token resolution. Idempotent — re-running (e.g. via Cal webhook)
  // is a no-op once the first call has either consumed or released
  // the token.
  //   · Tutor-initiated cancel → always refund the student's token
  //     (forfeit is forced false above).
  //   · Student-initiated within-window forfeit → consume the token.
  //   · Student-initiated outside the window → refund.
  try {
    if (withinWindow && forfeit) {
      await consumeTokenForBooking({
        bookingId: booking.id,
        reason: "forfeited_within_window",
      });
    } else {
      await releaseTokenFromBooking(booking.id);
    }
    // group/small_group within-window: no token to refund (those tiers
    // don't have tokens at all). releaseTokenFromBooking is a no-op.
  } catch (err) {
    console.error("[api/bookings/cancel] token resolution failed:", err);
  }

  return NextResponse.json({ booking: updated });
}
