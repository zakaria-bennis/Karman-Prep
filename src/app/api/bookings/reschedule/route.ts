// ============================================================
// POST /api/bookings/reschedule
//
// Moves a booking to a new start time, by the student or their tutor.
//
// A student's move follows the Schedule's rules (src/lib/bookings/rules.ts):
//   · one move per session (the DB CHECK bookings_reschedule_cap, kept as
//     it is; it also stops "daisy chaining" a session along),
//   · three moves a month across all sessions, in the student's own month,
//   · with less than 24 hours' notice it spends the package's one free
//     late pass; with the pass spent it is refused (message the tutor),
//   · the new time inside the 24-hour to 4-week window, and Private 10's
//     one session a week.
// A move keeps the session's length (Cal keeps it), so hours do not change
// and tokens stay where they are.
//
// A tutor's move never costs the student: no rule, no pass, no move
// counted, and the session's own one move is left for the student.
//
// Cal.com makes a NEW booking (new uid, new Zoom meeting) on reschedule,
// so the row takes the new uid and the Zoom fields are refreshed.
// Every move is recorded in booking_changes.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  getActiveSubscription,
  getUserUuidByClerkId,
  updateBooking,
} from "@/lib/supabase/queries/bookings";
import {
  checkMove,
  isPack,
  refusal,
  zoneOr,
  type ChangeAllowed,
  type Pack,
} from "@/lib/bookings/rules";
import {
  dropLock,
  loadStudentBookings,
  othersOf,
  recordChange,
  takeLock,
} from "@/lib/bookings/state";
import { already, calSays, refuse, say, SAY } from "../replies";
import { rescheduleBookingBodySchema } from "../schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return say(401, SAY.signIn);

  const parsed = rescheduleBookingBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return say(400, SAY.body, { issues: parsed.error.issues });
  const body = parsed.data;

  const booking = await findBookingById(body.bookingId);
  if (!booking) return say(404, SAY.notFound);
  if (booking.status !== "scheduled") return already(booking.status);
  if (!booking.cal_booking_uid) return say(409, SAY.noCalendar);

  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid || (callerUuid !== booking.student_id && callerUuid !== booking.tutor_id)) {
    return say(403, SAY.forbidden);
  }
  const byTutor = callerUuid === booking.tutor_id;
  const db = createAdminClient() as unknown as SupabaseClient;
  const start = Date.parse(booking.scheduled_start);

  let pack: Pack | null = null;
  if (!byTutor) {
    // the Schedule is for Private sessions; anything else is moved by the tutor or the admin
    if (booking.plan_tier !== "private") return say(403, SAY.tutorOnly);
    const sub = await getActiveSubscription(userId);
    pack = sub && isPack(sub.planId) ? sub.planId : null;
    if (!pack) return refuse(refusal("plan"));
    const lock = await takeLock(db, booking.student_id);
    if (lock === "error") return say(500, SAY.broke);
    if (lock === "busy") return say(429, SAY.busy);
  }

  try {
    let verdict: ChangeAllowed;
    const now = Date.now();
    if (pack) {
      const state = await loadStudentBookings(
        db,
        { studentUuid: booking.student_id, clerkId: userId, pack },
        now
      );
      const answer = checkMove({
        pack,
        session: { start, moved: booking.reschedule_count >= 1 },
        to: Date.parse(body.newStart),
        now,
        zone: zoneOr(body.timeZone),
        byTutor: false,
        latePass: state.latePass,
        moves: state.moves,
        others: othersOf(state, booking.id),
      });
      if (!answer.ok) return refuse(answer);
      verdict = answer;
    } else {
      verdict = checkMove({
        pack: null,
        session: { start, moved: false },
        to: Date.parse(body.newStart),
        now,
        zone: zoneOr(body.timeZone),
        byTutor: true,
        latePass: false,
        moves: [],
        others: [],
      }) as ChangeAllowed;
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
      return calSays(err, "move");
    }

    // ─── Zoom: re-register the student on the NEW meeting ─────
    const calMeetingUrl = calResp.meetingUrl ?? null;
    const newZoomMeetingId = extractZoomMeetingId(calMeetingUrl);
    let newZoomJoinUrl: string | null = calMeetingUrl;
    if (newZoomMeetingId) {
      try {
        await enableMeetingRegistration(newZoomMeetingId);
        // the caller can be the tutor, so register against the student's own name and email
        const { data: student } = await db
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
      cal_booking_uid: calResp.uid || booking.cal_booking_uid,
      // the session's one move is the student's; a tutor's move leaves it
      reschedule_count: byTutor ? booking.reschedule_count : booking.reschedule_count + 1,
      cancelled_within_window: verdict.late,
      credit_forfeited: false,
      zoom_join_url: newZoomJoinUrl,
      zoom_meeting_id: newZoomMeetingId,
      zoom_start_url: null,
    });

    await recordChange(db, {
      bookingId: booking.id,
      studentId: booking.student_id,
      kind: "move",
      late: verdict.late,
      usedLatePass: verdict.usesPass,
      byTutor,
      fromStart: booking.scheduled_start,
      toStart: calResp.start,
      byUserId: callerUuid,
    });

    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error("[api/bookings/reschedule] failed:", err);
    return say(500, SAY.broke);
  } finally {
    if (pack) await dropLock(db, booking.student_id);
  }
}
