import { SAT_MARCH, TODAY, addDays, fmtDate } from "@/mock";
import { cohortById, tutorStudentById, COHORT_STUDENTS, PRIVATE_STUDENTS } from "./mock";
import { LATEST, testsTaken } from "./mock-tests";

/**
 * Guarantee tracking, homework, the score-report queue and earnings. The
 * guarantee's requirement names and thresholds mirror src/lib/marketing/offer.ts
 * GUARANTEE (15 of 18 classes, five tests, 90 percent practice, the SAT on the
 * date; Private 20: every session, four tests, the SAT within 30 days of the
 * last session). The terms themselves are never restated here.
 */
export interface Requirement {
  id: string;
  label: string;
  current: number;
  needed: number;
  total?: number;
  unit: "classes" | "tests" | "percent" | "sessions" | "date";
  by: string;
  met: boolean;
  slipping: boolean;
  note?: string;
}
/** Of the December cohort's eight classes held so far. */
const COHORT_FACTS: Record<string, { attended: number; practice: number; registered: boolean }> = {
  jamal: { attended: 8, practice: 92, registered: true },
  chloe: { attended: 7, practice: 78, registered: true },
  ruben: { attended: 5, practice: 90, registered: false },
  mei: { attended: 8, practice: 100, registered: true },
  priya: { attended: 8, practice: 95, registered: true },
};
const PRIVATE_FACTS: Record<string, { booked: number; attended: number }> = {
  maya: { booked: 14, attended: 14 },
  leila: { booked: 17, attended: 17 },
};
export const COHORT_NEEDS = { classes: 15, classesOf: 18, tests: 5, practice: 90 };
export const PRIVATE20_NEEDS = { tests: 4, satWithinDays: 30 };

export function requirementsFor(id: string): Requirement[] {
  const s = tutorStudentById(id);
  if (!s) return [];
  if (s.plan === "cohort" && s.cohort) {
    const c = cohortById(s.cohort);
    const f = COHORT_FACTS[id];
    if (!c || !f || c.classesHeld === 0) return [];
    const projected = f.attended + (c.classesTotal - c.classesHeld) * (f.attended / c.classesHeld);
    const taken = testsTaken(id);
    return [
      {
        id: "classes",
        label: "Live classes attended",
        current: f.attended,
        needed: COHORT_NEEDS.classes,
        total: COHORT_NEEDS.classesOf,
        unit: "classes",
        by: c.satDate,
        met: f.attended >= COHORT_NEEDS.classes,
        slipping: projected < COHORT_NEEDS.classes,
        note: `${c.classesHeld - f.attended} missed of ${c.classesHeld} held`,
      },
      {
        id: "tests",
        label: "Full-length tests, in the week assigned",
        current: taken,
        needed: COHORT_NEEDS.tests,
        unit: "tests",
        by: addDays(c.satDate, -7),
        met: taken >= COHORT_NEEDS.tests,
        slipping: false,
      },
      {
        id: "practice",
        label: "Weekly practice completed",
        current: f.practice,
        needed: COHORT_NEEDS.practice,
        unit: "percent",
        by: c.satDate,
        met: f.practice >= COHORT_NEEDS.practice,
        slipping: f.practice < COHORT_NEEDS.practice,
      },
      {
        id: "sat",
        label: "Sit the SAT on the program's date",
        current: f.registered ? 1 : 0,
        needed: 1,
        unit: "date",
        by: c.satDate,
        met: false,
        slipping: !f.registered,
        note: f.registered ? `Registered for ${fmtDate(c.satDate)}` : "Not registered yet",
      },
    ];
  }
  if (s.plan === "private20") {
    const f = PRIVATE_FACTS[id];
    if (!f) return [];
    const taken = testsTaken(id);
    return [
      {
        id: "sessions",
        label: "Every session attended",
        current: f.attended,
        needed: f.booked,
        unit: "sessions",
        by: s.satDate,
        met: f.attended === f.booked,
        slipping: f.attended < f.booked,
      },
      {
        id: "tests",
        label: "Full-length tests taken",
        current: taken,
        needed: PRIVATE20_NEEDS.tests,
        unit: "tests",
        by: s.satDate,
        met: taken >= PRIVATE20_NEEDS.tests,
        slipping: false,
      },
      {
        id: "sat",
        label: "Official SAT within 30 days of the last session",
        current: 1,
        needed: 1,
        unit: "date",
        by: s.satDate,
        met: false,
        slipping: false,
        note: `Last session on or after ${fmtDate(addDays(s.satDate, -PRIVATE20_NEEDS.satWithinDays))}`,
      },
    ];
  }
  return [];
}
export const isSlipping = (id: string) => requirementsFor(id).some((r) => r.slipping);
/** "Slipping: classes", short enough for a phone row's second line (rule 51). */
const SLIP: Record<Requirement["unit"], string> = {
  classes: "classes",
  percent: "practice",
  sessions: "sessions",
  tests: "tests",
  date: "not registered",
};
export const slipLabel = (r: Requirement) => `Slipping: ${SLIP[r.unit]}`;
/** Students the guarantee covers today: cohorts in session and Private 20. */
export const coveredStudents = () =>
  [...PRIVATE_STUDENTS, ...COHORT_STUDENTS].filter((s) => requirementsFor(s.id).length > 0);

