/**
 * Weekly updates for the parent: one per complete week since the student
 * joined, sent on the Sunday. Each says which skills moved, the practice
 * done, any full-length test score and what came next; the cohort’s mentions
 * a missed class only as a flag. Generated from the student’s levels with a
 * fixed seed, so the totals reconcile and screenshots are stable.
 */
import { seeded } from "@/design-system/backgrounds/useCanvasLoop";
import { addDays, type Student, type MockState } from "@/mock";
import { has, PLANS, type PlanId } from "@/plans/plans";
import {
  isNew,
  levelsOf,
  weekFor,
  MAYA_SESSIONS,
  NEXT_SESSION,
  type ClassWeek,
  anyStudent,
} from "./mock";

export interface Moved {
  id: string;
  label: string;
  from: number;
  to: number;
}
export interface NextItem {
  title: string;
  date: string;
  /** A due item: the row says "Due" with its date (rule 55). */
  due?: boolean;
}
export interface WeeklyUpdate {
  id: string;
  weekStart: string;
  weekEnd: string;
  sentOn: string;
  questions: number;
  daysPractised: number;
  daily10: number | null;
  up: Moved[];
  down: Moved[];
  test: { name: string; score: number; previous: number | null } | null;
  classes: ClassWeek | null;
  sessions: { count: number; with: string } | null;
  next: NextItem[];
  focus: string | null;
}

/** The last complete week, sent Sunday Oct 25; the next update lands Sunday Nov 1. */
export const LAST_SENT_WEEK = "2026-10-19";
export const NEXT_UPDATE = "2026-11-01";

/** Full-length tests by the Monday of their week. The first is the baseline. */
const TESTS: Record<string, { week: string; score: number }[]> = {
  maya: [
    { week: "2026-06-15", score: 1280 },
    { week: "2026-08-10", score: 1320 },
    { week: "2026-10-05", score: 1370 },
  ],
  sofia: [
    { week: "2026-08-31", score: 1230 },
    { week: "2026-09-28", score: 1270 },
  ],
  lin: [{ week: "2026-09-21", score: 1180 }],
  ava: [{ week: "2026-10-12", score: 1180 }],
  theo: [{ week: "2026-09-14", score: 1040 }],
};
/** The next full-length test for each student, with its date. */
export const NEXT_TEST: Record<string, { n: number; date: string }> = {
  maya: { n: 4, date: "2026-10-31" },
  ava: { n: 2, date: "2026-10-31" },
  sofia: { n: 3, date: "2026-11-07" },
  lin: { n: 2, date: "2026-11-07" },
  theo: { n: 2, date: "2026-11-14" },
};
/** The cohort’s classes by week; Thursday Oct 22 was missed. */
const CLASS_WEEKS: Record<string, ClassWeek> = {
  "2026-10-12": { held: 2, attended: 2, missedOn: null },
  "2026-10-19": { held: 2, attended: 1, missedOn: "2026-10-22" },
};
const OMAR_WEEKS = [22, 27, 18, 15, 8, 4];
const RANGE: Record<string, [number, number]> = {
  maya: [150, 230],
  sofia: [110, 170],
  lin: [55, 70],
  ava: [170, 220],
  theo: [40, 70],
};

export function mondayOf(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return addDays(iso, -((d.getDay() + 6) % 7));
}

