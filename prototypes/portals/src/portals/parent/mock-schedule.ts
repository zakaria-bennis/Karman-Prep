/**
 * What comes next for the parent: sessions, classes, workshops, tests, the
 * free practice test, the next weekly update and the SAT itself, each with
 * its date. Items are gated by the plan’s bundles, never by a plan name.
 */
import { FREE_TEST, type Student, type MockState } from "@/mock";
import { has, upgradeFor, type BundleId, type PlanId } from "@/plans/plans";
import { isNew, NEXT_SESSION } from "./mock";
import { NEXT_UPDATE } from "./mock-updates";

export type UpKind = "class" | "session" | "test" | "workshop" | "practice" | "sat" | "update";
export interface Upcoming {
  id: string;
  title: string;
  date: string;
  time?: string;
  kind: UpKind;
  who?: string;
  /** A due item: the row says "Due" with its date (rule 55). */
  due?: boolean;
}

const WORKSHOP: Upcoming = {
  id: "w1",
  title: "Pacing workshop",
  date: "2026-11-01",
  time: "4:00 to 5:00 pm ET",
  kind: "workshop",
};
const ITEMS: Record<string, Upcoming[]> = {
  maya: [
    {
      id: "t4",
      title: "Full-length test 4",
      date: "2026-10-31",
      time: "9:00 to 11:30 am",
      kind: "test",
      due: true,
    },
    WORKSHOP,
    {
      id: "s1",
      title: "Full-length review session",
      date: NEXT_SESSION.date,
      time: NEXT_SESSION.time,
      kind: "session",
      who: NEXT_SESSION.with,
    },
  ],
  ava: [
    {
      id: "t2",
      title: "Full-length test 2",
      date: "2026-10-31",
      time: "10:00 am to 12:30 pm",
      kind: "test",
      due: true,
    },
    WORKSHOP,
    {
      id: "c1",
      title: "Live class",
      date: "2026-11-03",
      time: "7:00 to 8:30 pm ET",
      kind: "class",
      who: "David",
    },
    {
      id: "c2",
      title: "Live class",
      date: "2026-11-05",
      time: "7:00 to 8:30 pm ET",
      kind: "class",
      who: "David",
    },
    { id: "t3", title: "Full-length test 3", date: "2026-11-14", kind: "test", due: true },
  ],
  sofia: [
    WORKSHOP,
    {
      id: "o1",
      title: "Office hours",
      date: "2026-11-04",
      time: "6:00 to 7:00 pm ET",
      kind: "workshop",
      who: "Zakaria",
    },
    { id: "t3", title: "Full-length test 3", date: "2026-11-07", kind: "test", due: true },
  ],
  lin: [{ id: "t2", title: "Full-length test 2", date: "2026-11-07", kind: "test", due: true }],
  theo: [
    { id: "p1", title: "Percentages practice", date: "2026-11-03", kind: "practice", due: true },
    { id: "t2", title: "Full-length test 2", date: "2026-11-14", kind: "test", due: true },
  ],
  omar: [],
};
const NEEDS: Partial<Record<UpKind, BundleId>> = {
  class: "liveClasses",
  session: "oneToOne",
  workshop: "workshops",
  test: "fullLength",
};

/** Everything ahead for this student, soonest first. */
export function upcomingFor(student: Student, plan: PlanId, state: MockState): Upcoming[] {
  const quiet = state === "empty" || isNew(student);
  const list = quiet
    ? []
    : (ITEMS[student.id] ?? []).filter((i) => {
        const b = NEEDS[i.kind];
        return !b || has(plan, b);
      });
  if (!has(plan, "fullLength") && !isNew(student))
    list.push({
      id: "free-test",
      title: "Free practice test",
      date: FREE_TEST,
      time: "10:00 am ET, on Zoom",
      kind: "test",
    });
  list.push({
    id: "update",
    title: "Weekly update",
    date: isNew(student) ? "2026-11-08" : NEXT_UPDATE,
    kind: "update",
  });
  list.push({ id: "sat", title: "The SAT", date: student.satDate, kind: "sat" });
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** One locked panel at most: the first missing live bundle that a plan up the ladder adds. */
export function lockedLiveBundle(plan: PlanId): BundleId | null {
  for (const b of ["workshops", "liveClasses", "oneToOne"] as BundleId[])
    if (!has(plan, b) && upgradeFor(plan, b)) return b;
  return null;
}

/** A sample of what a locked bundle would list, so the locked panel stays readable. */
export const LOCKED_SAMPLE: Partial<Record<BundleId, Upcoming[]>> = {
  workshops: [WORKSHOP],
  liveClasses: [
    {
      id: "lc",
      title: "Live class",
      date: "2026-11-03",
      time: "7:00 to 8:30 pm ET",
      kind: "class",
      who: "David",
    },
  ],
  oneToOne: [
    {
      id: "ls",
      title: "Full-length review session",
      date: "2026-11-03",
      time: "5:00 to 6:00 pm ET",
      kind: "session",
      who: "Zakaria",
    },
  ],
};

console.assert(
  Object.values(ITEMS)
    .flat()
    .every((i) => i.date >= "2026-10-31"),
  "nothing in the schedule is in the past"
);
console.assert(
  ITEMS.ava.filter((i) => i.kind === "class").every((i) => i.who === "David"),
  "the March cohort’s classes name David"
);
