/**
 * The parent portal’s mock data: which family the gallery’s plan and state
 * switches show, the selected student’s skill levels, this week’s questions
 * and the first-day list. It reads the shared cast, skills, dates and plan
 * config and adds two rows of its own beside them (Omar on Free with his
 * mother Leila, and Theo’s mother Nadia). Never a real student.
 */
import { seeded } from "@/design-system/backgrounds/useCanvasLoop";
import { band, BANDS, type Band } from "@/design-system/marks/LevelMark";
import {
  PARENTS,
  STUDENTS,
  SKILLS,
  levelsFor,
  studentById,
  TODAY,
  SAT_MAY,
  WEEK_START,
  TODAY_INDEX,
  addDays,
  type Student,
  type Parent,
  type SkillLevel,
  type MockState,
} from "@/mock";
import { has, PLANS, type PlanId } from "@/plans/plans";

/** Omar practises on Free and has used the plan’s whole question allowance. */
export const OMAR: Student = {
  id: "omar",
  name: "Omar",
  initials: "O",
  plan: "free",
  hue: 40,
  since: "2026-09-20",
  satDate: SAT_MAY,
  target: 1300,
  predicted: null,
  baseline: null,
  grade: 11,
};
const EXTRA_PARENTS: Parent[] = [
  { id: "leila", name: "Leila", initials: "L", hue: 40, students: ["omar"] },
  { id: "nadia", name: "Nadia", initials: "N", hue: 80, students: ["theo"] },
];
export const ALL_STUDENTS: Student[] = [...STUDENTS, OMAR];
export const ALL_PARENTS: Parent[] = [...PARENTS, ...EXTRA_PARENTS];
export const anyStudent = (id: string): Student =>
  ALL_STUDENTS.find((s) => s.id === id) ?? studentById(id);

/** Which student the gallery’s plan switch shows. Maya buys Private in both sizes. */
export const STUDENT_FOR_PLAN: Record<PlanId, string> = {
  free: "omar",
  platform: "lin",
  plus: "sofia",
  cohort: "ava",
  private10: "maya",
  private20: "maya",
  school: "theo",
};

export interface Family {
  parent: Parent;
  students: Student[];
  selectedId: string;
}

/** The family for a plan and a state. First day: Dana, whose Noah signed up today. */
export function familyFor(plan: PlanId, state: MockState): Family {
  if (state === "first-day") {
    const parent = ALL_PARENTS.find((p) => p.id === "dana")!;
    return {
      parent,
      students: [{ ...anyStudent("noah"), plan }, anyStudent("maya")],
      selectedId: "noah",
    };
  }
  const id = STUDENT_FOR_PLAN[plan];
  const parent = ALL_PARENTS.find((p) => p.students.includes(id))!;
  const students = parent.students.map((sid) =>
    sid === id ? { ...anyStudent(sid), plan } : anyStudent(sid)
  );
  return { parent, students, selectedId: id };
}

export const isNew = (student: Student) => student.since === TODAY;

/** "Tuesday, Oct 27": the weekday and date, for flags and what comes next. */
export function dayAndDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** Omar’s levels: nine skills started on Free, five moved this week. */
function omarLevels(): SkillLevel[] {
  const r = seeded(7);
  return SKILLS.map((s, i) => {
    const started = i % 4 === 1 && i < 36;
    const now = started ? 14 + Math.round(r() * 38) : 0;
    const moved = started && i % 8 === 1;
    const was = moved ? Math.max(0, now - 4 - Math.round(r() * 5)) : now;
    return { ...s, now, was, band: band(now) };
  });
}

/** The selected student’s 39 levels; `was` is the level a week ago. Nothing started in the empty and first-day states. */
export function levelsOf(student: Student, state: MockState): SkillLevel[] {
  if (state === "empty" || isNew(student))
    return SKILLS.map((s) => ({ ...s, now: 0, was: 0, band: 0 as Band }));
  return student.id === "omar" ? omarLevels() : levelsFor(student.id);
}

export function bandCounts(levels: SkillLevel[]) {
  return ([4, 3, 2, 1, 0] as Band[]).map((b) => ({
    band: b,
    label: BANDS[b],
    count: levels.filter((l) => l.band === b).length,
  }));
}

/** Skills that moved this week, ups first, biggest first. */
export function movedThisWeek(levels: SkillLevel[]) {
  return levels.filter((l) => l.now !== l.was).sort((a, b) => b.now - b.was - (a.now - a.was));
}

export function weakestOf(levels: SkillLevel[]) {
  return levels.filter((l) => l.now > 0).sort((a, b) => a.now - b.now)[0] ?? null;
}

