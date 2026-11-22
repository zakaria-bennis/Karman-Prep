// What the booking rules (./rules.ts) need to know about one Private student, read from the
// database, and the record each change leaves. The booking endpoints and the Schedule tab
// (src/lib/portal/schedule.ts) read the same thing, so the page and the server count hours, moves
// and the late pass the same way.
//   Packages  the student's current Private plan grants (`plan_grants`): their hours, when the first
//             began (sessions count from then) and when the latest began (the late pass is one a
//             package). Without a grant (a test account) the plan's own package and no start.
//   Hours     every current package's hours plus the hours bought on the Schedule
//             (`private_hour_purchases`), less the sessions used or booked (`bookings`).
//   Changes   the moves and cancels already made (`booking_changes`).
// A source that cannot be read counts as empty, so a missing table never blocks a booking.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countedMoves,
  hoursLedger,
  latePassLeft,
  lengthOf,
  packHours,
  stateOfBooking,
  type Change,
  type Length,
  type Pack,
  type SessionState,
} from "./rules";

const DAY = 86_400_000;
/** How far back moves are read for the month's count: any zone's month has begun by then. */
const MOVES_BACK_DAYS = 40;
/** How far back sessions are read when no package start is known (hours last 12 months). */
const SESSIONS_BACK_DAYS = 400;

export interface BookingRecord {
  id: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  zoom_join_url: string | null;
  reschedule_count: number | null;
  credit_forfeited: boolean | null;
  created_at: string;
}

export interface LedgerSession {
  id: string;
  start: number;
  minutes: Length;
  state: SessionState;
  /** Moved once already: the bookings table allows one move a session. */
  moved: boolean;
}

export interface StudentBookings {
  pack: Pack;
  /** When the latest package began; null when unknown. */
  packageStart: number | null;
  /** When the first current package began; null when unknown. */
  firstStart: number | null;
  /** Hours bought in all: every current package, plus hours bought on the Schedule. */
  bought: number;
  bookings: BookingRecord[];
  sessions: LedgerSession[];
  changes: Change[];
  hours: ReturnType<typeof hoursLedger>;
  latePass: boolean;
  /** When the student's recent moves were made (the last forty days). */
  moves: number[];
}

type GrantRow = { plan_id: string; starts_at: string; expires_at: string | null };
type ChangeRow = {
  kind: "move" | "cancel";
  created_at: string;
  by_tutor: boolean;
  used_late_pass: boolean;
  pass_back_at: string | null;
};

const rows = <T>(r: { data: unknown; error: { message: string } | null }, what: string): T[] => {
  if (r.error) console.error(`[bookings] ${what} could not be read:`, r.error.message);
  return (r.data ?? []) as T[];
};

export const sessionFrom = (b: BookingRecord, now: number): LedgerSession => {
  const start = Date.parse(b.scheduled_start);
  const minutes = lengthOf((Date.parse(b.scheduled_end) - start) / 60_000);
  return {
    id: b.id,
    start,
    minutes,
    state: stateOfBooking(
      { status: b.status, start, minutes, creditForfeited: b.credit_forfeited === true },
      now
    ),
    moved: (b.reschedule_count ?? 0) >= 1,
  };
};

