// The cohorts a family can reserve a seat in today: each is named by the SAT it ends on, and one whose
// registration has closed is no longer offered. Dates and ids: offer.ts.
import { MARCH_PROGRAM, NEXT_PROGRAMS, SAT_DATES } from "@/lib/marketing/offer";

export interface OpenProgram {
  id: string;
  /** "March 6": the SAT the cohort ends on. */
  sat: string;
  /** "the week of January 4, 2027" */
  starts: string;
  startDate: string;
}

const DAY = 864e5;

/** The answer for a family that has not settled on an SAT date: the seat is held and the date is agreed
 *  with them afterwards. */
export const UNDECIDED = "undecided";

/** Registration closes one week before the first class (founder, 2026-11-11), and only cohorts that start
 *  within the next three months are offered (founder, 2026-11-13: the whole year opens in January). */
export function openPrograms(today: string): OpenProgram[] {
  const now = Date.parse(`${today}T00:00:00Z`);
  return [MARCH_PROGRAM, ...NEXT_PROGRAMS]
    .map((p, i) => ({
      id: p.id,
      sat: SAT_DATES[i] ?? p.startShort,
      starts: p.startLabel,
      startDate: p.startDate,
    }))
    .filter((p) => {
      const start = Date.parse(`${p.startDate}T00:00:00Z`);
      return start - 7 * DAY >= now && start <= now + 92 * DAY;
    });
}
