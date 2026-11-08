/**
 * A fixed clock, so every screenshot is stable: today is Saturday 2026-10-31 at
 * 09:41. The March cohort sits the SAT on 2027-03-06 (offer.ts MARCH_PROGRAM,
 * official; not the static list's projected March 13). The free practice test
 * is 2026-12-12 (offer.ts FREE_PRACTICE_TEST).
 */
export const TODAY = "2026-10-31";
export const NOW = new Date("2026-10-31T09:41:00");
export const SAT_MARCH = "2027-03-06";
export const SAT_MARCH_LABEL = "Saturday, March 6, 2027";
export const SAT_MAY = "2027-05-01";
export const FREE_TEST = "2026-12-12";
export const COHORT_START = "2027-01-04";

const DAY = 86400000;
const at = (iso: string) => new Date(iso + "T12:00:00").getTime();

/** Whole days from `from` (default today) to `to`. */
export function daysUntil(to: string, from = TODAY): number {
  return Math.round((at(to) - at(from)) / DAY);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(at(iso) + n * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtDate(iso: string, style: "short" | "long" = "short"): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(
    "en-US",
    style === "long"
      ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric" }
  );
}

export const DAYS_TO_MARCH_SAT = daysUntil(SAT_MARCH);
console.assert(
  DAYS_TO_MARCH_SAT === 126,
  `126 days from ${TODAY} to ${SAT_MARCH}, got ${DAYS_TO_MARCH_SAT}`
);
console.assert(daysUntil(FREE_TEST) === 42, "42 days to the free practice test");
console.assert(NOW.getDay() === 6, "today is a Saturday");
