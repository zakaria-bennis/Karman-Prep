/*
 * The study streak (founder, 2026-11-07): days in a row with practice, where one planned rest
 * day a week keeps it going. Pure: the caller passes the days the student practiced.
 */

const DAY_MS = 86_400_000;

/** A local calendar day as YYYY-MM-DD, in the given IANA time zone. */
export function dayKey(at: string | number | Date, timeZone = "America/Chicago"): string {
  const d = at instanceof Date ? at : new Date(at);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const shift = (key: string, days: number) =>
  new Date(Date.parse(`${key}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/**
 * Current and longest streak. Walking back from today, a missed day is forgiven once in any
 * seven days (the rest day); a second miss within seven days ends the streak. Today without
 * practice yet doesn't break it. Rest days don't add to the count.
 */
export function streaks(
  practiceDays: Iterable<string>,
  today: string
): {
  current: number;
  longest: number;
} {
  const days = new Set(practiceDays);
  if (days.size === 0) return { current: 0, longest: 0 };
  const sorted = [...days].sort();
  const first = sorted[0];

  // Longest: scan forward over every day from the first practice to today.
  let longest = 0;
  let run = 0;
  let lastRest: string | null = null;
  for (let k = first; k <= today; k = shift(k, 1)) {
    if (days.has(k)) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (k === today) {
      break;
    } else if (run > 0 && (lastRest === null || k > shift(lastRest, 6))) {
      lastRest = k;
    } else {
      run = 0;
      lastRest = null;
    }
  }

  // Current: walk back from today (or yesterday, if today has no practice yet).
  let current = 0;
  let rest: string | null = null;
  let k = days.has(today) ? today : shift(today, -1);
  for (let guard = 0; guard < 4000 && k >= first; guard++, k = shift(k, -1)) {
    if (days.has(k)) current += 1;
    else if (current > 0 && (rest === null || k < shift(rest, -6))) rest = k;
    else if (current === 0 && rest === null) rest = k;
    else break;
  }
  return { current, longest: Math.max(longest, current) };
}
