import type { CalEvent } from "@/design-system/components/Calendar";
import { addDays, TODAY, SAT_MARCH, FREE_TEST } from "./clock";

/** The week of today (Monday 2026-10-26 to Sunday 2026-11-01), day 0 is Monday. */
export const WEEK_START = "2026-10-26";
export const WEEK_DATES = Array.from({ length: 7 }, (_, i) =>
  String(Number(addDays(WEEK_START, i).slice(8)))
);
export const TODAY_INDEX = 5; // Saturday

/** Events by student. Hours are decimal, 19.5 is 7:30 pm. */
export const EVENTS: Record<string, CalEvent[]> = {
  ava: [
    { id: "a1", day: 1, start: 19, end: 20.5, kind: "class", title: "Live class", who: "David" },
    { id: "a2", day: 3, start: 19, end: 20.5, kind: "class", title: "Live class", who: "David" },
    { id: "a3", day: 5, start: 10, end: 12.5, kind: "test", title: "Full-length test 2" },
    { id: "a4", day: 6, start: 16, end: 17, kind: "workshop", title: "Pacing workshop" },
  ],
  maya: [
    {
      id: "m1",
      day: 1,
      start: 17,
      end: 18,
      kind: "session",
      title: "Full-length review session",
      who: "Zakaria",
    },
    { id: "m2", day: 5, start: 9, end: 11.5, kind: "test", title: "Full-length test 4" },
    { id: "m3", day: 6, start: 16, end: 17, kind: "workshop", title: "Pacing workshop" },
  ],
  sofia: [{ id: "s1", day: 6, start: 16, end: 17, kind: "workshop", title: "Pacing workshop" }],
  lin: [],
  noah: [],
  theo: [],
};

/** Due items. Every due item shows its due date (rule 55). */
export interface DueItem {
  id: string;
  title: string;
  due: string;
  kind: "daily10" | "test" | "practice" | "class";
}
export const DUE: Record<string, DueItem[]> = {
  ava: [
    { id: "d1", title: "Your Daily 10", due: TODAY, kind: "daily10" },
    { id: "d2", title: "Full-length test 2", due: TODAY, kind: "test" },
    { id: "d3", title: "Linear functions practice", due: addDays(TODAY, 2), kind: "practice" },
  ],
  maya: [
    { id: "d1", title: "Your Daily 10", due: TODAY, kind: "daily10" },
    { id: "d2", title: "Full-length test 4", due: TODAY, kind: "test" },
  ],
  sofia: [{ id: "d1", title: "Your Daily 10", due: TODAY, kind: "daily10" }],
  lin: [{ id: "d1", title: "Your Daily 10", due: TODAY, kind: "daily10" }],
  noah: [],
  theo: [{ id: "d1", title: "Percentages practice", due: addDays(TODAY, 3), kind: "practice" }],
};

export const DATES = { satMarch: SAT_MARCH, freeTest: FREE_TEST };
console.assert(WEEK_DATES[TODAY_INDEX] === "31", "today is the 31st in the week strip");
console.assert(
  EVENTS.ava.filter((e) => e.kind === "class").length === 2,
  "the cohort has two classes a week"
);