export interface Assignment {
  id: string;
  title: string;
  skill: string;
  to: { kind: "cohort" | "student"; id: string };
  due: string;
  questions: number;
  assigned: string;
  results: { studentId: string; done: boolean; right?: number; answered?: number }[];
}
/** An assignment to one student. */
const one = (
  id: string,
  title: string,
  skill: string,
  studentId: string,
  due: string,
  questions: number,
  assigned: string,
  r: Omit<Assignment["results"][number], "studentId">
): Assignment => ({
  id,
  title,
  skill,
  to: { kind: "student", id: studentId },
  due,
  questions,
  assigned,
  results: [{ studentId, ...r }],
});
export const ASSIGNMENTS: Assignment[] = [
  {
    id: "hw1",
    title: "Linear functions practice",
    skill: "Linear functions",
    to: { kind: "cohort", id: "december" },
    due: addDays(TODAY, 2),
    questions: 10,
    assigned: "2026-10-28",
    results: [
      { studentId: "jamal", done: true, right: 7 },
      { studentId: "chloe", done: true, right: 6 },
      { studentId: "ruben", done: false },
      { studentId: "mei", done: true, right: 9 },
      { studentId: "priya", done: false },
    ],
  },
  one(
    "hw6",
    "Linear functions practice",
    "Linear functions",
    "ava",
    addDays(TODAY, 2),
    10,
    "2026-10-28",
    { done: false }
  ),
  one("hw2", "Circles and arcs", "Circles", "maya", addDays(TODAY, 1), 10, "2026-10-27", {
    done: false,
  }),
  one(
    "hw3",
    "Nonlinear functions, set 12",
    "Nonlinear functions",
    "maya",
    "2026-10-27",
    12,
    "2026-10-20",
    { done: true, right: 9 }
  ),
  one("hw4", "Percentages drill", "Percentages", "jonah", "2026-10-30", 10, "2026-10-28", {
    done: true,
    right: 7,
  }),
  one(
    "hw5",
    "Reading pacing set",
    "Text Structure and Purpose",
    "leila",
    addDays(TODAY, 4),
    15,
    "2026-10-29",
    { done: false, answered: 4 }
  ),
];
console.assert(ASSIGNMENTS.length === 6, "six assignments out");
export const doneCount = (a: Assignment) => a.results.filter((r) => r.done).length;
export const assignmentsFor = (studentId: string) =>
  ASSIGNMENTS.filter((a) => a.results.some((r) => r.studentId === studentId));

export * from "./mock-queue";

console.assert(
  coveredStudents().length === 7,
  `seven covered students, got ${coveredStudents().length}`
);
console.assert(
  coveredStudents()
    .filter((s) => isSlipping(s.id))
    .map((s) => s.id)
    .join() === "chloe,ruben",
  "Chloe (practice) and Ruben (classes, not registered) are slipping"
);
console.assert(doneCount(ASSIGNMENTS[0]) === 3, "3 of 5 did the linear functions practice");
console.assert(
  ASSIGNMENTS.find((a) => a.to.id === "ava")?.results[0].done === false,
  "Ava's practice is still due, as her own list says"
);
console.assert(
  Object.values(COHORT_FACTS).every((f) => f.attended <= cohortById("december")!.classesHeld),
  "nobody attended more classes than were held"
);
console.assert(
  SAT_MARCH === "2027-03-06" && LATEST.maya.total === 1360,
  "the briefing's test is test 3 at 1,360"
);
