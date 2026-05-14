// ============================================================
// POST /api/bookings/create
//
// Self-booking entry point for Private + Elite students.
// Flow:
//   1. Clerk auth → 401
//   2. Plan tier gate — group/small_group rejected with 403
//   3. Resolve student + tutor UUIDs from Clerk ids
//   4. createBooking() on Cal.com (single point of contact)
//   5. Persist resulting booking row to Supabase
//   6. Return the booking row to the frontend
//
// Email is NOT sent here — that's the Cal webhook's job in P4.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
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
import {
  assignTokenToBooking,
  ensureEliteMonthlyTokens,
  getAvailableTokenCount,
} from "@/lib/supabase/queries/tokens";

interface CreateBookingRequest {
  eventTypeId: number | string;
  tutorClerkId: string;
  start: string;     // ISO datetime of the chosen slot
  timeZone: string;  // student's IANA TZ (e.g. America/New_York)
}

/** How long /api/bookings/create holds a per-user mutex. Anti-abuse
 *  fix #3+#7: prevents the double-tap / multi-tab race where two
 *  simultaneous booking attempts both pass the tokens-available
 *  check. Auto-expires on crash. */
const BOOKING_LOCK_MS = 10_000;

/** Anti-abuse fix #4: cap booking creates per student per 24h.
 *  Cancelled-outside-window bookings still count — prevents the
 *  book/cancel/book/cancel infrastructure-spam pattern. */
const MAX_BOOKINGS_PER_24H = 10;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getActiveSubscription(userId);
  if (!sub) {
    return NextResponse.json({ error: "No active subscription" }, { status: 403 });
  }
  if (!canSelfBook(sub.tier)) {
    return NextResponse.json(
      { error: "Plan not eligible for self-booking" },
      { status: 403 }
    );
  }

  let body: Partial<CreateBookingRequest>;
  try {
    body = (await req.json()) as Partial<CreateBookingRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.eventTypeId || !body.tutorClerkId || !body.start || !body.timeZone) {
    return NextResponse.json(
      { error: "Missing eventTypeId, tutorClerkId, start, or timeZone" },
      { status: 400 }
    );
  }

  const studentUuid = await getUserUuidByClerkId(userId);
  if (!studentUuid) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }
  const tutorUuid = await getUserUuidByClerkId(body.tutorClerkId);
  if (!tutorUuid) {
    return NextResponse.json({ error: "Tutor profile not found" }, { status: 404 });
  }

  // ─── Anti-abuse fix #3+#7: per-user mutex ──────────────────
  // Compare-and-set the lock atomically. If we can't acquire
  // (lock is held and not yet expired), 429 the second request.
  const supa = createAdminClient();
  const nowIso = new Date().toISOString();
  const lockUntilIso = new Date(Date.now() + BOOKING_LOCK_MS).toISOString();
  const { data: lockGrant, error: lockErr } = await supa
    .from("users")
    .update({ booking_lock_until: lockUntilIso })
    .eq("id", studentUuid)
    .or(`booking_lock_until.is.null,booking_lock_until.lt.${nowIso}`)
    .select("id")
    .maybeSingle();
  if (lockErr) {
    console.error("[api/bookings/create] lock acquire error:", lockErr);
    return NextResponse.json({ error: "Internal error acquiring booking lock" }, { status: 500 });
  }
  if (!lockGrant) {
    return NextResponse.json(
      { error: "Another booking is already in progress for this account, please wait a few seconds." },
      { status: 429 }
    );
  }

  // Everything below this line must release the lock on the way out.
  try {
    // ─── Anti-abuse fix #4: 24h booking-create rate limit ────
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: countErr } = await supa
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentUuid)
      .gte("created_at", since24h);
    if (countErr) {
      console.error("[api/bookings/create] rate-limit count error:", countErr);
    }
    if ((recentCount ?? 0) >= MAX_BOOKINGS_PER_24H) {
      return NextResponse.json(
        {
          error: `You've made ${recentCount} bookings in the last 24 hours. Please try again later.`,
        },
        { status: 429 }
      );
    }

    // Token check — fail fast if the student has nothing to spend.
    // For Elite, lazy-grant the current month's batch on first hit.
    if (sub.tier === "elite") {
      await ensureEliteMonthlyTokens(studentUuid);
    }
    const tokensAvailable = await getAvailableTokenCount(studentUuid);
    if (tokensAvailable < 1) {
      return NextResponse.json(
        {
          error:
            sub.tier === "elite"
              ? "No session credits remaining this month."
              : "No session credits available — purchase a session to book.",
        },
        { status: 403 }
      );
    }

    const clerkUser = await currentUser();
    const attendeeName =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
      "Karman Student";
    const attendeeEmail = clerkUser?.emailAddresses[0]?.emailAddress;
    if (!attendeeEmail) {
      return NextResponse.json(
        { error: "Student email missing in Clerk profile" },
        { status: 400 }
      );
    }

    // Cal.com call — single point of contact, may throw CalAdapterError.
    let calResp;
    try {
      calResp = await createBooking({
        eventTypeId: body.eventTypeId,
        start: body.start,
        attendee: {
          name: attendeeName,
          email: attendeeEmail,
          timeZone: body.timeZone,
          language: "en",
        },
        metadata: {
          student_id: userId,
          plan_tier: sub.tier,
        },
      });
    } catch (err) {
      const isAdapter = err instanceof CalAdapterError;
      console.error("[api/bookings/create] cal error:", isAdapter ? err.toString() : err);
      return NextResponse.json(
        { error: "Failed to create booking on Cal.com" },
        { status: 502 }
      );
    }

    // ─── Zoom: layer single-use unique-per-attendee join URL ──
    // Cal created the meeting on our Zoom account. We immediately
    // (a) flip the meeting to require registration, then (b) register
    // the student → Zoom returns a join URL unique to that registrant.
    // The URL embeds a tk= token; reusing it from a different account
    // is rejected by Zoom.
    //
    // Falls back to Cal's standard join URL if any Zoom step errors.
    // The booking still succeeds; the student gets a non-unique link.
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

    // Persist. zoom_meeting_id is now set (Cal's response had it);
    // zoom_start_url stays null until the Zoom webhook (P5) brings it.
    let row;
    try {
      row = await insertBooking({
        student_id: studentUuid,
        tutor_id: tutorUuid,
        plan_tier: sub.tier,
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
      return NextResponse.json(
        { error: "Booking created on Cal.com but failed to persist locally", calBookingUid: calResp.uid },
        { status: 500 }
      );
    }

    // Reserve a token for this booking. The mutex above means no other
    // concurrent attempt could have grabbed one in between.
    try {
      const tokenId = await assignTokenToBooking({
        userUuid: studentUuid,
        bookingId: row.id,
      });
      if (!tokenId) {
        console.error(
          `[api/bookings/create] race: no tokens available at assign time for booking=${row.id}`
        );
      }
    } catch (err) {
      console.error("[api/bookings/create] token assignment failed:", err);
    }

    return NextResponse.json({ booking: row }, { status: 201 });
  } finally {
    // Release the mutex regardless of outcome.
    await supa
      .from("users")
      .update({ booking_lock_until: null })
      .eq("id", studentUuid);
  }
}
