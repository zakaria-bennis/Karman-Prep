/**
 * The student portal's own rows, beside the shared cast in src/mock: the
 * full-length tests, today's finished set, personal bests, the cohort's
 * numbers and the plan's due items. The schedule rows live in mock-schedule.ts. Every total is computed from
 * its parts; the assertions at the bottom keep them honest. Demo data for the
 * gallery, never a real student.
 */
import type { PlanId } from "@/plans/plans";
import type { CalEvent } from "@/design-system/components/Calendar";
import {
  TODAY,
  SAT_MARCH,
  DUE,
  EVENTS,
  QUESTIONS,
  DAILY10_RESULT,
  DAILY10_TOKENS,
  type DueItem,
} from "@/mock";

export const DIAGNOSTIC_DATE = "2026-06-09";

export interface FullTest {
  n: number;
  date: string;
  score: number | null;
  rw: number | null;
  math: number | null;
}

/** Five full-length tests per student, in order. A null score is a test not yet taken. */
export const TESTS: Record<string, FullTest[]> = {
  maya: [
    { n: 1, date: "2026-07-18", score: 1300, rw: 650, math: 650 },
    { n: 2, date: "2026-08-29", score: 1340, rw: 660, math: 680 },
    { n: 3, date: "2026-10-03", score: 1360, rw: 670, math: 690 },
    { n: 4, date: TODAY, score: null, rw: null, math: null },
    { n: 5, date: "2026-12-05", score: null, rw: null, math: null },
  ],
  ava: [
    { n: 1, date: "2026-10-17", score: 1220, rw: 600, math: 620 },
    { n: 2, date: TODAY, score: null, rw: null, math: null },
    { n: 3, date: "2026-11-21", score: null, rw: null, math: null },
    { n: 4, date: "2027-01-23", score: null, rw: null, math: null },
    { n: 5, date: "2027-02-20", score: null, rw: null, math: null },
  ],
  sofia: [
    { n: 1, date: "2026-09-12", score: 1270, rw: 640, math: 630 },
    { n: 2, date: "2026-10-10", score: 1310, rw: 650, math: 660 },
    { n: 3, date: "2026-11-14", score: null, rw: null, math: null },
    { n: 4, date: "2026-12-12", score: null, rw: null, math: null },
    { n: 5, date: "2027-01-30", score: null, rw: null, math: null },
  ],
  lin: [
    { n: 1, date: "2026-10-10", score: 1240, rw: 620, math: 620 },
    { n: 2, date: "2026-11-07", score: null, rw: null, math: null },
    { n: 3, date: "2026-12-05", score: null, rw: null, math: null },
    { n: 4, date: "2027-01-16", score: null, rw: null, math: null },
    { n: 5, date: "2027-02-13", score: null, rw: null, math: null },
  ],
  theo: [
    { n: 1, date: "2026-10-03", score: 1090, rw: 540, math: 550 },
    { n: 2, date: "2026-11-07", score: null, rw: null, math: null },
    { n: 3, date: "2026-12-05", score: null, rw: null, math: null },
    { n: 4, date: "2027-01-16", score: null, rw: null, math: null },
    { n: 5, date: "2027-02-13", score: null, rw: null, math: null },
  ],
  noah: [],
};

export const testsFor = (studentId: string) => TESTS[studentId] ?? [];
export const takenTests = (studentId: string) =>
  testsFor(studentId).filter((t): t is FullTest & { score: number } => t.score !== null);
export const nextTest = (studentId: string) => testsFor(studentId).find((t) => t.score === null);

/** The latest full-length test's result for the review screen: the misses, grouped by skill on screen. */
export interface Miss {
  section: "Reading and Writing" | "Math";
  module: 1 | 2;
  position: number;
  questionId: string;
}
export const LATEST_RESULT = {
  studentId: "maya",
  n: 4,
  date: TODAY,
  score: 1390,
  rw: 690,
  math: 700,
  route: { rw: "harder", math: "harder" } as const,
  misses: [
    { section: "Reading and Writing", module: 1, position: 7, questionId: "expr-2" },
    { section: "Reading and Writing", module: 1, position: 19, questionId: "conv-4" },
    { section: "Reading and Writing", module: 2, position: 4, questionId: "expr-4" },
    { section: "Reading and Writing", module: 2, position: 11, questionId: "expr-2" },
    { section: "Reading and Writing", module: 2, position: 25, questionId: "conv-4" },
    { section: "Math", module: 1, position: 15, questionId: "alg-3" },
    { section: "Math", module: 2, position: 9, questionId: "alg-4" },
    { section: "Math", module: 2, position: 13, questionId: "alg-3" },
    { section: "Math", module: 2, position: 18, questionId: "data-1" },
  ] as Miss[],
};
export const questionById = (id: string) => QUESTIONS.find((q) => q.id === id);

