// ============================================================
// Calendar buckets for the Revenue dashboard, in Karman's time
// zone (America/Chicago, Austin). A payment at 11 pm on the 31st
// in Austin belongs to that month, not to the next one in UTC.
// Pure: every function takes "now" so tests can pin it.
// ============================================================

export const REVENUE_TZ = "America/Chicago";

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: REVENUE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export interface ZonedDate {
  y: number;
  /** 1 to 12 */
  m: number;
  d: number;
}

function zonedParts(ms: number): ZonedDate & { h: number; mi: number; s: number } {
  const out: Record<string, number> = {};
  for (const p of PARTS.formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return { y: out.year, m: out.month, d: out.day, h: out.hour % 24, mi: out.minute, s: out.second };
}

/** The calendar date in Austin at this instant. */
export function zonedDate(ms: number): ZonedDate {
  const { y, m, d } = zonedParts(ms);
  return { y, m, d };
}

/** How far Austin's wall clock is ahead of UTC at this instant, in ms (negative: behind). */
function offsetAt(ms: number): number {
  const p = zonedParts(ms);
  const wall = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return wall - Math.floor(ms / 1000) * 1000;
}

/** The instant of midnight in Austin at the start of this calendar date (DST-safe). */
export function zonedMidnight(y: number, m: number, d: number): number {
  const wall = Date.UTC(y, m - 1, d);
  const first = wall - offsetAt(wall);
  return wall - offsetAt(first);
}

/** A calendar date moved by whole days (month and year roll over). */
export function addDays(date: ZonedDate, days: number): ZonedDate {
  const t = new Date(Date.UTC(date.y, date.m - 1, date.d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** "YYYY-MM" of the Austin month this instant falls in. */
export function monthKey(ms: number): string {
  const { y, m } = zonedDate(ms);
  return `${y}-${String(m).padStart(2, "0")}`;
}

export type Grain = "day" | "week" | "month";

export interface Bucket {
  /** "2026-11-12" (day or the Monday of a week) or "2026-11" (month). */
  key: string;
  start: number;
  /** Exclusive. The last bucket ends in the future; use min(end, now) for "as of". */
  end: number;
  /** "Nov 12", "Week of Nov 9", "November 2026". */
  label: string;
  /** Axis tick: "12", "Nov 9", "Nov". */
  short: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const utcLabel = (date: ZonedDate, opts: Intl.DateTimeFormatOptions) =>
  new Date(Date.UTC(date.y, date.m - 1, date.d)).toLocaleDateString("en-US", {
    ...opts,
    timeZone: "UTC",
  });

function startOf(grain: Grain, date: ZonedDate): ZonedDate {
  if (grain === "day") return date;
  if (grain === "month") return { y: date.y, m: date.m, d: 1 };
  const dow = new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay();
  return addDays(date, -((dow + 6) % 7)); // weeks start on Monday
}

function next(grain: Grain, date: ZonedDate): ZonedDate {
  if (grain === "day") return addDays(date, 1);
  if (grain === "week") return addDays(date, 7);
  return date.m === 12 ? { y: date.y + 1, m: 1, d: 1 } : { y: date.y, m: date.m + 1, d: 1 };
}

function prev(grain: Grain, date: ZonedDate): ZonedDate {
  if (grain === "day") return addDays(date, -1);
  if (grain === "week") return addDays(date, -7);
  return date.m === 1 ? { y: date.y - 1, m: 12, d: 1 } : { y: date.y, m: date.m - 1, d: 1 };
}

function describe(grain: Grain, date: ZonedDate): Pick<Bucket, "key" | "label" | "short"> {
  if (grain === "month") {
    return {
      key: `${date.y}-${pad(date.m)}`,
      label: utcLabel(date, { month: "long", year: "numeric" }),
      short: utcLabel(date, { month: "short" }),
    };
  }
  const key = `${date.y}-${pad(date.m)}-${pad(date.d)}`;
  const md = utcLabel(date, { month: "short", day: "numeric" });
  return grain === "day"
    ? { key, label: md, short: date.d === 1 ? md : String(date.d) }
    : { key, label: `Week of ${md}`, short: md };
}

/** The last `count` buckets of this grain, oldest first; the last one holds `now`. */
export function buildBuckets(grain: Grain, count: number, now: number): Bucket[] {
  let cursor = startOf(grain, zonedDate(now));
  const starts: ZonedDate[] = [cursor];
  for (let i = 1; i < count; i++) {
    cursor = prev(grain, cursor);
    starts.unshift(cursor);
  }
  return starts.map((s) => {
    const n = next(grain, s);
    return {
      ...describe(grain, s),
      start: zonedMidnight(s.y, s.m, s.d),
      end: zonedMidnight(n.y, n.m, n.d),
    };
  });
}

/** Index of the bucket holding this instant, or -1. */
export function bucketIndex(buckets: Bucket[], ms: number): number {
  for (let i = 0; i < buckets.length; i++) {
    if (ms >= buckets[i].start && ms < buckets[i].end) return i;
  }
  return -1;
}

/** The same instant n calendar months later (UTC), with the day clamped to the month's end. */
export function addMonths(ms: number, n: number): number {
  const d = new Date(ms);
  const day = d.getUTCDate();
  const target = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth() + n,
      1,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds()
    )
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.getTime();
}
