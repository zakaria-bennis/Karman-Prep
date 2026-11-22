/*
 * Schedule for a real Private student, in the shape the Schedule screen draws
 * (src/app/dev/shell/scheduleData.ts): their sessions from `bookings`, the hours of their package
 * plus any hours bought on the tab (`private_hour_purchases`), their tutor, and the tutor's booking
 * calendar so times can be booked through the existing endpoints (/api/availability and
 * /api/bookings/*, which go through Cal.com).
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarData } from "@/components/student-portal/calendar/load";
import type { StudentContext } from "@/lib/student/context";
import type { Account, Length, Pack, Session } from "@/app/dev/shell/scheduleData";
import { PRIVATE_PACKAGES } from "@/lib/marketing/offer";

export interface RealSchedule {
  account: Account;
  /** The student's tutor, and the Cal event type they are booked through (null until set up). */
  tutor: { name: string; clerkId: string; eventTypeId: number | null } | null;
  /** The SAT, as a time, when the student entered one. */
  satDay: number | null;
}

type BookingRow = {
  id: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  zoom_join_url: string | null;
  reschedule_count: number | null;
  rescheduled_at?: string | null;
  created_at: string;
};

const STATE: Record<string, Session["state"]> = {
  scheduled: "booked",
  completed: "done",
  no_show: "missed",
  cancelled: "canceled",
};

/** A session's length, as one of the three the Schedule knows. */
export const lengthOf = (minutes: number): Length =>
  minutes >= 105 ? 120 : minutes >= 75 ? 90 : 60;

export function sessionOf(b: BookingRow, nowMs: number): Session {
  const start = Date.parse(b.scheduled_start);
  const minutes = lengthOf((Date.parse(b.scheduled_end) - start) / 60_000);
  // a session left "scheduled" after it ended has been held: its hours are used
  const state =
    b.status === "scheduled" && start + minutes * 60_000 < nowMs
      ? "done"
      : (STATE[b.status] ?? "booked");
  return {
    id: b.id,
    start,
    minutes,
    focus: [],
    state,
    joinUrl: b.zoom_join_url ?? undefined,
  };
}

export async function loadSchedule(
  db: SupabaseClient,
  ctx: StudentContext,
  calendar: CalendarData | null,
  nowMs: number
): Promise<RealSchedule | null> {
  const pack: Pack | null =
    ctx.plan.id === "private-10" || ctx.plan.id === "private-20" ? ctx.plan.id : null;
  if (!pack) return null;
  const [bookings, purchases] = await Promise.all([
    db
      .from("bookings")
      .select(
        "id, status, scheduled_start, scheduled_end, zoom_join_url, reschedule_count, created_at"
      )
      .eq("student_id", ctx.userId)
      .gte("scheduled_start", new Date(nowMs - 200 * 86_400_000).toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(200)
      .then((r) => (r.data ?? []) as BookingRow[]),
    db
      .from("private_hour_purchases")
      .select("hours, created_at")
      .eq("user_id", ctx.userId)
      .limit(200)
      .then(
        (r) => (r.data ?? []) as { hours: number; created_at: string }[],
        () => []
      ),
  ]);
  const packHours = PRIVATE_PACKAGES.find((p) => p.id === pack)?.hours ?? 0;
  const sessions = bookings.map((b) => sessionOf(b, nowMs));
  const firstAt = [
    ...bookings.map((b) => Date.parse(b.created_at)),
    ...purchases.map((p) => Date.parse(p.created_at)),
  ].filter(Number.isFinite);
  const account: Account = {
    pack,
    bought: packHours + purchases.reduce((n, p) => n + p.hours, 0),
    boughtAt: firstAt.length ? Math.min(...firstAt) : nowMs,
    bonusMinutes: 0,
    // the one late pass and the moves a month are the Schedule's own rules; the booking endpoints
    // keep their own count (one move a booking), so nothing extra is recorded here yet
    latePass: true,
    moves: [],
    sessions,
  };
  const t = calendar?.tutor ?? null;
  return {
    account,
    tutor: t ? { name: t.name, clerkId: t.clerkId, eventTypeId: t.eventTypeId } : null,
    satDay: ctx.testDate ? Date.parse(`${ctx.testDate.slice(0, 10)}T12:00:00`) : null,
  };
}