/** Today's finished set (Maya's Daily 10): the stats the end screen leaves out. Seconds per question. */
export const TODAY_SET = {
  studentId: "maya",
  date: TODAY,
  seconds: [48, 71, 95, 40, 52, 88, 108, 61, 44, 57],
  changed: [4, 9] as number[],
  changedToRight: 1,
  reviewed: { from: ["2026-10-24", "2026-10-29"], count: 3, right: 2 },
};
export const todaySet = () => {
  const total = TODAY_SET.seconds.reduce((a, b) => a + b, 0);
  const slowest = TODAY_SET.seconds.indexOf(Math.max(...TODAY_SET.seconds));
  const hardestRight = DAILY10_RESULT.hard.findIndex((h, i) => h && DAILY10_RESULT.answers[i]);
  const hard = DAILY10_RESULT.hard.filter(Boolean).length;
  return {
    right: DAILY10_RESULT.answers.filter(Boolean).length,
    total: DAILY10_RESULT.answers.length,
    seconds: total,
    pace: Math.round(total / TODAY_SET.seconds.length),
    slowest: { skill: QUESTIONS[slowest].skill, seconds: TODAY_SET.seconds[slowest] },
    hardestRight: hardestRight >= 0 ? QUESTIONS[hardestRight].skill : null,
    hard,
    difficulty: hard >= 5 ? "Mostly hard" : hard >= 3 ? `Medium, ${hard} hard` : "Mostly easy",
    changed: TODAY_SET.changed.length,
    changedToRight: TODAY_SET.changedToRight,
    reviewed: TODAY_SET.reviewed,
    tokens: DAILY10_TOKENS,
  };
};

export interface PersonalBest {
  label: string;
  value: string;
  date: string;
}
export const BESTS: Record<string, PersonalBest[]> = {
  maya: [
    { label: "Best set", value: "10 of 10", date: "2026-10-12" },
    { label: "Fastest clean set", value: "6:12", date: "2026-09-30" },
    { label: "Longest streak", value: "12 days", date: "2026-08-24" },
    { label: "Hardest question right", value: "Cross-Text Connections", date: "2026-10-03" },
  ],
  sofia: [
    { label: "Best set", value: "9 of 10", date: "2026-10-20" },
    { label: "Fastest clean set", value: "7:40", date: "2026-10-04" },
    { label: "Longest streak", value: "12 days", date: TODAY },
  ],
  lin: [
    { label: "Best set", value: "8 of 10", date: "2026-10-22" },
    { label: "Longest streak", value: "5 days", date: "2026-10-09" },
  ],
  ava: [
    { label: "Best set", value: "9 of 10", date: "2026-10-28" },
    { label: "Longest streak", value: "5 days", date: TODAY },
  ],
  theo: [{ label: "Best set", value: "7 of 10", date: "2026-10-15" }],
  noah: [],
};

/** The cohort's other four predicted scores, so the rank and the average are computed, never typed. */
export const COHORT_OTHERS = [1290, 1240, 1190, 1110];
export function cohortStanding(predicted: number | null) {
  if (predicted === null) return null;
  const rank = 1 + COHORT_OTHERS.filter((s) => s > predicted).length;
  const average = Math.round([...COHORT_OTHERS, predicted].reduce((a, b) => a + b, 0) / 5);
  const ord = rank === 1 ? "1st" : rank === 2 ? "2nd" : rank === 3 ? "3rd" : `${rank}th`;
  return { rank, average, label: `${ord} of 5` };
}

/** The student each plan shows in the gallery, so every plan's screens carry that student's honest numbers. */
export const STUDENT_BY_PLAN: Record<PlanId, string> = {
  free: "noah",
  platform: "lin",
  plus: "sofia",
  cohort: "ava",
  private10: "maya",
  private20: "maya",
  school: "theo",
};

