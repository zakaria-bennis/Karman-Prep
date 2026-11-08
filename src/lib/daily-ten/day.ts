/*
 * The Daily 10's day and streak. A day is the student's own calendar day (their device's time
 * zone, sent with the request; Central time when it is missing or invalid). The streak counts
 * days in a row with a finished Daily 10, up to today; an unfinished today does not break it
 * until the day is over.
 */
export const DEFAULT_TIME_ZONE = "America/Chicago";

export function safeTimeZone(zone: string | null | undefined): string {
  if (!zone) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(0);
    return zone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** YYYY-MM-DD in the given time zone. */
export function dayKeyIn(at: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(zone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function previousDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Days in a row with a finished Daily 10, ending today (or yesterday while today is open). */
export function streakDays(finishedDays: Iterable<string>, today: string): number {
  const done = new Set(finishedDays);
  let day = done.has(today) ? today : previousDay(today);
  let count = 0;
  while (done.has(day)) {
    count++;
    day = previousDay(day);
  }
  return count;
}
