// ============================================================
// POST /api/attendance/override
//
// Tutor or admin manually marks a student as present (or absent)
// for a booking, bypassing Zoom's automatic attendance signals.
//
// Use cases:
//   · Zoom never fired a leave event before crashing → student
//     is technically "open" forever; tutor flips to present.
//   · Student joined from a different account / no email match;
//     attendance never landed; tutor saw them attend.
//   · Tutor needs to mark a no-show after a network glitch.
//
// Auth model:
//   · Tutor: must be the tutor on the booking
//   · Admin: full access
//   · Student: forbidden
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { applyAttendanceOverride } from "@/lib/supabase/queries/attendance";
import { findBookingById, getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { attendanceOverrideBodySchema } from "../schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await fetchUserRole(userId);
  if (role !== "tutor" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = attendanceOverrideBodySchema.safeParse(await req.json().catch(() => ({})));
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

  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  // Tutors may only override their own bookings; admins may override anything.
  if (role === "tutor" && callerUuid !== booking.tutor_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const studentUuid = await getUserUuidByClerkId(body.studentClerkId);
  if (!studentUuid) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }
  if (studentUuid !== booking.student_id) {
    // The student isn't tied to this booking. Only relevant for
    // group/small_group meetings where the booking_id and student_id
    // pair is the unique attendance row — so we still want to verify
    // there's a booking row for this (meeting, student) combination.
    // For now, reject: the API only supports overriding the booking's
    // own student. (Group attendance writes use the per-student
    // booking row created by the P8 push flow.)
    return NextResponse.json(
      { error: "Student is not the subject of this booking" },
      { status: 400 }
    );
  }

  const updated = await applyAttendanceOverride({
    bookingId: booking.id,
    studentId: studentUuid,
    zoomMeetingId: booking.zoom_meeting_id,
    overrideValue: body.overrideValue,
    overrideByUserId: callerUuid,
    reason: body.reason,
  });

  return NextResponse.json({ attendance: updated });
}
