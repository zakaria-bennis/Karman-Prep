// The rules every Private booking follows (founder, 2026-11-16 and 2026-11-17; his answers are in the
// project's notes). One pure module: the booking endpoints (src/app/api/bookings/*) enforce it and the
// Schedule tab (src/app/dashboard/student/_portal/scheduleData.ts) shows it, so the two agree.
//   Lengths  60, 90 or 120 minutes. Private 10 books 60 only and one session a week (offer.ts,
//            `weeklyCap`), so 60 minutes a week; Private 20 books any length, with no weekly cap.
//   Hours    Counted in hours, not sessions: a session uses its length (1, 1.5 or 2 hours) out of
//            the package's hours plus any bought on the Schedule. Used and booked hours both count.
//   Window   From 24 hours to 4 weeks ahead.
//   Moves    Three a month across all of a student's sessions, counted in the student's own month
//            by when each move was made. One move per session (the bookings table's own cap, which
//            also stops a session being moved again and again: "daisy chaining").
//   Late     With less than 24 hours' notice (`GUARANTEE.private.cancelHours`) a move or a cancel
//            spends the package's one free late pass. Once it is spent, a late move or cancel is
//            refused: the session stays booked and counts as used. The tutor can give the pass back.
//   Tutor    A move or a cancel the tutor makes never costs the student anything.
import { GUARANTEE, PRIVATE_PACKAGES } from "@/lib/marketing/offer";

export type Pack = (typeof PRIVATE_PACKAGES)[number]["id"];
export type Length = 60 | 90 | 120;
export const LENGTHS: readonly Length[] = [60, 90, 120];

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const BOOKING = {
  noticeHours: GUARANTEE.private.cancelHours,
  aheadDays: 28,
  movesAMonth: 3,
  /** The length the tutor's calendar books when it is given none (real sessions so far). */
  plainMinutes: 60,
  /** Clocks and the trip to the server: a change this close to an edge goes the student's way. */
  graceMinutes: 2,
} as const;

export const isPack = (value: unknown): value is Pack =>
  PRIVATE_PACKAGES.some((pkg) => pkg.id === value);
export const packHours = (pack: Pack): number =>
  PRIVATE_PACKAGES.find((pkg) => pkg.id === pack)!.hours;
/** Sessions a week the package allows, or null for no cap. */
export const weeklyCap = (pack: Pack): number | null => GUARANTEE.private.packages[pack].weeklyCap;
/** Private 10 has 60 minutes a week, so it books 60 only; Private 20 chooses. */
export const lengthsFor = (pack: Pack): readonly Length[] =>
  pack === "private-10" ? [60] : LENGTHS;
export const isLength = (minutes: unknown): minutes is Length =>
  minutes === 60 || minutes === 90 || minutes === 120;
/** A stored session's length as one of the three. */
export const lengthOf = (minutes: number): Length =>
  minutes >= 105 ? 120 : minutes >= 75 ? 90 : 60;

// ---- hours ----

export type SessionState = "booked" | "done" | "missed" | "canceled";

/** Hours bought, used, booked and left. `bonusMinutes` come on top (a session the tutor missed). */
export function hoursLedger(account: {
  bought: number;
  bonusMinutes: number;
  sessions: readonly { minutes: number; state: SessionState }[];
}) {
  const sum = (states: SessionState[]) =>
    account.sessions
      .filter((s) => states.includes(s.state))
      .reduce((n, s) => n + s.minutes / 60, 0);
  const total = account.bought + account.bonusMinutes / 60;
  const used = sum(["done", "missed"]);
  const booked = sum(["booked"]);
  return { total, used, booked, left: Math.max(0, total - used - booked) };
}

/** A bookings row as the hours count it. A session still "scheduled" after its end was held (its
 *  hours are used); a canceled one whose credit was forfeited counts as used too. */
export function stateOfBooking(
  booking: { status: string; start: number; minutes: number; creditForfeited: boolean },
  now: number
): SessionState {
  switch (booking.status) {
    case "completed":
      return "done";
    case "no_show":
      return "missed";
    case "cancelled":
      return booking.creditForfeited ? "missed" : "canceled";
    default:
      return booking.start + booking.minutes * MIN < now ? "done" : "booked";
  }
}