/** Everything the rules need about one student. `clerkId` finds their plan grants. */
export async function loadStudentBookings(
  db: SupabaseClient,
  who: { studentUuid: string; clerkId: string; pack: Pack },
  now: number
): Promise<StudentBookings> {
  const nowIso = new Date(now).toISOString();
  const grants = rows<GrantRow>(
    await db
      .from("plan_grants")
      .select("plan_id, starts_at, expires_at")
      .eq("user_id", who.clerkId)
      .in("plan_id", ["private-10", "private-20"])
      .is("revoked_at", null)
      .lte("starts_at", nowIso),
    "plan grants"
  ).filter((g) => g.expires_at === null || Date.parse(g.expires_at) > now);
  const starts = grants.map((g) => Date.parse(g.starts_at)).filter(Number.isFinite);
  const packageStart = starts.length ? Math.max(...starts) : null;
  const firstStart = starts.length ? Math.min(...starts) : null;
  const sessionsFrom = firstStart ?? now - SESSIONS_BACK_DAYS * DAY;
  const changesFrom = Math.min(packageStart ?? 0, now - MOVES_BACK_DAYS * DAY);

  const [bookings, purchases, changeRows] = await Promise.all([
    db
      .from("bookings")
      .select(
        "id, status, scheduled_start, scheduled_end, zoom_join_url, reschedule_count, credit_forfeited, created_at"
      )
      .eq("student_id", who.studentUuid)
      .eq("plan_tier", "private")
      .gte("scheduled_start", new Date(sessionsFrom).toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(300)
      .then((r) => rows<BookingRecord>(r, "bookings")),
    db
      .from("private_hour_purchases")
      .select("hours")
      .eq("user_id", who.studentUuid)
      .limit(200)
      .then((r) => rows<{ hours: number }>(r, "hour purchases")),
    db
      .from("booking_changes")
      .select("kind, created_at, by_tutor, used_late_pass, pass_back_at")
      .eq("student_id", who.studentUuid)
      .gte("created_at", new Date(changesFrom).toISOString())
      .order("created_at", { ascending: true })
      .limit(500)
      .then((r) => rows<ChangeRow>(r, "booking changes")),
  ]);

  const packagesHours = grants.length
    ? grants.reduce((n, g) => n + packHours(g.plan_id as Pack), 0)
    : packHours(who.pack);
  const bought = packagesHours + purchases.reduce((n, p) => n + (Number(p.hours) || 0), 0);
  const sessions = bookings.map((b) => sessionFrom(b, now));
  const changes: Change[] = changeRows.map((c) => ({
    kind: c.kind,
    at: Date.parse(c.created_at),
    byTutor: c.by_tutor,
    usedLatePass: c.used_late_pass,
    passBack: c.pass_back_at !== null,
  }));
  return {
    pack: who.pack,
    packageStart,
    firstStart,
    bought,
    bookings,
    sessions,
    changes,
    hours: hoursLedger({ bought, bonusMinutes: 0, sessions }),
    latePass: latePassLeft(changes, packageStart),
    moves: countedMoves(changes).filter((t) => t >= now - MOVES_BACK_DAYS * DAY),
  };
}

/** The student's sessions that are not canceled, other than `except` (for the weekly cap). */
export const othersOf = (state: StudentBookings, except?: string) =>
  state.sessions.filter((s) => s.state !== "canceled" && s.id !== except);

export interface NewChange {
  bookingId: string;
  studentId: string;
  kind: "move" | "cancel";
  late: boolean;
  usedLatePass: boolean;
  byTutor: boolean;
  fromStart: string | null;
  toStart: string | null;
  byUserId: string | null;
}

/** Records one move or cancel. The change itself has already been made, so a failure to record it
 *  is logged, not thrown. */
export async function recordChange(db: SupabaseClient, c: NewChange): Promise<void> {
  const { error } = await db.from("booking_changes").insert({
    booking_id: c.bookingId,
    student_id: c.studentId,
    kind: c.kind,
    late: c.late,
    used_late_pass: c.usedLatePass,
    by_tutor: c.byTutor,
    from_start: c.fromStart,
    to_start: c.toStart,
    by_user_id: c.byUserId,
  });
  if (error) console.error("[bookings] a change could not be recorded:", error.message);
}

/** How long a student's booking lock is held (users.booking_lock_until). It stops two changes at
 *  once from both passing the rules (a double press, two tabs), and runs out by itself. */
export const LOCK_MS = 10_000;

/** Takes the student's booking lock: "held", "busy" (another change holds it) or "error". */
export async function takeLock(
  db: SupabaseClient,
  studentUuid: string,
  now = Date.now()
): Promise<"held" | "busy" | "error"> {
  const { data, error } = await db
    .from("users")
    .update({ booking_lock_until: new Date(now + LOCK_MS).toISOString() })
    .eq("id", studentUuid)
    .or(`booking_lock_until.is.null,booking_lock_until.lt.${new Date(now).toISOString()}`)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[bookings] lock could not be taken:", error.message);
    return "error";
  }
  return data ? "held" : "busy";
}

export async function dropLock(db: SupabaseClient, studentUuid: string): Promise<void> {
  await db.from("users").update({ booking_lock_until: null }).eq("id", studentUuid);
}

/** The student's own tutor by Clerk id, with the booking calendar they bound; null when this is not
 *  the student's tutor (a session is always with the student's own tutor). */
export async function ownTutor(
  db: SupabaseClient,
  studentUuid: string,
  tutorClerkId: string
): Promise<{ uuid: string; eventTypeId: string | null } | null> {
  const { data: tutor } = await db
    .from("users")
    .select("id, cal_event_type_id")
    .eq("clerk_id", tutorClerkId)
    .maybeSingle();
  const row = tutor as { id: string; cal_event_type_id: string | number | null } | null;
  if (!row) return null;
  const { data: link } = await db
    .from("tutor_assignments")
    .select("tutor_user_id")
    .eq("student_user_id", studentUuid)
    .eq("tutor_user_id", row.id)
    .is("ended_at", null)
    .limit(1)
    .maybeSingle();
  if (!link) return null;
  return {
    uuid: row.id,
    eventTypeId: row.cal_event_type_id == null ? null : String(row.cal_event_type_id),
  };
}