/**
 * Due items, events and the tutor follow the plan the gallery shows, so a cohort screen always has
 * David in it. The due test is the student's own next test, so Home and Tests agree, and only on a
 * plan that has full-length tests: a plan without them has nothing due for tests (rule 55).
 */
export function dueFor(studentId: string, firstDay: boolean, hasFullLength: boolean): DueItem[] {
  if (firstDay) return [];
  const next = hasFullLength ? nextTest(studentId) : undefined;
  const ownTest: DueItem[] =
    next && next.date <= TODAY
      ? [
          {
            id: `test-${next.n}`,
            title: `Full-length test ${next.n}`,
            due: next.date,
            kind: "test",
          },
        ]
      : [];
  return [...(DUE[studentId] ?? []).filter((d) => d.kind !== "test"), ...ownTest];
}
/** The week grid's labels: the kind is in the legend, so the bar carries the short code. */
const SHORT_TITLES: Record<string, string> = {
  "Full-length review session": "Review session",
};
const shortTitle = (t: string) => SHORT_TITLES[t] ?? t.replace(/^Full-length test/, "Test");
export function eventsFor(plan: PlanId, firstDay: boolean): CalEvent[] {
  if (firstDay) return [];
  const own =
    plan === "cohort"
      ? EVENTS.ava
      : plan === "private10" || plan === "private20"
        ? EVENTS.maya
        : plan === "plus"
          ? EVENTS.sofia
          : [];
  return own.map((e) => ({ ...e, title: shortTitle(e.title) }));
}
/** The hours a week grid shows: from the first event's hour to the last one's end, never 13 rows for three events. */
export function hoursOf(events: CalEvent[]): { from: number; to: number } {
  if (!events.length) return { from: 9, to: 17 };
  const from = Math.floor(Math.min(...events.map((e) => e.start)));
  const to = Math.ceil(Math.max(...events.map((e) => e.end)));
  return { from, to: Math.max(to, from + 6) };
}
export function tutorFor(plan: PlanId, studentTutor: string | undefined): string | null {
  if (plan === "cohort") return "David";
  if (plan === "private10" || plan === "private20")
    return studentTutor === "david" ? "David" : "Zakaria";
  return null;
}
export const SAT_DATE = SAT_MARCH;

/** Hours of 1:1 sessions a private plan holds. Candidate for a field on the plan config (offer.ts has it). */
export const PRIVATE_HOURS: Partial<Record<PlanId, number>> = { private10: 10, private20: 20 };
export const hoursFor = (plan: PlanId) => PRIVATE_HOURS[plan] ?? 0;

console.assert(TODAY_SET.seconds.length === 10, "ten timings for ten questions");
console.assert(todaySet().seconds === 664 && todaySet().pace === 66, "11:04 at 66 s a question");
console.assert(todaySet().right === 7 && todaySet().hard === 3, "7 of 10, 3 hard");
console.assert(
  takenTests("maya").length === 3 && nextTest("maya")?.n === 4,
  "Maya: test 4 is next"
);
console.assert(
  LATEST_RESULT.score === LATEST_RESULT.rw + LATEST_RESULT.math,
  "the total is the two sections"
);
console.assert(LATEST_RESULT.misses.length === 9, "nine misses on test 4");
console.assert(
  LATEST_RESULT.misses.every((m) => questionById(m.questionId)),
  "every miss points at a demo question"
);
console.assert(
  hoursFor("private20") === 20 && hoursFor("plus") === 0,
  "hours only on private plans"
);
console.assert(
  dueFor("maya", false, true).find((d) => d.kind === "test")?.title === "Full-length test 4",
  "the due test is the student's own next test"
);
console.assert(
  !dueFor("maya", false, false).some((d) => d.kind === "test"),
  "nothing due for tests on a plan without full-length tests"
);
console.assert(
  eventsFor("private20", false).every((e) => e.title.length <= 16),
  "week grid labels fit a column"
);
console.assert(
  hoursOf(eventsFor("private20", false)).from === 9 &&
    hoursOf(eventsFor("private20", false)).to === 18,
  "Maya's week runs 9 am to 6 pm"
);
console.assert(cohortStanding(1220)?.label === "3rd of 5", "Ava is 3rd of 5");
console.assert(cohortStanding(1220)?.average === 1210, "cohort average 1,210 with Ava");