/* This week, Monday 2026-10-26 to Sunday 2026-11-01; today is Saturday, so Sunday is still to come. */
const WEEK: Record<string, (number | null)[]> = {
  maya: [42, 36, 0, 48, 41, 47, null],
  sofia: [25, 30, 18, 0, 22, 31, null],
  lin: [20, 0, 24, 19, 0, 17, null],
  ava: [33, 40, 28, 45, 26, 38, null],
  theo: [12, 15, 0, 14, 10, 0, null],
  omar: [0, 6, 0, 0, 0, 0, null],
};
const DAILY10_WEEK: Record<string, number> = {
  maya: 5,
  sofia: 4,
  lin: 3,
  ava: 6,
  theo: 3,
  omar: 0,
};
const QUIET: (number | null)[] = [0, 0, 0, 0, 0, 0, null];
export const WEEK_DAYS = Array.from({ length: 7 }, (_, i) => addDays(WEEK_START, i));
export const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export { TODAY_INDEX };

export interface ClassWeek {
  held: number;
  attended: number;
  missedOn: string | null;
}
export interface WeekSoFar {
  days: (number | null)[];
  total: number;
  practised: number;
  /** Your Daily 10s completed, or null when the plan has none. */
  daily10: number | null;
  /** Live classes this week, cohort plans only. */
  classes: ClassWeek | null;
}

export function weekFor(student: Student, plan: PlanId, state: MockState): WeekSoFar {
  const quiet = state === "empty" || isNew(student);
  const days = quiet ? QUIET : (WEEK[student.id] ?? QUIET);
  const total = days.reduce<number>((a, v) => a + (v ?? 0), 0);
  const practised = days.filter((v) => (v ?? 0) > 0).length;
  const daily10 = has(plan, "daily10") ? (quiet ? 0 : (DAILY10_WEEK[student.id] ?? 0)) : null;
  const classes: ClassWeek | null = has(plan, "liveClasses")
    ? isNew(student)
      ? { held: 0, attended: 0, missedOn: null }
      : state === "empty"
        ? { held: 2, attended: 0, missedOn: addDays(WEEK_START, 1) }
        : { held: 2, attended: 2, missedOn: null }
    : null;
  return { days, total, practised, daily10, classes };
}

/** Private hours, mirrored from offer.ts PRIVATE_PACKAGES (promote into the plan config). */
export const HOURS: Partial<Record<PlanId, number>> = { private10: 10, private20: 20 };
/** Maya’s full-length review sessions so far, 60 minutes each, Tuesdays at 5 pm ET. */
export const MAYA_SESSIONS = [
  "2026-06-16",
  "2026-06-30",
  "2026-07-21",
  "2026-08-11",
  "2026-09-01",
  "2026-09-22",
  "2026-10-13",
];
export const NEXT_SESSION = { date: "2026-11-03", time: "5:00 to 6:00 pm ET", with: "Zakaria" };

export interface FirstDayItem {
  id: string;
  title: string;
  when: string;
  state: "done" | "current" | "pending";
}

/** What will appear, and when, for a student who signed up today. */
export function firstDayList(student: Student, plan: PlanId): FirstDayItem[] {
  const items: FirstDayItem[] = [
    { id: "linked", title: `Linked to ${student.name}’s account`, when: "Today", state: "done" },
  ];
  if (has(plan, "daily10"))
    items.push({
      id: "daily10",
      title: `${student.name}’s first Your Daily 10`,
      when: "Today, about ten minutes",
      state: "current",
    });
  items.push({
    id: "levels",
    title: "First skill levels",
    when: "After about 30 questions",
    state: has(plan, "daily10") ? "pending" : "current",
  });
  if (has(plan, "liveClasses"))
    items.push({
      id: "class",
      title: "First live class with David",
      when: "Tuesday, Nov 3, 7:00 pm ET",
      state: "pending",
    });
  if (has(plan, "oneToOne"))
    items.push({
      id: "session",
      title: "First full-length review session with Zakaria",
      when: `${student.name} books it in the student app`,
      state: "pending",
    });
  if (has(plan, "fullLength"))
    items.push({
      id: "score",
      title: "Karman predicted score",
      when: "After full-length test 1, Saturday, Nov 7",
      state: "pending",
    });
  items.push({
    id: "update",
    title: "First weekly update",
    when: "Sunday, Nov 8",
    state: "pending",
  });
  return items;
}

console.assert(
  ALL_STUDENTS.length === 7 && ALL_PARENTS.length === 6,
  "seven students, six parents"
);
console.assert(
  Object.values(STUDENT_FOR_PLAN).every((id) => ALL_PARENTS.some((p) => p.students.includes(id))),
  "every plan’s student has a parent"
);
console.assert(
  familyFor("private20", "long-time").selectedId === "maya" &&
    familyFor("private20", "long-time").students.length === 2,
  "Dana opens on Maya and can switch to Noah"
);
console.assert(
  Object.keys(WEEK).every(
    (id) => (DAILY10_WEEK[id] ?? 0) <= WEEK[id].filter((v) => (v ?? 0) > 0).length
  ),
  "Daily 10s completed never exceed the days practised"
);
console.assert(
  WEEK.maya.reduce<number>((a, v) => a + (v ?? 0), 0) === 214,
  "Maya answered 214 questions this week so far"
);
console.assert(
  omarLevels().filter((l) => l.now > 0).length === 9 && PLANS.free.questions === 100,
  "Omar has nine skills started on Free’s 100 questions"
);
console.assert(WEEK_DAYS[TODAY_INDEX] === TODAY, "today is in the week strip");
