// The cohorts a family can reserve a seat in today: each is named by the SAT it ends on, and one whose
// registration has closed is no longer offered. Dates and ids: offer.ts.
import { MARCH_PROGRAM, NEXT_PROGRAMS, SAT_DATES } from "@/lib/marketing/offer";

export interface OpenProgram {
  id: string;
  /** "March 6": the SAT the cohort ends on. */
  sat: string;
  /** "March": that SAT's month, which is how the form names the cohort. */
  month: string;
  /** "the week of January 4, 2027" */
  starts: string;
  startDate: string;
}

const DAY = 864e5;

/** The answer for a family that has not settled on an SAT date: the seat is held and the date is agreed
 *  with them afterwards. */
export const UNDECIDED = "undecided";

/** The cohorts for the next three SATs (founder, 2026-11-14). Registration for each closes one week before
 *  its first class (founder, 2026-11-11). */
export function openPrograms(today: string): OpenProgram[] {
  const now = Date.parse(`${today}T00:00:00Z`);
  return [MARCH_PROGRAM, ...NEXT_PROGRAMS]
    .map((p, i) => ({
      id: p.id,
      sat: SAT_DATES[i] ?? p.startShort,
      month: (SAT_DATES[i] ?? p.startShort).split(" ")[0],
      starts: p.startLabel,
      startDate: p.startDate,
    }))
    .filter((p) => Date.parse(`${p.startDate}T00:00:00Z`) - 7 * DAY >= now)
    .slice(0, 3);
}
