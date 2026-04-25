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
import { createBooking, CalAdapterError } from "@/lib/cal";
import {
  canSelfBook,
  getActiveSubscription,
  getUserUuidByClerkId,
  insertBooking,
} from "@/lib/supabase/queries/bookings";

interface CreateBookingRequest {
  eventTypeId: number | string;
  tutorClerkId: string;
  start: string;     // ISO datetime of the chosen slot
  timeZone: string;  // student's IANA TZ (e.g. America/New_York)
}

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

  const clerkUser = await currentUser();
  const attendeeName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    "Strata Student";
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

  // Persist. zoom_meeting_id + zoom_start_url stay null until the
  // Zoom webhook fires (P5) — meetingUrl from Cal is the join URL.
  try {
    const row = await insertBooking({
      student_id: studentUuid,
      tutor_id: tutorUuid,
      plan_tier: sub.tier,
      cal_booking_uid: calResp.uid,
      cal_event_type_id: calResp.eventTypeId,
      zoom_join_url: calResp.meetingUrl ?? null,
      zoom_meeting_id: null,
      zoom_start_url: null,
      scheduled_start: calResp.start,
      scheduled_end: calResp.end,
    });
    return NextResponse.json({ booking: row }, { status: 201 });
  } catch (err) {
    // Booking exists on Cal but persistence failed — surface 500 so
    // the caller knows the DB is out of sync. The webhook BOOKING_CREATED
    // (P4) will reconcile by inserting the row when Cal echoes the event.
    console.error("[api/bookings/create] supabase persist failed:", err);
    return NextResponse.json(
      { error: "Booking created on Cal.com but failed to persist locally", calBookingUid: calResp.uid },
      { status: 500 }
    );
  }
}
