// ============================================================
// POST /api/bookings/cancel
//
// Cancels a booking, by the student or their tutor.
//
// A student's cancel follows the Schedule's rules (src/lib/bookings/rules.ts):
//   · with more than 24 hours to go it is free and the hours go back,
//   · with less, it spends the package's one free late pass and the hours
//     still go back,
//   · with the pass spent it is refused: the session stays booked and
//     counts as used (the page tells the student to message the tutor,
//     who can still cancel it at no cost).
// A tutor's cancel never costs the student: the hours always go back.
// Every allowed cancel returns the session's token, if it holds one.
//
// Email is NOT sent here — fired by the Cal webhook handler when Cal
// echoes BOOKING_CANCELLED back; it reads this row's window and credit
// flags, so the email matches what was decided here.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelBooking, CalAdapterError } from "@/lib/integrations/cal";
import { createAdminClient } from "@/lib/supabase/server";
import {
  findBookingById,
  getActiveSubscription,
  getUserUuidByClerkId,
  updateBooking,
} from "@/lib/supabase/queries/bookings";
import { releaseTokenFromBooking } from "@/lib/supabase/queries/tokens";
import { checkCancel, isPack, refusal, type Pack } from "@/lib/bookings/rules";
import { dropLock, loadStudentBookings, recordChange, takeLock } from "@/lib/bookings/state";
import { already, calSays, refuse, say, SAY } from "../replies";
import { cancelBookingBodySchema } from "../schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return say(401, SAY.signIn);

  const parsed = cancelBookingBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return say(400, SAY.body, { issues: parsed.error.issues });
  const body = parsed.data;

  const booking = await findBookingById(body.bookingId);
  if (!booking) return say(404, SAY.notFound);
  if (booking.status !== "scheduled") return already(booking.status);

  // Ownership: only the student or tutor on the booking may cancel.
  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid || (callerUuid !== booking.student_id && callerUuid !== booking.tutor_id)) {
    return say(403, SAY.forbidden);
  }
  const byTutor = callerUuid === booking.tutor_id;
  const db = createAdminClient() as unknown as SupabaseClient;
  const start = Date.parse(booking.scheduled_start);

  let pack: Pack | null = null;
  if (!byTutor) {
    if (booking.plan_tier !== "private") return say(403, SAY.tutorOnly);
    const sub = await getActiveSubscription(userId);
    pack = sub && isPack(sub.planId) ? sub.planId : null;
    if (!pack) return refuse(refusal("plan"));
    const lock = await takeLock(db, booking.student_id);
    if (lock === "error") return say(500, SAY.broke);
    if (lock === "busy") return say(429, SAY.busy);
  }

  try {
    const now = Date.now();
    const latePass = pack
      ? (
          await loadStudentBookings(
            db,
            { studentUuid: booking.student_id, clerkId: userId, pack },
            now
          )
        ).latePass
      : false;
    const verdict = checkCancel({ start, now, byTutor, latePass });
    if (!verdict.ok) return refuse(verdict);

    // Cancel on Cal first, then update DB. If Cal fails, DB row
    // stays 'scheduled'. Cal's 400 "already cancelled" (cancelled out
    // of band) is the desired final state: let the DB catch up.
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
          return calSays(err, "cancel");
        }
        console.warn(
          `[api/bookings/cancel] booking ${booking.id} already cancelled on Cal — syncing DB`
        );
      }
    }

    const updated = await updateBooking(booking.id, {
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_within_window: verdict.late,
      credit_forfeited: false,
    });

    // The hours go back on every allowed cancel; so does the token, if any. Idempotent.
    try {
      await releaseTokenFromBooking(booking.id);
    } catch (err) {
      console.error("[api/bookings/cancel] token release failed:", err);
    }

    await recordChange(db, {
      bookingId: booking.id,
      studentId: booking.student_id,
      kind: "cancel",
      late: verdict.late,
      usedLatePass: verdict.usesPass,
      byTutor,
      fromStart: booking.scheduled_start,
      toStart: null,
      byUserId: callerUuid,
    });

    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error("[api/bookings/cancel] failed:", err);
    return say(500, SAY.broke);
  } finally {
    if (pack) await dropLock(db, booking.student_id);
  }
}
