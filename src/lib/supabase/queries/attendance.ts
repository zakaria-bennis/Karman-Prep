// ============================================================
// attendance_logs queries — driven by the Zoom webhook.
//
// Two-phase model:
//   1. participant_joined → append join timestamp to join_events
//   2. participant_left   → match most-recent unmatched join,
//                           compute interval seconds, add to
//                           total_duration_seconds, append leave
//   3. meeting.ended      → close any still-open joins using
//                           end_time, then finalize each
//                           booking's status to 'completed' or
//                           'no_show' based on is_present.
//
// Idempotency:
//   · Duplicate participant_joined events are no-ops while a
//     prior unmatched join exists for the same student.
//   · participant_left without a matching join is logged + skipped.
//   · meeting.ended is safe to receive multiple times — closing
//     already-balanced (joins == leaves) logs is a no-op.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import { consumeTokensForBookings } from "./tokens";

export interface AttendanceLogRow {
  id: string;
  booking_id: string;
  student_id: string;
  zoom_meeting_id: string;
  total_duration_seconds: number;
  join_events: string[];
  leave_events: string[];
  is_present: boolean;
  overridden_present: boolean | null;
  manually_overridden: boolean;
  override_by: string | null;
  override_at: string | null;
  override_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface BookingForMeeting {
  id: string;
  student_id: string;
  status: string;
  zoom_meeting_id: string | null;
}

/** All bookings tied to a Zoom meeting id. Group sessions return
 *  many; private/elite return one. */
export async function findBookingsByZoomMeetingId(
  zoomMeetingId: string
): Promise<BookingForMeeting[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, student_id, status, zoom_meeting_id")
    .eq("zoom_meeting_id", zoomMeetingId);
  if (error) throw error;
  return (data as BookingForMeeting[] | null) ?? [];
}

/** Resolve which booking a participant join/leave applies to.
 *
 *  Resolution order:
 *    1. Single-booking meeting (private/elite) → return the only
 *       booking regardless of email. The Zoom participant has to
 *       be the student; there's no ambiguity.
 *    2. Multi-booking meeting (group/small_group) → match by email
 *       (case-insensitive). This is the happy path when students
 *       join Zoom from the same email they used to sign up.
 *    3. **Fallback**: if email doesn't match, try a fuzzy match
 *       against the cohort roster by participant display name —
 *       "first last" or "last, first" against students.first_name +
 *       last_name. Resolves the audit-flagged case where a student
 *       joins from a school account or family Zoom account with a
 *       different email but the right display name. Only returns
 *       if EXACTLY ONE student in the cohort matches; ambiguous
 *       matches stay unrecorded so an admin can manually override.
 *
 *  Audit #11 — previously this returned null on any email mismatch
 *  for cohort meetings, silently dropping legitimate joins.
 */
export async function findBookingForParticipant(
  zoomMeetingId: string,
  participantEmail: string | undefined,
  participantName?: string
): Promise<{ bookingId: string; studentId: string; matchedBy: string } | null> {
  const supabase = createAdminClient();

  const bookings = await findBookingsByZoomMeetingId(zoomMeetingId);
  if (bookings.length === 0) return null;

  if (bookings.length === 1) {
    return {
      bookingId: bookings[0].id,
      studentId: bookings[0].student_id,
      matchedBy: "single-booking",
    };
  }

  const studentIds = bookings.map((b) => b.student_id);
  const { data: students, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name")
    .in("id", studentIds);
  if (error) throw error;
  const roster = (students ?? []) as Array<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  }>;

  // Match #1: email.
  if (participantEmail) {
    const byEmail = roster.find(
      (s) => (s.email ?? "").toLowerCase() === participantEmail.toLowerCase()
    );
    if (byEmail) {
      const b = bookings.find((bk) => bk.student_id === byEmail.id);
      if (b) return { bookingId: b.id, studentId: byEmail.id, matchedBy: "email" };
    }
  }

  // Match #2: display name. Tries "first last" + "last first" + the
  // raw concatenation so common Zoom display formats all resolve.
  if (participantName) {
    const candidate = nameMatchOrNull(participantName, roster);
    if (candidate) {
      const b = bookings.find((bk) => bk.student_id === candidate.id);
      if (b) return { bookingId: b.id, studentId: candidate.id, matchedBy: "name" };
    }
  }

  return null;
}

/** Normalize a display name string and try to match it against the
 *  roster. Returns the matching row only if EXACTLY ONE roster
 *  entry has the same normalized "first last" (or its reverse) —
 *  ambiguous matches return null so we don't risk attributing
 *  attendance to the wrong student.
 *
 *  Exported for testing — kept private to this module otherwise. */
export function nameMatchOrNull(
  rawName: string,
  roster: Array<{ id: string; first_name: string | null; last_name: string | null }>
): { id: string } | null {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "") // drop punctuation
      .replace(/\s+/g, " ")
      .trim();
  const candidate = normalize(rawName);
  if (!candidate) return null;