// ---- the student's own calendar ----

/** Central: the tutor's clock, and the zone used when a student's own is not known. */
export const FALLBACK_ZONE = "America/Chicago";
const formats = new Map<string, Intl.DateTimeFormat>();
function formatIn(zone: string): Intl.DateTimeFormat {
  let format = formats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
    formats.set(zone, format);
  }
  return format;
}
/** A time zone that works, or Central. */
export function zoneOr(zone: string | null | undefined): string {
  if (!zone) return FALLBACK_ZONE;
  try {
    formatIn(zone);
    return zone;
  } catch {
    return FALLBACK_ZONE;
  }
}
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dateIn(t: number, zone: string) {
  const part: Record<string, string> = {};
  for (const { type, value } of formatIn(zone).formatToParts(t)) part[type] = value;
  return {
    year: Number(part.year),
    month: Number(part.month),
    day: Number(part.day),
    weekday: WEEKDAYS.indexOf(part.weekday),
  };
}
/** The calendar month a moment falls in, on a time zone's clock: "2026-11". */
export function monthIn(t: number, zone: string): string {
  const d = dateIn(t, zone);
  return `${d.year}-${String(d.month).padStart(2, "0")}`;
}
/** The Sunday that begins a moment's week (weeks run Sunday to Saturday), on a zone's clock. */
export function weekIn(t: number, zone: string): string {
  const d = dateIn(t, zone);
  return new Date(Date.UTC(d.year, d.month - 1, d.day - d.weekday)).toISOString().slice(0, 10);
}

// ---- moves and the late pass ----

/** A recorded move or cancel (`booking_changes`), as the rules read it. */
export interface Change {
  kind: "move" | "cancel";
  /** When it was made. */
  at: number;
  /** The tutor made it: it never counts against the student. */
  byTutor: boolean;
  usedLatePass: boolean;
  /** The tutor gave the pass back. */
  passBack: boolean;
}

/** When each move that counts against the student was made (theirs, not the tutor's). */
export const countedMoves = (changes: readonly Change[]): number[] =>
  changes.filter((c) => c.kind === "move" && !c.byTutor).map((c) => c.at);

/** Moves left this month: three a month, counted in the student's own month by when each was made. */
export function movesLeftIn(moves: readonly number[], now: number, zone: string): number {
  const month = monthIn(now, zone);
  return Math.max(0, BOOKING.movesAMonth - moves.filter((t) => monthIn(t, zone) === month).length);
}

/** Whether the package's one free late pass is still there: not spent since the package began, or
 *  given back by the tutor. With no known start, every change counts. */
export const latePassLeft = (changes: readonly Change[], packageStart: number | null): boolean =>
  !changes.some(
    (c) =>
      c.usedLatePass && !c.passBack && !c.byTutor && (packageStart === null || c.at >= packageStart)
  );

/** Less than 24 hours' notice. `grace` moves the edge in the student's favor. */
export const isLate = (start: number, now: number, grace = 0): boolean =>
  start - now < BOOKING.noticeHours * HOUR - grace;
const GRACE = BOOKING.graceMinutes * MIN;
const lateNow = (start: number, now: number) => isLate(start, now, GRACE);

/** From 24 hours to 4 weeks ahead. */
export const inWindow = (start: number, now: number): boolean =>
  start >= now + BOOKING.noticeHours * HOUR - GRACE &&
  start <= now + BOOKING.aheadDays * DAY + GRACE;

/** Whether a session at `start` would go past the package's sessions a week. `others` are the
 *  student's other sessions that are not canceled (one being moved is left out by the caller). */
export function overWeek(
  pack: Pack,
  start: number,
  others: readonly { start: number }[],
  zone: string
): boolean {
  const cap = weeklyCap(pack);
  if (cap === null) return false;
  const week = weekIn(start, zone);
  return others.filter((s) => weekIn(s.start, zone) === week).length >= cap;
}

