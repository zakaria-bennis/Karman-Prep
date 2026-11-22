// ============================================================
// POST /api/bookings/create
//
// Self-booking for Private 10 and Private 20 students. Flow:
//   1. Clerk auth → 401
//   2. Plan gate: only Private 10/20 self-book, else 403
//   3. The tutor must be the student's own, on the calendar they bound
//   4. Per-student lock and the 24-hour rate limit
//   5. The Schedule's rules (src/lib/bookings/rules.ts): the length the
//      package allows (Private 10: 60 only and one a week; Private 20:
//      60, 90 or 120), the 24-hour to 4-week window, and enough hours
//      left (package + hours bought, less used and booked)
//   6. createBooking() on Cal.com with the length (single point of contact)
//   7. Persist the booking row to Supabase
//
// Tokens (src/lib/supabase/queries/tokens.ts) are the old one-credit-
// per-session model: nothing mints them for Private packages, and a
// booking can hold only one (unique index tokens_one_active_per_booking,
// which an additive migration cannot change), so they cannot count 90
// and 120 minute sessions. Hours are counted from the ledger instead; a
// free token, if the student has one, is still attached so the paths
// that consume or release it stay consistent.
//
// Every refusal is one short plain sentence in `error`.
// Email is NOT sent here — that's the Cal webhook's job.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createBooking, CalAdapterError } from "@/lib/integrations/cal";
import {
  enableMeetingRegistration,
  extractZoomMeetingId,
  registerAttendee,
  ZoomAdapterError,
} from "@/lib/integrations/zoom";
import { createAdminClient } from "@/lib/supabase/server";
import {
  canSelfBook,
  getActiveSubscription,
  getUserUuidByClerkId,
  insertBooking,
} from "@/lib/supabase/queries/bookings";
import { assignTokenToBooking } from "@/lib/supabase/queries/tokens";
import { BOOKING, checkBook, isPack, lengthOf, refusal, zoneOr } from "@/lib/bookings/rules";
import { dropLock, loadStudentBookings, othersOf, ownTutor, takeLock } from "@/lib/bookings/state";
import { calSays, refuse, say, SAY } from "../replies";
import { createBookingBodySchema } from "../schemas";

/** Anti-abuse fix #4: cap booking creates per student per 24h.
 *  Cancelled-outside-window bookings still count — prevents the
 *  book/cancel/book/cancel infrastructure-spam pattern. */
