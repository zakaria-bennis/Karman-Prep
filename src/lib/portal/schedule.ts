/*
 * Schedule for a real Private student, in the shape the Schedule screen draws
 * (src/app/dashboard/student/_portal/scheduleData.ts): their sessions from `bookings`, the hours of
 * their packages plus any hours bought on the tab, the late pass and this month's moves from
 * `booking_changes`, their tutor, and the tutor's booking calendar so times can be booked through
 * the existing endpoints (/api/availability and /api/bookings/*, which go through Cal.com). It reads
 * the same record the booking endpoints check (src/lib/bookings/state.ts), so the page and the
 * server agree on hours, moves and the late pass.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarData } from "@/components/student-portal/calendar/load";
import type { StudentContext } from "@/lib/student/context";
import type { Account, Session } from "@/app/dashboard/student/_portal/scheduleData";
import { isPack } from "@/lib/bookings/rules";
import { loadStudentBookings, sessionFrom, type BookingRecord } from "@/lib/bookings/state";

export interface RealSchedule {
  account: Account;
  /** The student's tutor, and the Cal event type they are booked through (null until set up). */
  tutor: { name: string; clerkId: string; eventTypeId: number | null } | null;
  /** The SAT, as a time, when the student entered one. */
  satDay: number | null;
}

export function sessionOf(b: BookingRecord, nowMs: number): Session {
  const s = sessionFrom(b, nowMs);
  return {
    id: s.id,
    start: s.start,
    minutes: s.minutes,
    focus: [],
    state: s.state,
    joinUrl: b.zoom_join_url ?? undefined,
    moved: s.moved,
  };
}

export async function loadSchedule(
  db: SupabaseClient,
  ctx: StudentContext,
  calendar: CalendarData | null,
  nowMs: number
): Promise<RealSchedule | null> {
  const pack = isPack(ctx.plan.id) ? ctx.plan.id : null;
  if (!pack) return null;
  const mine = await loadStudentBookings(
    db,
    { studentUuid: ctx.userId, clerkId: ctx.clerkId, pack },
    nowMs
  );
  const account: Account = {
    pack,
    bought: mine.bought,
    // the package's purchase date; unknown (and "Use by" hidden) without one
    boughtAt: mine.firstStart,
    bonusMinutes: 0,
    latePass: mine.latePass,
    moves: mine.moves,
    sessions: mine.bookings.map((b) => sessionOf(b, nowMs)),
  };
  const t = calendar?.tutor ?? null;
  return {
    account,
    tutor: t ? { name: t.name, clerkId: t.clerkId, eventTypeId: t.eventTypeId } : null,
    satDay: ctx.testDate ? Date.parse(`${ctx.testDate.slice(0, 10)}T12:00:00`) : null,
  };
}