function weeksSince(since: string): string[] {
  const out: string[] = [];
  for (let w = mondayOf(since); w <= LAST_SENT_WEEK; w = addDays(w, 7)) out.push(w);
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function nextFor(student: Student, plan: PlanId, weekStart: string, latest: boolean): NextItem[] {
  const nw = addDays(weekStart, 7);
  const end = addDays(nw, 6);
  const items: NextItem[] = [];
  const tests = TESTS[student.id] ?? [];
  const t = tests.findIndex((x) => x.week === nw);
  const upcoming = NEXT_TEST[student.id];
  if (has(plan, "fullLength")) {
    if (t >= 0) items.push({ title: `Full-length test ${t + 1}`, date: addDays(nw, 5), due: true });
    else if (latest && upcoming)
      items.push({ title: `Full-length test ${upcoming.n}`, date: upcoming.date, due: true });
  }
  if (has(plan, "liveClasses"))
    items.push({
      title: "Live classes with David, Tuesday and Thursday, 7:00 pm ET",
      date: addDays(nw, 1),
    });
  if (has(plan, "oneToOne")) {
    const s = MAYA_SESSIONS.find((d) => d >= nw && d <= end);
    if (s) items.push({ title: "Full-length review session with Zakaria", date: s });
    else if (latest)
      items.push({ title: "Full-length review session with Zakaria", date: NEXT_SESSION.date });
  }
  if (has(plan, "daily10")) items.push({ title: "Your Daily 10, every day", date: nw });
  items.push({ title: "Next weekly update", date: end });
  return items;
}

const cache = new Map<string, WeeklyUpdate[]>();

/** Every update sent to this family about this student, newest first. None for a new or inactive student. */
export function updatesFor(student: Student, plan: PlanId, state: MockState): WeeklyUpdate[] {
  if (state === "empty" || isNew(student)) return [];
  const key = `${student.id}|${plan}|${state}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const weeks = weeksSince(student.since);
  const started = levelsOf(student, state).filter((l) => l.now > 0);
  const tests = TESTS[student.id] ?? [];
  const r = seeded(student.name.length * 31 + weeks.length);
  const [lo, hi] = RANGE[student.id] ?? [20, 40];
  const list = weeks.map((weekStart, i) => {
    const k = weeks.length - 1 - i;
    const questions =
      student.id === "omar" ? (OMAR_WEEKS[i] ?? 0) : lo + Math.round(r() * (hi - lo));
    const daysPractised = questions === 0 ? 0 : Math.min(7, 3 + Math.floor(r() * 5));
    const daily10 = has(plan, "daily10") ? Math.min(daysPractised, 2 + Math.floor(r() * 6)) : null;
    const ups = Math.min(started.length, started.length ? 1 + ((k + i) % 3) : 0);
    const up: Moved[] = Array.from({ length: ups }, (_, j) => {
      const s = started[(k * 7 + j * 5) % started.length];
      const to = clamp(s.now - k * 2 - j * 3, 5, 100);
      return { id: s.id, label: s.label, from: Math.max(0, to - 4 - ((k + j) % 6)), to };
    });
    const down: Moved[] = [];
    if (started.length > 3 && (k + 1) % 4 === 0) {
      const s = started[(k * 11 + 3) % started.length];
      if (!up.some((u) => u.id === s.id)) {
        const to = clamp(s.now - k * 2 - 2, 1, 100);
        down.push({ id: s.id, label: s.label, from: Math.min(100, to + 3 + (k % 4)), to });
      }
    }
    const t = tests.findIndex((x) => x.week === weekStart);
    const test =
      t >= 0
        ? {
            name: `Full-length test ${t + 1}`,
            score: tests[t].score,
            previous: t > 0 ? tests[t - 1].score : null,
          }
        : null;
    const classes = has(plan, "liveClasses")
      ? (CLASS_WEEKS[weekStart] ?? { held: 2, attended: 2, missedOn: null })
      : null;
    const sessions = has(plan, "oneToOne")
      ? {
          count: MAYA_SESSIONS.filter((d) => d >= weekStart && d <= addDays(weekStart, 6)).length,
          with: "Zakaria",
        }
      : null;
    const weakest = [...started]
      .sort((a, b) => a.now - b.now)
      .filter((w) => !up.some((u) => u.id === w.id));
    const focus = down[0]?.label ?? weakest[k % Math.min(3, weakest.length)]?.label ?? null;
    return {
      id: weekStart,
      weekStart,
      weekEnd: addDays(weekStart, 6),
      sentOn: addDays(weekStart, 6),
      questions,
      daysPractised,
      daily10,
      up,
      down,
      test,
      classes,
      sessions,
      next: nextFor(student, plan, weekStart, k === 0),
      focus,
    };
  });
  list.reverse();
  cache.set(key, list);
  return list;
}

/** Every question the student has answered: the sent weeks plus this week so far. */
export function questionsAnswered(student: Student, plan: PlanId, state: MockState): number {
  return (
    updatesFor(student, plan, state).reduce((a, u) => a + u.questions, 0) +
    weekFor(student, plan, state).total
  );
}

export function testsTaken(student: Student): { name: string; score: number; week: string }[] {
  return (TESTS[student.id] ?? []).map((t, i) => ({
    name: `Full-length test ${i + 1}`,
    score: t.score,
    week: t.week,
  }));
}

const maya = updatesFor(anyStudent("maya"), "private20", "long-time");
console.assert(
  maya.length === 20 && maya[maya.length - 1].weekStart === "2026-06-08",
  "Maya has a term of updates, 20 weeks since June 8"
);
console.assert(
  maya.reduce((a, u) => a + (u.sessions?.count ?? 0), 0) === MAYA_SESSIONS.length,
  "the updates' review sessions add up to the hours used"
);
console.assert(
  questionsAnswered(anyStudent("omar"), "free", "long-time") === PLANS.free.questions,
  "Omar has used every one of Free’s 100 questions"
);
console.assert(
  questionsAnswered(anyStudent("lin"), "platform", "long-time") <= (PLANS.platform.questions === "all" ? Infinity : PLANS.platform.questions),
  "Lin’s answers fit inside Platform’s 500 questions"
);
console.assert(
  Object.entries(TESTS).every(([id, t]) => {
    const s = anyStudent(id);
    return t[0].score === s.baseline && t[t.length - 1].score <= (s.predicted ?? 0);
  }),
  "the first test is the baseline and the predicted score is at or above the last test"
);
console.assert(
  updatesFor(anyStudent("ava"), "cohort", "long-time").find((u) => u.id === "2026-10-19")?.classes
    ?.missedOn === "2026-10-22",
  "Ava’s week of Oct 19 flags the missed Thursday class"
);
console.assert(
  maya.every(
    (u) =>
      (u.daily10 ?? 0) <= u.daysPractised && !u.down.some((d) => u.up.some((x) => x.id === d.id))
  ),
  "Daily 10s fit the days practised; a skill moves one way in a week"
);
