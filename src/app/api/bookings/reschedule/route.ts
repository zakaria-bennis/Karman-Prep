// ============================================================
// POST /api/bookings/reschedule
//
// Moves a booking to a new start time. Hard cap: one reschedule
// per booking (DB CHECK enforces; route returns a clean 403 first).
//
// Token semantics (anti-abuse fix #1):
//   · Outside-24h reschedule  → free, token stays attached.
//   · Within-24h reschedule   → original token is consumed
//     (forfeited_within_window) and a new token is reserved for
//     the rescheduled session. Cost = 1 credit, equivalent to
//     a within-24h cancel + immediate rebook.
//   · If the student doesn't have a replacement token available,
//     the within-24h reschedule is REJECTED with 403 — they must
//     either cancel (forfeit one credit) or wait for a free
//     reschedule window.
//
// This closes the loophole where a student could escape attendance
// by rescheduling within 24h (no penalty) then cancelling outside
// the new 24h window (refund) — net zero token cost.
//
// Cal.com generates a NEW Zoom meeting on reschedule, so we wipe
// zoom_meeting_id / zoom_start_url and refresh zoom_join_url from
// the response. The Zoom webhook (P5) will refill the IDs.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rescheduleBooking, CalAdapterError } from "@/lib/integrations/cal";
import {
  enableMeetingRegistration,
  extractZoomMeetingId,
  registerAttendee,
  ZoomAdapterError,
} from "@/lib/integrations/zoom";
import { createAdminClient } from "@/lib/supabase/server";
import {
  findBookingById,
  getUserUuidByClerkId,
  isWithinCancellationWindow,
  shouldForfeitCredit,
  updateBooking,
} from "@/lib/supabase/queries/bookings";
import {
  assignTokenToBooking,
  consumeTokenForBooking,
  getAvailableTokenCount,
} from "@/lib/supabase/queries/tokens";
import { rescheduleBookingBodySchema } from "../schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = rescheduleBookingBodySchema.safeParse(await req.json().catch(() => ({})));
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
  if (!callerUuid || (callerUuid !== booking.student_id && callerUuid !== booking.tutor_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const withinWindow = isWithinCancellationWindow(booking.scheduled_start);
  const forfeit = shouldForfeitCredit(booking.plan_tier, withinWindow);

  // Within-window reschedule with credit at stake: must have a
  // replacement token available before we burn the original.
  if (withinWindow && forfeit) {
    const replacementCount = await getAvailableTokenCount(booking.student_id);
    if (replacementCount < 1) {
      return NextResponse.json(
        {
          error:
            "Rescheduling within 24 hours costs your current session credit. You'd need another available credit to lock in the new time, but your bank is empty. Cancel the session instead, or reschedule before the 24-hour window opens.",
        },
        { status: 403 }
      );
    }
  }

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
    return NextResponse.json({ error: "Failed to reschedule on Cal.com" }, { status: 502 });
  }

  // ─── Zoom: re-register the student on the NEW meeting ─────
  // Cal generates a fresh Zoom meeting on reschedule, so the prior
  // unique URL is dead. Same flow as create: enable registration,
  // register the student, save the unique URL.
  const calMeetingUrl = calResp.meetingUrl ?? null;
  const newZoomMeetingId = extractZoomMeetingId(calMeetingUrl);
  let newZoomJoinUrl: string | null = calMeetingUrl;
  if (newZoomMeetingId) {
    try {
      await enableMeetingRegistration(newZoomMeetingId);
      // Re-fetch the student row to register against their real email/name,
      // since the caller can be the tutor (not the student).
      const supa = createAdminClient();
      const { data: student } = await supa
        .from("users")
        .select("first_name, last_name, email")
        .eq("id", booking.student_id)
        .maybeSingle();
      if (student?.email) {
        const reg = await registerAttendee({
          meetingId: newZoomMeetingId,
          firstName: student.first_name || "Karman",
          lastName: student.last_name || "",
          email: student.email,
        });
        newZoomJoinUrl = reg.join_url;
      }
    } catch (zoomErr) {
      const isAdapter = zoomErr instanceof ZoomAdapterError;
      console.error(
        "[api/bookings/reschedule] zoom re-registration failed (falling back to Cal URL):",
        isAdapter ? zoomErr.toString() : zoomErr
      );
    }
  }

  const updated = await updateBooking(booking.id, {
    rescheduled_from: booking.scheduled_start,
    scheduled_start: calResp.start,
    scheduled_end: calResp.end,
    reschedule_count: booking.reschedule_count + 1,
    cancelled_within_window: withinWindow,
    credit_forfeited: forfeit,
    zoom_join_url: newZoomJoinUrl,
    zoom_meeting_id: newZoomMeetingId,
    zoom_start_url: null,
  });

  // Token transition for within-window reschedules: consume the
  // original (forfeited), then reserve a replacement for the new
  // booking row. The unique index on (assigned_booking_id) WHERE
  // active permits a fresh active token alongside the now-consumed
  // one on the same booking_id.
  if (withinWindow && forfeit) {
    try {
      await consumeTokenForBooking({
        bookingId: booking.id,
        reason: "forfeited_within_window",
      });
      await assignTokenToBooking({
        userUuid: booking.student_id,
        bookingId: booking.id,
      });
    } catch (err) {
      console.error("[api/bookings/reschedule] token transition failed:", err);
    }
  }

  return NextResponse.json({ booking: updated });
}
