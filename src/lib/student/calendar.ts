/*
 * The student Calendar's rules (founder, 2026-11-07): booked sessions with move and cancel,
 * workshops and office hours, recordings, and a month grid. Pure, so the page, the client
 * pieces and the tests share one rule. Times are shown in the student's own time zone.
 */

export const DEFAULT_TIME_ZONE = "America/Chicago";
/** Moving or cancelling a 1:1 is free until this many hours before it starts. */
export const CHANGE_WINDOW_HOURS = 24;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export type BookedKind = "private" | "cohort";

export interface BookedSession {
  id: string;
  kind: BookedKind;
  title: string;
  start: string;
  end: string;
  tutorName: string | null;
  joinUrl: string | null;
  /** A 1:1 can move once, through the tutor's booking calendar. */
  canMove: boolean;
  /** Already moved once (the one free move is used). */
  moved: boolean;
  canCancel: boolean;
  /** Less than CHANGE_WINDOW_HOURS away: cancelling now uses up the session. */
  late: boolean;
  /** The tutor's booking calendar, for moving a 1:1 (eventTypeId null: not set up yet). */
  moveWith: { clerkId: string; name: string; eventTypeId: number | null } | null;
}

export type LiveEventKind = "workshop" | "office_hours";

export interface LiveEvent {
  id: string;
  kind: LiveEventKind;
  title: string;
  start: string;
  end: string;
  hostName: string | null;
  joinUrl: string | null;
  saved: boolean;
  full: boolean;
}

export interface Recording {
  id: string;
  title: string;
  start: string;
  minutes: number;
  url: string;
}

export type MarkKind = "session" | "event" | "test";

/** Join opens this many minutes before a session starts, and stays until it ends. */
export const JOIN_EARLY_MINUTES = 30;

/** Whether a session's Join button shows now (founder, 2026-11-08: join from the account). */
export function joinOpen(startIso: string, endIso: string, nowMs: number): boolean {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  return nowMs >= start - JOIN_EARLY_MINUTES * 60_000 && nowMs < end;
}

/** A valid IANA zone, or the default. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** A moment's calendar day (YYYY-MM-DD) in a time zone. */
export function dayIn(at: string | number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}

const addDays = (key: string, days: number) =>
  new Date(Date.parse(`${key}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const clock = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(
    new Date(iso)
  );

/** "Tue, Nov 3". */
export function dateText(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  }).format(new Date(iso));
}

/** "Today, 4:00 PM", "Tomorrow, 4:00 PM" or "Thu, Nov 12, 4:00 PM". */
export function whenText(iso: string, nowMs: number, tz: string): string {
  const day = dayIn(iso, tz);
  const today = dayIn(nowMs, tz);
  const time = clock(iso, tz);
  if (day === today) return `Today, ${time}`;
  if (day === addDays(today, 1)) return `Tomorrow, ${time}`;
  return `${dateText(iso, tz)}, ${time}`;
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000));
}

/** True when the session starts less than CHANGE_WINDOW_HOURS from now. */
export function insideChangeWindow(startIso: string, nowMs: number): boolean {
  return Date.parse(startIso) - nowMs < CHANGE_WINDOW_HOURS * HOUR_MS;
}

/** What to tell the student when moving or cancelling didn't go through. */
export function changeFailedMessage(action: "move" | "cancel", status: number | null): string {
  if (status === 409) return "This session changed a moment ago. Refresh the page to see it.";
  if (action === "move" && status === 403) {
    return "This session was already moved once. You can cancel it, or ask your tutor.";
  }
  return "Moving and cancelling aren’t available right now. Email your tutor and we’ll sort it out.";
}

export interface GridDay {
  day: number;
  key: string;
  isToday: boolean;
  marks: MarkKind[];
}

/** This month's grid: blank cells before the 1st (weeks start on Sunday), then each day. */
export function monthGrid(
  todayKey: string,
  marks: ReadonlyMap<string, ReadonlySet<MarkKind>>
): { label: string; lead: number; days: GridDay[] } {
  const [y, m] = todayKey.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const order: MarkKind[] = ["session", "event", "test"];
  const days: GridDay[] = Array.from({ length: count }, (_, i) => {
    const key = `${todayKey.slice(0, 8)}${String(i + 1).padStart(2, "0")}`;
    const set = marks.get(key);
    return {
      day: i + 1,
      key,
      isToday: key === todayKey,
      marks: set ? order.filter((k) => set.has(k)) : [],
    };
  });
  const label = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(first);
  return { label, lead: first.getUTCDay(), days };
}

/** Adds a mark to a day. */
export function mark(marks: Map<string, Set<MarkKind>>, key: string, kind: MarkKind): void {
  const set = marks.get(key) ?? new Set<MarkKind>();
  set.add(kind);
  marks.set(key, set);
}

/** Spoken summary of a day cell, for screen readers. */
export function dayLabel(d: GridDay, monthLabel: string): string {
  const month = monthLabel.split(" ")[0];
  const parts: string[] = [];
  if (d.marks.includes("session")) parts.push("a session");
  if (d.marks.includes("event")) parts.push("a workshop or office hours");
  if (d.marks.includes("test")) parts.push("a test due");
  const what = parts.length ? parts.join(", ") : "nothing booked";
  return `${month} ${d.day}${d.isToday ? ", today" : ""}: ${what}`;
}
