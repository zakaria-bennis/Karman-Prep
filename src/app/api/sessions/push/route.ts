// ============================================================
// POST /api/sessions/push
//
// Admin pushes a single seminar / small-group session to every
// active member of a cohort. Creates one bookings row per member
// (so attendance + cancellation track per-student even though
// the underlying Zoom meeting is shared) and sends a confirmation
// email + .ics to each student + their linked parents.
//
// Why per-student rows: the locked tier model says cancellation
// is per-student (one student dropping out doesn't cancel the
// session for the rest), and attendance_logs is keyed
// (booking_id, student_id) — so each attendee needs their own
// booking.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  insertBooking,
  type BookingPlanTier,
  type BookingRow,
} from "@/lib/supabase/queries/bookings";
import { sendBookingConfirmation } from "@/lib/integrations/resend/booking-emails";
import { extractZoomMeetingId } from "@/lib/integrations/zoom/url";

interface PushRequest {
  cohortId: string;
  sessionStart: string; // ISO start
  sessionEnd: string;   // ISO end
  zoomMeetingId?: string;
  zoomJoinUrl: string;
  zoomStartUrl?: string;
  /** IANA timezone used for the email date/time formatting. */
  timeZone?: string;
}

const EMAIL_BATCH_SIZE = 50;

interface CohortRow {
  id: string;
  tier: BookingPlanTier;
  tutor_user_id: string;
}

interface UserMini {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

function fullName(u: UserMini): string {
  return [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await fetchUserRole(userId);
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Partial<PushRequest>;
  try {
    body = (await req.json()) as Partial<PushRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.cohortId || !body.sessionStart || !body.sessionEnd || !body.zoomJoinUrl) {
    return NextResponse.json(
      { error: "Missing cohortId, sessionStart, sessionEnd, or zoomJoinUrl" },
      { status: 400 }
    );
  }

  const supa = createAdminClient();

  const { data: cohort, error: cErr } = await supa
    .from("cohorts")
    .select("id, tier, tutor_user_id")
    .eq("id", body.cohortId)
    .maybeSingle();
  if (cErr) {
    console.error("[sessions/push] cohort lookup error:", cErr);
    return NextResponse.json({ error: "Cohort lookup failed" }, { status: 500 });
  }
  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }

  const c = cohort as CohortRow;
  if (c.tier !== "group" && c.tier !== "small_group") {
    // Defensive — cohorts.tier CHECK already restricts, but the
    // bookings.plan_tier column also restricts to the four delivery
    // tiers. private/elite shouldn't be pushed via this route.
    return NextResponse.json(
      { error: `Cohort tier '${c.tier}' is not pushable — use self-booking instead` },
      { status: 400 }
    );
  }

  const { data: members, error: mErr } = await supa
    .from("cohort_members")
    .select("user_id")
    .eq("cohort_id", c.id)
    .is("left_at", null);
  if (mErr) {
    console.error("[sessions/push] members lookup error:", mErr);
    return NextResponse.json({ error: "Cohort members lookup failed" }, { status: 500 });
  }

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  if (memberIds.length === 0) {
    return NextResponse.json({ pushed: 0, emailsQueued: 0, note: "Cohort has no active members" });
  }

  const { data: tutorRow, error: tErr } = await supa
    .from("users")
    .select("id, email, first_name, last_name")
    .eq("id", c.tutor_user_id)
    .maybeSingle();
  if (tErr || !tutorRow) {
    console.error("[sessions/push] tutor lookup error:", tErr);
    return NextResponse.json({ error: "Tutor lookup failed" }, { status: 500 });
  }
  const tutor = tutorRow as UserMini;
  const tutorName = fullName(tutor);

  const { data: studentRows, error: sErr } = await supa
    .from("users")
    .select("id, email, first_name, last_name")
    .in("id", memberIds);
  if (sErr) {
    console.error("[sessions/push] student lookup error:", sErr);
    return NextResponse.json({ error: "Student lookup failed" }, { status: 500 });
  }
  const studentsById = new Map<string, UserMini>();
  for (const s of (studentRows ?? []) as UserMini[]) studentsById.set(s.id, s);

  const { data: parentLinks } = await supa
    .from("parent_student_links")
    .select("parent_user_id, student_user_id")
    .in("student_user_id", memberIds);

  const parentIdsByStudent = new Map<string, string[]>();
  const allParentIds: Set<string> = new Set();
  for (const link of (parentLinks ?? []) as Array<{
    parent_user_id: string;
    student_user_id: string;
  }>) {
    const list = parentIdsByStudent.get(link.student_user_id) ?? [];
    list.push(link.parent_user_id);
    parentIdsByStudent.set(link.student_user_id, list);
    allParentIds.add(link.parent_user_id);
  }
  const parentEmailById = new Map<string, string>();
  if (allParentIds.size > 0) {
    const { data: parentRows } = await supa
      .from("users")
      .select("id, email")
      .in("id", Array.from(allParentIds));
    for (const p of (parentRows ?? []) as Array<{ id: string; email: string }>) {
      if (p.email) parentEmailById.set(p.id, p.email);
    }
  }

  const zoomMeetingId =
    body.zoomMeetingId ?? extractZoomMeetingId(body.zoomJoinUrl) ?? null;

  // Insert one booking per member.
  const inserted: BookingRow[] = [];
  for (const studentId of memberIds) {
    if (!studentsById.has(studentId)) continue;
    try {
      const row = await insertBooking({
        student_id: studentId,
        tutor_id: c.tutor_user_id,
        plan_tier: c.tier,
        cal_booking_uid: null, // admin-pushed, no Cal record
        cal_event_type_id: null,
        zoom_meeting_id: zoomMeetingId,
        zoom_join_url: body.zoomJoinUrl,
        zoom_start_url: body.zoomStartUrl ?? null,
        scheduled_start: body.sessionStart,
        scheduled_end: body.sessionEnd,
      });
      inserted.push(row);
    } catch (err) {
      console.error(`[sessions/push] insert failed for student=${studentId}:`, err);
    }
  }

  // Send emails in batches of EMAIL_BATCH_SIZE.
  const tz = body.timeZone ?? "America/New_York";
  const start = new Date(body.sessionStart);
  const end = new Date(body.sessionEnd);
  let emailsQueued = 0;
  let emailsFailed = 0;

  for (let i = 0; i < inserted.length; i += EMAIL_BATCH_SIZE) {
    const chunk = inserted.slice(i, i + EMAIL_BATCH_SIZE);
    const results = await Promise.allSettled(
      chunk.map(async (booking) => {
        const student = studentsById.get(booking.student_id);
        if (!student) return;
        const parentIds = parentIdsByStudent.get(booking.student_id) ?? [];
        const parentEmails = parentIds
          .map((id) => parentEmailById.get(id))
          .filter((e): e is string => !!e);

        await sendBookingConfirmation({
          uid: booking.id, // no cal_booking_uid for pushed sessions; use our id
          studentEmail: student.email,
          studentFirstName: student.first_name || "there",
          studentFullName: fullName(student),
          parentEmails,
          tutorName,
          start,
          end,
          meetingUrl: body.zoomJoinUrl,
          timeZone: tz,
        });
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") emailsQueued += 1;
      else {
        emailsFailed += 1;
        console.error("[sessions/push] email send failed:", r.reason);
      }
    }
  }

  return NextResponse.json({
    pushed: inserted.length,
    membersTotal: memberIds.length,
    emailsQueued,
    emailsFailed,
  });
}
