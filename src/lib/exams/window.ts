/*
 * When a full-length exam may be started (founder, 2026-11-16 and 2026-11-22): only on Saturday, from
 * 6 am to midnight, in the student's own time zone. Once started, an exam runs its full time, even past
 * midnight. An Exam pass from Rewards allows an early or late start; an admin or development test switch
 * opens the window on any day. Pure: no clock or database here, so it can be tested.
 */

export const WINDOW_DAY = 6; // Saturday (Sunday = 0)
export const WINDOW_OPENS_HOUR = 6;
export const WINDOW_CLOSES_HOUR = 24;

export const FALLBACK_TIME_ZONE = "America/Chicago";

/** The zone if this runtime knows it, else null. */
export function validTimeZone(zone: string | null | undefined): string | null {
  if (!zone || zone.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(0);
    return zone;
  } catch {
    return null;
  }
}

type Local = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock parts of `at` in `zone`. */
export function localParts(at: Date, zone: string): Local {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(at);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: WEEKDAYS[get("weekday")] ?? 0,
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
  };
}

/** The instant when the wall clock in `zone` reads this date and hour (24 = the next midnight). */
export function zonedInstant(zone: string, year: number, month: number, day: number, hour: number) {
  // Start from the same wall time read as UTC, then correct by the zone's offset (twice, for DST edges).
  const wall = Date.UTC(year, month - 1, day, hour);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const seen = localParts(new Date(guess), zone);
    const seenWall = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
    guess += wall - seenWall;
  }
  return new Date(guess);
}

export type ExamWindow = {
  /** Whether a new exam may be started right now without a pass. */
  open: boolean;
  /** This Saturday's window if open, else the next one. */
  opensAt: Date;
  closesAt: Date;
  zone: string;
};

/** The Saturday window around `now` in `zone`. */
export function examWindow(now: Date, zone: string): ExamWindow {
  const safe = validTimeZone(zone) ?? FALLBACK_TIME_ZONE;
  const local = localParts(now, safe);
  // Days from today (local) to the Saturday of this window: today if it is Saturday before midnight.
  const ahead = (WINDOW_DAY - local.weekday + 7) % 7;
  const base = new Date(Date.UTC(local.year, local.month - 1, local.day + ahead));
  const at = (hour: number) =>
    zonedInstant(safe, base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), hour);
  const opensAt = at(WINDOW_OPENS_HOUR);
  const closesAt = at(WINDOW_CLOSES_HOUR);
  return { open: now >= opensAt && now < closesAt, opensAt, closesAt, zone: safe };
}

/** How a new exam would be opened right now, or null when it cannot be. */
export function howToOpen(input: {
  window: ExamWindow;
  testSwitch: boolean;
  passes: number;
}): "window" | "test-switch" | "pass" | null {
  if (input.window.open) return "window";
  if (input.testSwitch) return "test-switch";
  if (input.passes > 0) return "pass";
  return null;
}
