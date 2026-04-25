// ============================================================
// POST /api/bookings/reschedule
//
// Moves a booking to a new start time. Hard cap: one reschedule
// per booking (DB CHECK enforces; route returns a clean 403 first).
// Within-24h reschedule still forfeits credit for Private + Elite,
// matching the cancel rule.
//
// Cal.com generates a NEW Zoom meeting on reschedule, so we wipe
// zoom_meeting_id / zoom_start_url and refresh zoom_join_url from
// the response. The Zoom webhook (P5) will refill the IDs.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rescheduleBooking, CalAdapterError } from "@/lib/cal";
import {
  findBookingById,
  getUserUuidByClerkId,
  isWithinCancellationWindow,
  shouldForfeitCredit,
  updateBooking,
} from "@/lib/supabase/queries/bookings";

interface RescheduleRequest {
  bookingId: string;
  newStart: string; // ISO datetime
  reason?: string;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<RescheduleRequest>;
  try {
    body = (await req.json()) as Partial<RescheduleRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.bookingId || !body.newStart) {
    return NextResponse.json(
      { error: "Missing bookingId or newStart" },
      { status: 400 }
    );
  }

  const booking = await findBookingById(body.bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "scheduled") {
    return NextResponse.json(
      { error: `Booking is already ${booking.status}` },
      { status: 409 }
    );
  }
  if (booking.reschedule_count >= 1) {
    return NextResponse.json(
      { error: "Reschedule limit reached for this session" },
      { status: 403 }
    );
  }
  if (!booking.cal_booking_uid) {
    return NextResponse.json(
      { error: "Booking has no Cal.com record to reschedule" },
      { status: 409 }
    );
  }

  const callerUuid = await getUserUuidByClerkId(userId);
  if (
    !callerUuid ||
    (callerUuid !== booking.student_id && callerUuid !== booking.tutor_id)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const withinWindow = isWithinCancellationWindow(booking.scheduled_start);
  const forfeit = shouldForfeitCredit(booking.plan_tier, withinWindow);

  let calResp;
  try {
    calResp = await rescheduleBooking({
      calBookingUid: booking.cal_booking_uid,
      newStart: body.newStart,
      reason: body.reason,
    });
  } catch (err) {
    const isAdapter = err instanceof CalAdapterError;
    console.error("[api/bookings/reschedule] cal error:", isAdapter ? err.toString() : err);
    return NextResponse.json(
      { error: "Failed to reschedule on Cal.com" },
      { status: 502 }
    );
  }

  const updated = await updateBooking(booking.id, {
    rescheduled_from: booking.scheduled_start,
    scheduled_start: calResp.start,
    scheduled_end: calResp.end,
    reschedule_count: booking.reschedule_count + 1,
    cancelled_within_window: withinWindow,
    credit_forfeited: forfeit,
    zoom_join_url: calResp.meetingUrl ?? null,
    zoom_meeting_id: null,
    zoom_start_url: null,
  });

  return NextResponse.json({ booking: updated });
}
