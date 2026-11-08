/*
 * Reads everything the student Calendar shows: booked 1:1s (`bookings`), cohort classes
 * (`sessions` of the student's cohorts), workshops and office hours (`live_events` and the
 * student's `live_event_rsvps`), recordings, and test due dates for the month grid.
 * A source that fails to load (a table not on this database yet) shows as empty.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  markAdminAlerted,
  shouldAlertAdminAboutMissingSetup,
} from "@/lib/supabase/queries/cal-oauth";
import { createAdminClient } from "@/lib/supabase/server";
import {
  dayIn,
  insideChangeWindow,
  mark,
  minutesBetween,
  safeTimeZone,
  type BookedSession,
  type LiveEvent,
  type MarkKind,
  type Recording,
} from "@/lib/student/calendar";
import type { StudentContext } from "@/lib/student/context";
import { canUse } from "@/lib/student/plan-gate";

export interface BookingTutor {
  uuid: string;
  clerkId: string;
  name: string;
  /** The Cal event type the tutor bound on /tutor/settings/booking, or null. */
  eventTypeId: number | null;
  calConnected: boolean;
}

export interface CalendarData {
  timeZone: string;
  booked: BookedSession[];
  events: LiveEvent[];
  recordings: Recording[];
  marks: Map<string, Set<MarkKind>>;
  /** The tutor a 1:1 student books with, when the plan has 1:1s. */
  tutor: BookingTutor | null;
}

type Db = ReturnType<typeof createAdminClient>;
type NameRow = {
  id: string;
  clerk_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  cal_event_type_id: number | string | null;
};

const fullName = (u: NameRow | undefined) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email : null;
const firstName = (u: NameRow | undefined) => (u ? u.first_name || fullName(u) : null);
const moveWith = (u: NameRow | undefined): BookedSession["moveWith"] =>
  u
    ? {
        clerkId: u.clerk_id,
        name: firstName(u) ?? "your tutor",
        eventTypeId: u.cal_event_type_id === null ? null : Number(u.cal_event_type_id),
      }
    : null;

async function namesById(db: Db, ids: (string | null)[]): Promise<Map<string, NameRow>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (!unique.length) return new Map();
  const { data } = await db
    .from("users")
    .select("id, clerk_id, first_name, last_name, email, cal_event_type_id")
    .in("id", unique);
  return new Map(((data ?? []) as NameRow[]).map((u) => [u.id, u]));
}

/** Best-effort: tell the team when a student can't book because their tutor hasn't set up Cal.
 *  Deduped per tutor for 24 hours. Never blocks the page; no-ops without an admin email. */
async function alertMissingTutorSetup(tutor: BookingTutor, studentName: string | null) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;
  try {
    if (!(await shouldAlertAdminAboutMissingSetup(tutor.uuid))) return;
    // Loaded here, not at the top: the email client throws on import when email is switched off.
    const { resend, FROM } = await import("@/lib/integrations/resend/client");
    const headline = tutor.calConnected
      ? `${tutor.name} hasn't picked their Karman event type yet`
      : `${tutor.name} hasn't connected Cal yet`;
    const next = tutor.calConnected
      ? "Ask them to visit /tutor/settings/booking and pick their event type from the dropdown."
      : 'Ask them to visit /tutor/settings/booking and click "Connect Cal.com".';
    await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `[Karman] Tutor setup needed: ${tutor.name}`,
      html: `<div style="font-family: sans-serif; max-width: 560px; margin: auto; padding: 24px;">
        <h2>${headline}</h2>
        <p>A student${studentName ? ` (${studentName})` : ""} tried to book a session, but their
        tutor hasn't finished setting up their Cal.com link in Karman.</p>
        <p><strong>Next step:</strong> ${next}</p>
        <p style="color: #777; font-size: 12px;">One of these per tutor every 24 hours.</p></div>`,
    });
    await markAdminAlerted(tutor.uuid);
  } catch (err) {
    console.warn("[student calendar] admin alert email failed (non-fatal):", err);
  }
}