  const matches = roster.filter((s) => {
    const first = normalize(s.first_name ?? "");
    const last = normalize(s.last_name ?? "");
    if (!first && !last) return false;
    const forward = [first, last].filter(Boolean).join(" ").trim();
    const reverse = [last, first].filter(Boolean).join(" ").trim();
    return candidate === forward || candidate === reverse;
  });
  if (matches.length === 1) return matches[0];
  return null;
}

async function fetchAttendanceLog(
  bookingId: string,
  studentId: string
): Promise<AttendanceLogRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("attendance_logs")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return (data as AttendanceLogRow | null) ?? null;
}

/** Append a join timestamp. No-op if there's already an unmatched
 *  prior join (Zoom sometimes fires duplicates). */
export async function recordParticipantJoin(args: {
  bookingId: string;
  studentId: string;
  zoomMeetingId: string;
  joinTime: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const existing = await fetchAttendanceLog(args.bookingId, args.studentId);

  if (!existing) {
    const { error } = await supabase.from("attendance_logs").insert({
      booking_id: args.bookingId,
      student_id: args.studentId,
      zoom_meeting_id: args.zoomMeetingId,
      join_events: [args.joinTime],
      leave_events: [],
      total_duration_seconds: 0,
    });
    if (error) throw error;
    return;
  }

  if (existing.join_events.length > existing.leave_events.length) {
    // Unmatched prior join — duplicate event, ignore.
    return;
  }

  const { error } = await supabase
    .from("attendance_logs")
    .update({ join_events: [...existing.join_events, args.joinTime] })
    .eq("id", existing.id);
  if (error) throw error;
}

/** Match the most recent unmatched join, add the interval to
 *  total_duration_seconds, append leave timestamp. */
export async function recordParticipantLeave(args: {
  bookingId: string;
  studentId: string;
  leaveTime: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const existing = await fetchAttendanceLog(args.bookingId, args.studentId);
  if (!existing) {
    console.warn(
      `[attendance] leave without log: booking=${args.bookingId} student=${args.studentId}`
    );
    return;
  }
  if (existing.join_events.length <= existing.leave_events.length) {
    console.warn(
      `[attendance] leave without unmatched join: booking=${args.bookingId} student=${args.studentId}`
    );
    return;
  }

  const unmatchedJoinTime = existing.join_events[existing.join_events.length - 1];
  const intervalSeconds = Math.max(
    0,
    Math.floor((new Date(args.leaveTime).getTime() - new Date(unmatchedJoinTime).getTime()) / 1000)
  );

  const { error } = await supabase
    .from("attendance_logs")
    .update({
      leave_events: [...existing.leave_events, args.leaveTime],
      total_duration_seconds: existing.total_duration_seconds + intervalSeconds,
    })
    .eq("id", existing.id);
  if (error) throw error;
}

/** Tutor/admin manual attendance override. Creates a stub
 *  attendance_log row if one doesn't exist yet (e.g., Zoom never
 *  fired events but the tutor saw the student attend). */
export async function applyAttendanceOverride(args: {
  bookingId: string;
  studentId: string;
  zoomMeetingId: string | null;
  overrideValue: boolean;
  overrideByUserId: string;
  reason: string;
}): Promise<AttendanceLogRow> {
  const supabase = createAdminClient();
  const existing = await fetchAttendanceLog(args.bookingId, args.studentId);

  const fields = {
    manually_overridden: true,
    overridden_present: args.overrideValue,
    override_by: args.overrideByUserId,
    override_at: new Date().toISOString(),
    override_reason: args.reason,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("attendance_logs")
      .update(fields)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as AttendanceLogRow;
  }

  // No log yet — create the row with override applied. zoom_meeting_id
  // is required by the schema, so fall back to a placeholder if absent
  // (tutor override against a booking that never got a Zoom meeting).
  const { data, error } = await supabase
    .from("attendance_logs")
    .insert({
      booking_id: args.bookingId,
      student_id: args.studentId,
      zoom_meeting_id: args.zoomMeetingId ?? "",
      join_events: [],
      leave_events: [],
      total_duration_seconds: 0,
      ...fields,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AttendanceLogRow;
}

/** On meeting.ended:
 *   1. For every attendance_log with an open join, close it using endTime.
 *   2. For every booking on this meeting, set status:
 *        'completed' if the student met the threshold (or override says so)
 *        'no_show'   otherwise
 *      Skips bookings whose status is already terminal. */
export async function finalizeAttendanceForMeeting(args: {
  zoomMeetingId: string;
  endTime: string;
}): Promise<void> {
  const supabase = createAdminClient();

  const { data: logs, error: logsErr } = await supabase
    .from("attendance_logs")
    .select("*")
    .eq("zoom_meeting_id", args.zoomMeetingId);
  if (logsErr) throw logsErr;

  // ── Phase 1: close open joins ─────────────────────────────
  // Each row needs its own UPDATE (the new leave_events array and
  // total_duration_seconds are per-row), but the rows are
  // independent so we fire them in parallel rather than serially.
  // Was N sequential round-trips; now ~1 wall-clock latency unit.
  const endTimeMs = new Date(args.endTime).getTime();
  await Promise.all(
    ((logs as AttendanceLogRow[] | null) ?? [])
      .filter((raw) => raw.join_events.length > raw.leave_events.length)
      .map(async (raw) => {
        const unmatched = raw.join_events[raw.join_events.length - 1];
        const interval = Math.max(
          0,
          Math.floor((endTimeMs - new Date(unmatched).getTime()) / 1000)
        );
        if (interval === 0) return;
        const { error } = await supabase
          .from("attendance_logs")
          .update({
            leave_events: [...raw.leave_events, args.endTime],
            total_duration_seconds: raw.total_duration_seconds + interval,
          })
          .eq("id", raw.id);
        if (error) throw error;
      })
  );

  // ── Phase 2: refetch (so is_present reflects new totals) ──
  const { data: refreshed, error: refreshErr } = await supabase
    .from("attendance_logs")
    .select("booking_id, is_present, manually_overridden, overridden_present")
    .eq("zoom_meeting_id", args.zoomMeetingId);
  if (refreshErr) throw refreshErr;

  const presentByBooking = new Map<string, boolean>();
  for (const r of (refreshed ?? []) as Array<{
    booking_id: string;
    is_present: boolean;
    manually_overridden: boolean;
    overridden_present: boolean | null;
  }>) {
    const present =
      r.manually_overridden && r.overridden_present !== null
        ? !!r.overridden_present
        : !!r.is_present;
    presentByBooking.set(r.booking_id, (presentByBooking.get(r.booking_id) ?? false) || present);
  }

  // ── Phase 3a: no attendance at all → mark every scheduled
  // booking as no_show in a single bulk update. ─────────────
  if (presentByBooking.size === 0) {
    const bookings = await findBookingsByZoomMeetingId(args.zoomMeetingId);
    const scheduledIds = bookings.filter((b) => b.status === "scheduled").map((b) => b.id);
    if (scheduledIds.length === 0) return;
    const { error } = await supabase
      .from("bookings")
      .update({ status: "no_show" })
      .in("id", scheduledIds);
    if (error) throw error;
    await consumeTokensForBookings(scheduledIds, "no_show");
    return;
  }

  // ── Phase 3b: split bookings into completed vs no_show by
  // attendance, then fire two bulk updates + two bulk token
  // consumptions in parallel. ───────────────────────────────
  // Single round-trip to read all booking statuses (was N).
  const allIds = Array.from(presentByBooking.keys());
  const { data: bookingRows, error: bErr } = await supabase
    .from("bookings")
    .select("id, status")
    .in("id", allIds);
  if (bErr) throw bErr;
  const scheduled = new Set(
    ((bookingRows as Array<{ id: string; status: string }> | null) ?? [])
      .filter((b) => b.status === "scheduled")
      .map((b) => b.id)
  );

  const completedIds: string[] = [];
  const noShowIds: string[] = [];
  for (const [bookingId, present] of presentByBooking.entries()) {
    if (!scheduled.has(bookingId)) continue;
    (present ? completedIds : noShowIds).push(bookingId);
  }

  await Promise.all([
    completedIds.length > 0
      ? supabase
          .from("bookings")
          .update({ status: "completed" })
          .in("id", completedIds)
          .then(({ error }) => {
            if (error) throw error;
          })
      : Promise.resolve(),
    noShowIds.length > 0
      ? supabase
          .from("bookings")
          .update({ status: "no_show" })
          .in("id", noShowIds)
          .then(({ error }) => {
            if (error) throw error;
          })
      : Promise.resolve(),
    consumeTokensForBookings(completedIds, "completed"),
    consumeTokensForBookings(noShowIds, "no_show"),
  ]);
}