const MAX_BOOKINGS_PER_24H = 10;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return say(401, SAY.signIn);

  const sub = await getActiveSubscription(userId);
  const pack = sub && canSelfBook(sub.tier) && isPack(sub.planId) ? sub.planId : null;
  if (!pack) return refuse(refusal("plan"));

  const parsed = createBookingBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return say(400, SAY.body, { issues: parsed.error.issues });
  const body = parsed.data;
  const minutes = body.minutes ?? BOOKING.plainMinutes;

  const studentUuid = await getUserUuidByClerkId(userId);
  if (!studentUuid) return say(404, SAY.account);

  const db = createAdminClient() as unknown as SupabaseClient;
  const tutor = await ownTutor(db, studentUuid, body.tutorClerkId);
  if (!tutor) return say(403, "Sessions are booked with your own tutor.");
  if (tutor.eventTypeId !== String(body.eventTypeId))
    return say(409, "Your tutor's booking calendar has changed. Please reload the page.");

  // Per-user mutex: two booking attempts at once cannot both pass the rules.
  const lock = await takeLock(db, studentUuid);
  if (lock === "error") return say(500, SAY.broke);
  if (lock === "busy") return say(429, SAY.busy);

  // Everything below this line must release the lock on the way out.
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: countErr } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentUuid)
      .gte("created_at", since24h);
    if (countErr) console.error("[api/bookings/create] rate-limit count error:", countErr);
    if ((recentCount ?? 0) >= MAX_BOOKINGS_PER_24H) {
      return say(429, "That is a lot of bookings for one day. Please try again tomorrow.");
    }

    // The Schedule's rules, on the same ledger the page shows.
    const now = Date.now();
    const state = await loadStudentBookings(db, { studentUuid, clerkId: userId, pack }, now);
    const verdict = checkBook({
      pack,
      minutes,
      start: Date.parse(body.start),
      now,
      zone: zoneOr(body.timeZone),
      left: state.hours.left,
      others: othersOf(state),
    });
    if (!verdict.ok) return refuse(verdict);

    const clerkUser = await currentUser();
    const attendeeName =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || "Karman Student";
    const attendeeEmail = clerkUser?.emailAddresses[0]?.emailAddress;
    if (!attendeeEmail) {
      return say(400, "Your account has no email address. Add one in Settings, then try again.");
    }

    // Cal.com call. The tutor's event type books 60 minutes by itself; a longer session asks
    // for its length, which Cal takes only if the event type offers it.
    let calResp;
    try {
      calResp = await createBooking({
        eventTypeId: body.eventTypeId,
        start: body.start,
        ...(minutes !== BOOKING.plainMinutes ? { lengthInMinutes: minutes } : {}),
        attendee: {
          name: attendeeName,
          email: attendeeEmail,
          timeZone: body.timeZone,
          language: "en",
        },
        metadata: {
          student_id: userId,
          plan_tier: "private",
        },
      });
    } catch (err) {
      const isAdapter = err instanceof CalAdapterError;
      console.error("[api/bookings/create] cal error:", isAdapter ? err.toString() : err);
      return calSays(err, "book", minutes);
    }
    const booked = lengthOf((Date.parse(calResp.end) - Date.parse(calResp.start)) / 60_000);
    if (booked !== minutes)
      console.warn(
        `[api/bookings/create] asked for ${minutes} minutes, the calendar booked ${booked}`
      );

    // ─── Zoom: layer single-use unique-per-attendee join URL ──
    // Falls back to Cal's standard join URL if any Zoom step errors.
    const calMeetingUrl = calResp.meetingUrl ?? null;
    const zoomMeetingId = extractZoomMeetingId(calMeetingUrl);
    let zoomJoinUrl: string | null = calMeetingUrl;
    if (zoomMeetingId) {
      try {
        await enableMeetingRegistration(zoomMeetingId);
        const reg = await registerAttendee({
          meetingId: zoomMeetingId,
          firstName: clerkUser?.firstName ?? attendeeName.split(" ")[0] ?? "Karman",
          lastName: clerkUser?.lastName ?? "",
          email: attendeeEmail,
        });
        zoomJoinUrl = reg.join_url;
      } catch (zoomErr) {
        const isAdapter = zoomErr instanceof ZoomAdapterError;
        console.error(
          "[api/bookings/create] zoom registration failed (falling back to Cal URL):",
          isAdapter ? zoomErr.toString() : zoomErr
        );
      }
    }

    let row;
    try {
      row = await insertBooking({
        student_id: studentUuid,
        tutor_id: tutor.uuid,
        plan_tier: "private",
        cal_booking_uid: calResp.uid,
        cal_event_type_id: calResp.eventTypeId,
        zoom_join_url: zoomJoinUrl,
        zoom_meeting_id: zoomMeetingId,
        zoom_start_url: null,
        scheduled_start: calResp.start,
        scheduled_end: calResp.end,
      });
    } catch (err) {
      console.error("[api/bookings/create] supabase persist failed:", err);
      return say(500, "Your session was booked but not saved here. Please message us.", {
        calBookingUid: calResp.uid,
      });
    }

    // A legacy token, if the student has a free one (see the note at the top).
    try {
      await assignTokenToBooking({ userUuid: studentUuid, bookingId: row.id });
    } catch (err) {
      console.error("[api/bookings/create] token assignment failed:", err);
    }

    return NextResponse.json({ booking: row }, { status: 201 });
  } catch (err) {
    console.error("[api/bookings/create] failed:", err);
    return say(500, SAY.broke);
  } finally {
    await dropLock(db, studentUuid);
  }
}