async function loadTutor(db: Db, userId: string): Promise<BookingTutor | null> {
  const { data } = await db
    .from("tutor_assignments")
    .select("tutor_user_id")
    .eq("student_user_id", userId)
    .is("ended_at", null)
    .limit(1)
    .maybeSingle();
  const tutorId = (data as { tutor_user_id?: string } | null)?.tutor_user_id;
  if (!tutorId) return null;
  const { data: t } = await db
    .from("users")
    .select("id, clerk_id, first_name, last_name, email, cal_event_type_id, cal_connected_at")
    .eq("id", tutorId)
    .maybeSingle();
  const row = t as
    | (NameRow & {
        clerk_id: string;
        cal_event_type_id: number | string | null;
        cal_connected_at: string | null;
      })
    | null;
  if (!row) return null;
  return {
    uuid: row.id,
    clerkId: row.clerk_id,
    name: fullName(row) ?? "your tutor",
    eventTypeId: row.cal_event_type_id === null ? null : Number(row.cal_event_type_id),
    calConnected: !!row.cal_connected_at,
  };
}

export async function loadCalendar(ctx: StudentContext, nowMs = Date.now()): Promise<CalendarData> {
  const db = createAdminClient();
  // live_events, live_event_rsvps, tutor_homework and student_assignments are newer than the
  // generated database types, so they are read through an untyped client.
  const loose = db as unknown as SupabaseClient;
  const nowIso = new Date(nowMs).toISOString();
  // A session stays listed until it has been running for two hours.
  const listedFrom = new Date(nowMs - 2 * 3_600_000).toISOString();

  const [{ data: me }, { data: memberships }] = await Promise.all([
    db.from("users").select("time_zone").eq("id", ctx.userId).maybeSingle(),
    db.from("cohort_members").select("cohort_id").eq("user_id", ctx.userId).is("left_at", null),
  ]);
  const timeZone = safeTimeZone((me as { time_zone?: string | null } | null)?.time_zone);
  const cohortIds = ((memberships ?? []) as { cohort_id: string }[]).map((m) => m.cohort_id);

  const [bookings, classes, pastClasses, upcomingEvents, pastEvents, trials, tutorTests] =
    await Promise.all([
      db
        .from("bookings")
        .select(
          "id, tutor_id, plan_tier, scheduled_start, scheduled_end, zoom_join_url, reschedule_count"
        )
        .eq("student_id", ctx.userId)
        .eq("status", "scheduled")
        .gte("scheduled_start", listedFrom)
        .order("scheduled_start", { ascending: true })
        .limit(20),
      cohortIds.length
        ? db
            .from("sessions")
            .select("id, tutor_id, scheduled_start, scheduled_end, zoom_join_url")
            .in("cohort_id", cohortIds)
            .eq("status", "scheduled")
            .gte("scheduled_start", listedFrom)
            .order("scheduled_start", { ascending: true })
            .limit(20)
        : Promise.resolve({ data: [] }),
      cohortIds.length
        ? db
            .from("sessions")
            .select("id, scheduled_start, scheduled_end, zoom_recording_url")
            .in("cohort_id", cohortIds)
            .lt("scheduled_start", nowIso)
            .not("zoom_recording_url", "is", null)
            .order("scheduled_start", { ascending: false })
            .limit(6)
        : Promise.resolve({ data: [] }),
      loose
        .from("live_events")
        .select("id, kind, title, host_user_id, starts_at, ends_at, join_url, capacity")
        .is("cancelled_at", null)
        .gte("ends_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(8),
      loose
        .from("live_events")
        .select("id, title, starts_at, ends_at, recording_url")
        .lt("starts_at", nowIso)
        .not("recording_url", "is", null)
        .order("starts_at", { ascending: false })
        .limit(6),
      loose
        .from("student_assignments")
        .select("scheduled_for")
        .eq("student_id", ctx.clerkId)
        .eq("kind", "full_length")
        .is("completed_at", null),
      loose
        .from("tutor_homework")
        .select("due_on")
        .eq("student_user_id", ctx.userId)
        .eq("kind", "full_length_test")
        .eq("status", "assigned"),
    ]);

  type BookingRow = {
    id: string;
    tutor_id: string;
    plan_tier: string;
    scheduled_start: string;
    scheduled_end: string;
    zoom_join_url: string | null;
    reschedule_count: number;
  };
  type ClassRow = {
    id: string;
    tutor_id: string;
    scheduled_start: string;
    scheduled_end: string;
    zoom_join_url: string | null;
  };
  type EventRow = {
    id: string;
    kind: "workshop" | "office_hours";
    title: string;
    host_user_id: string | null;
    starts_at: string;
    ends_at: string;
    join_url: string | null;
    capacity: number | null;
  };
  const bookingRows = (bookings.data ?? []) as BookingRow[];
  const classRows = (classes.data ?? []) as ClassRow[];
  const eventRows = upcomingEvents.error ? [] : ((upcomingEvents.data ?? []) as EventRow[]);
  if (upcomingEvents.error) console.warn("[student calendar] live events unavailable");

  const names = await namesById(db, [
    ...bookingRows.map((b) => b.tutor_id),
    ...classRows.map((c) => c.tutor_id),
    ...eventRows.map((e) => e.host_user_id),
  ]);

  // Spots this student saved, and which capped events are already full.
  const eventIds = eventRows.map((e) => e.id);
  const capped = eventRows.filter((e) => e.capacity !== null).map((e) => e.id);
  const [mine, cappedRsvps] = await Promise.all([
    eventIds.length
      ? loose
          .from("live_event_rsvps")
          .select("event_id")
          .eq("user_id", ctx.userId)
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    capped.length
      ? loose.from("live_event_rsvps").select("event_id").in("event_id", capped)
      : Promise.resolve({ data: [] }),
  ]);
  const saved = new Set(((mine.data ?? []) as { event_id: string }[]).map((r) => r.event_id));
  const taken = new Map<string, number>();
  for (const r of (cappedRsvps.data ?? []) as { event_id: string }[]) {
    taken.set(r.event_id, (taken.get(r.event_id) ?? 0) + 1);
  }

  const booked: BookedSession[] = [
    ...bookingRows.map((b) => {
      const oneToOne = b.plan_tier === "private" || b.plan_tier === "elite";
      const started = Date.parse(b.scheduled_start) <= nowMs;
      return {
        id: b.id,
        kind: "private" as const,
        title: oneToOne ? "1:1 session" : "Group session",
        start: b.scheduled_start,
        end: b.scheduled_end,
        tutorName: firstName(names.get(b.tutor_id)),
        joinUrl: b.zoom_join_url,
        canMove: oneToOne && !started && b.reschedule_count < 1,
        moved: b.reschedule_count >= 1,
        canCancel: !started,
        late: insideChangeWindow(b.scheduled_start, nowMs),
        moveWith: moveWith(names.get(b.tutor_id)),
      };
    }),
    ...classRows.map((c) => ({
      id: c.id,
      kind: "cohort" as const,
      title: "Live class",
      start: c.scheduled_start,
      end: c.scheduled_end,
      tutorName: firstName(names.get(c.tutor_id)),
      joinUrl: c.zoom_join_url,
      canMove: false,
      moved: false,
      canCancel: false,
      late: insideChangeWindow(c.scheduled_start, nowMs),
      moveWith: null,
    })),
  ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  const events: LiveEvent[] = eventRows.map((e) => ({
    id: e.id,
    kind: e.kind,
    title: e.title,
    start: e.starts_at,
    end: e.ends_at,
    hostName: firstName(names.get(e.host_user_id ?? "")),
    joinUrl: e.join_url,
    saved: saved.has(e.id),
    full: e.capacity !== null && (taken.get(e.id) ?? 0) >= e.capacity && !saved.has(e.id),
  }));

  type PastClass = {
    id: string;
    scheduled_start: string;
    scheduled_end: string;
    zoom_recording_url: string;
  };
  type PastEvent = {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    recording_url: string;
  };
  const recordings: Recording[] = [
    ...((pastClasses.data ?? []) as PastClass[]).map((s) => ({
      id: s.id,
      title: "Live class",
      start: s.scheduled_start,
      minutes: minutesBetween(s.scheduled_start, s.scheduled_end),
      url: s.zoom_recording_url,
    })),
    ...(pastEvents.error ? [] : ((pastEvents.data ?? []) as PastEvent[])).map((e) => ({
      id: e.id,
      title: e.title,
      start: e.starts_at,
      minutes: minutesBetween(e.starts_at, e.ends_at),
      url: e.recording_url,
    })),
  ]
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start))
    .slice(0, 5);

  const marks = new Map<string, Set<MarkKind>>();
  for (const s of booked) mark(marks, dayIn(s.start, timeZone), "session");
  for (const e of events) mark(marks, dayIn(e.start, timeZone), "event");
  for (const t of (trials.data ?? []) as { scheduled_for: string }[]) {
    mark(marks, t.scheduled_for, "test");
  }
  if (!tutorTests.error) {
    for (const t of (tutorTests.data ?? []) as { due_on: string }[]) mark(marks, t.due_on, "test");
  }

  let tutor: BookingTutor | null = null;
  if (canUse(ctx.plan, "live:private")) {
    tutor = await loadTutor(db, ctx.userId);
    if (tutor && tutor.eventTypeId === null && !ctx.isImpersonating) {
      await alertMissingTutorSetup(tutor, ctx.firstName);
    }
  }

  return { timeZone, booked, events, recordings, marks, tutor };
}