// ---- answers ----

export type Why =
  | "plan"
  | "length"
  | "window"
  | "week"
  | "hours"
  | "started"
  | "moved"
  | "pass"
  | "moves";
export interface Refusal {
  ok: false;
  why: Why;
  status: number;
  /** One short sentence the page shows as it is. */
  message: string;
}

const SAYS: Record<Why, [number, string]> = {
  plan: [403, "Booking sessions comes with Private 10 and Private 20."],
  length: [422, "Sessions are 60, 90 or 120 minutes."],
  window: [422, "Sessions can be booked from 24 hours to 4 weeks ahead."],
  week: [409, "Private 10 has one session a week, and that week already has one."],
  hours: [403, "Not enough hours left for this length."],
  started: [409, "This session has already started."],
  moved: [403, "This session was moved once already. Message your tutor to move it again."],
  pass: [
    403,
    "This session is less than 24 hours away and your one late change is used. Message your tutor to change it.",
  ],
  moves: [403, "You have used this month's 3 moves. They come back on the 1st."],
};
/** Said when the tutor's calendar will not take a 90 or 120 minute session. */
export const CALENDAR_LENGTH = "Your tutor's calendar takes 60-minute sessions for now.";

export function refusal(why: Why, pack?: Pack): Refusal {
  const [status, message] = SAYS[why];
  if (why === "length" && pack === "private-10")
    return { ok: false, why, status, message: "Private 10 sessions are 60 minutes." };
  return { ok: false, why, status, message };
}

/** A new booking: the length the package allows, inside the window, under the weekly cap, with
 *  enough hours left. */
export function checkBook(c: {
  pack: Pack;
  minutes: number;
  start: number;
  now: number;
  zone: string;
  /** Hours left: bought, less used and booked. */
  left: number;
  /** The student's sessions that are not canceled. */
  others: readonly { start: number }[];
}): { ok: true; minutes: Length } | Refusal {
  if (!isLength(c.minutes) || !lengthsFor(c.pack).includes(c.minutes))
    return refusal("length", c.pack);
  if (!inWindow(c.start, c.now)) return refusal("window");
  if (overWeek(c.pack, c.start, c.others, c.zone)) return refusal("week");
  if (c.left + 1e-9 < c.minutes / 60) return refusal("hours");
  return { ok: true, minutes: c.minutes };
}

export interface ChangeAllowed {
  ok: true;
  /** Less than 24 hours' notice. */
  late: boolean;
  /** This change spends the late pass. */
  usesPass: boolean;
}

/** Moving a session (it keeps its length, so its hours do not change). */
export function checkMove(c: {
  pack: Pack | null;
  session: { start: number; moved: boolean };
  to: number;
  now: number;
  zone: string;
  byTutor: boolean;
  latePass: boolean;
  /** When the student's counted moves were made. */
  moves: readonly number[];
  /** The student's other sessions that are not canceled. */
  others: readonly { start: number }[];
}): ChangeAllowed | Refusal {
  const late = lateNow(c.session.start, c.now);
  if (c.byTutor) return { ok: true, late, usesPass: false };
  if (c.now >= c.session.start) return refusal("started");
  if (c.session.moved) return refusal("moved");
  if (late && !c.latePass) return refusal("pass");
  if (movesLeftIn(c.moves, c.now, c.zone) <= 0) return refusal("moves");
  if (!inWindow(c.to, c.now)) return refusal("window");
  if (c.pack && overWeek(c.pack, c.to, c.others, c.zone)) return refusal("week");
  return { ok: true, late, usesPass: late };
}

/** Canceling a session. Allowed, its hours go back. */
export function checkCancel(c: {
  start: number;
  now: number;
  byTutor: boolean;
  latePass: boolean;
}): ChangeAllowed | Refusal {
  const late = lateNow(c.start, c.now);
  if (c.byTutor) return { ok: true, late, usesPass: false };
  if (c.now >= c.start) return refusal("started");
  if (late && !c.latePass) return refusal("pass");
  return { ok: true, late, usesPass: late };
}
