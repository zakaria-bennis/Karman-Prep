// What stands behind each number on Progress, broken down: by section and domain, by difficulty, by
// weekday, by exam. Everything here is a stand-in worked out from the made-up student, so the pages can
// be designed; real answers will replace these functions one for one. The weekday and streak figures
// are counted from the daily log, so they agree with the calendar.
import type { DayLog, Student } from "./progressData";
import { SECTIONS, SKILLS, type Section, type Skill } from "./skills72";

/** How the made-up student's work falls across the two sections, and the four domains of each. */
const SECTION_SHARE: Record<Section, number> = { "Reading and Writing": 0.46, Math: 0.54 };
const DOMAIN_SHARE: Record<Section, number[]> = {
  "Reading and Writing": [0.3, 0.26, 0.24, 0.2],
  Math: [0.32, 0.3, 0.2, 0.18],
};

export type DomainPart = { section: Section; name: string; value: number };

/** A total shared out across the eight domains, in whole numbers that add up to it again. */
export function byDomain(total: number): DomainPart[] {
  const parts = SECTIONS.flatMap((section) =>
    SKILLS[section].map((domain, i) => ({
      section,
      name: domain.name,
      exact: total * SECTION_SHARE[section] * DOMAIN_SHARE[section][i],
    }))
  );
  const whole = parts.map((p) => Math.floor(p.exact));
  let left = total - whole.reduce((a, b) => a + b, 0);
  // the parts with the largest remainders take the units that rounding dropped
  [...parts.keys()]
    .sort((a, b) => parts[b].exact - whole[b] - (parts[a].exact - whole[a]))
    .forEach((i) => {
      if (left > 0) {
        whole[i]++;
        left--;
      }
    });
  return parts.map((p, i) => ({ section: p.section, name: p.name, value: whole[i] }));
}

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const DOMAIN_LEAN = [6, -4, 2, -7, 5, -2, -9, 3];

/** Accuracy in each of the eight domains, around the student's own. */
export const accuracyByDomain = (accuracy: number) =>
  byDomain(0).map((d, i) => ({ ...d, value: clamp(accuracy + DOMAIN_LEAN[i], 20, 99) }));

/** Questions by the kind of work they came from, with how many of each were right. */
export function byMode(questions: number, exams: number, accuracy: number) {
  const fromExams = Math.min(questions, exams * 98);
  const rest = questions - fromExams;
  const kinds: [name: string, share: number, lean: number][] = [
    ["Skill sets", 0.5, 2],
    ["Daily 10", 0.22, 4],
    ["Time trials", 0.16, -6],
    ["Endless mode", 0.12, -1],
  ];
  const out = kinds.map(([name, share, lean]) => {
    const asked = Math.round(rest * share);
    return { name, asked, right: Math.round((asked * clamp(accuracy + lean, 10, 99)) / 100) };
  });
  out.push({
    name: "Full-length exams",
    asked: fromExams,
    right: Math.round((fromExams * clamp(accuracy - 3, 10, 99)) / 100),
  });
  return out.filter((kind) => kind.asked > 0);
}

export type Found = { section: Section; domain: string; skill: Skill };
/** Every one of the 72 skills, with its section and domain. */
export const everySkill: Found[] = SECTIONS.flatMap((section) =>
  SKILLS[section].flatMap((domain) =>
    domain.skills.map((skill) => ({ section, domain: domain.name, skill }))
  )
);
/** Skills at a level, taken turn about from the two sections so both are seen. */
const atLevel = (level: number, many: number, only?: Section): Found[] => {
  const sides = SECTIONS.filter((section) => !only || section === only).map((section) =>
    everySkill.filter((f) => f.section === section && f.skill.level === level)
  );
  const out: Found[] = [];
  for (let i = 0; out.length < many && sides.some((side) => side[i]); i++)
    sides.forEach((side) => side[i] && out.length < many && out.push(side[i]));
  return out;
};

export type Change = Found & { from: number; to: number };
/** The latest changes in level, newest first: skills that moved up one level, and skills that
 *  slipped down one. Together they are the eight to ten most recent changes (founder, 2026-11-16);
 *  every change of level counts, not only reaching Proficient. */
export const recentGains = (): Change[] =>
  [...atLevel(3, 3), ...atLevel(2, 2), ...atLevel(1, 2)].map((f) => ({
    ...f,
    from: f.skill.level - 1,
    to: f.skill.level,
  }));
export const recentSlips = (): Change[] =>
  [...atLevel(2, 4).slice(2, 4), ...atLevel(1, 3).slice(2, 3)].map((f) => ({
    ...f,
    from: f.skill.level + 1,
    to: f.skill.level,
  }));
/** The skills missed most often, with the accuracy on each. */
export const mostMissed = () => atLevel(1, 3).map((f, i) => ({ ...f, accuracy: [38, 44, 51][i] }));
/** The ten skills answered slowest, slowest first, with the pace on each, in seconds. */
export const slowest = (pace: number, only?: Section) =>
  [...atLevel(1, 10, only), ...atLevel(0, 10, only), ...atLevel(2, 10, only)]
    .slice(0, 10)
    .map((f, i) => ({ ...f, pace: pace + 34 - i * 3 }));

/** Every skill of a section, for its ring. */
export const skillsOf = (section: Section) => SKILLS[section].flatMap((d) => d.skills);

/** The exams taken: when, the pace a question took in it (seconds), and the score. */
export const examRows = (student: Student) =>
  student.exams.map((exam, i) => ({
    number: i + 1,
    day: exam.day,
    pace: Math.round(96 - (i / Math.max(1, student.exams.length - 1)) * 12),
    total: exam.score,
  }));

export type PacePart = "all" | "rw" | "math";
export const PACE_PARTS: Record<PacePart, string> = {
  all: "Overall",
  rw: "Reading and Writing",
  math: "Math",
};
/** Seconds a question the real SAT allows at standard time: the whole test, then each section (64
 *  minutes for 54 questions, 70 for 44). A student's accommodation multiplies these. */
export const PACE_GOAL: Record<PacePart, number> = {
  all: Math.round((134 * 60) / 98),
  rw: Math.round((64 * 60) / 54),
  math: Math.round((70 * 60) / 44),
};
/** A section's pace day by day, from the overall one: reading goes quicker than math. */
export const paceOf = (overall: number[], part: PacePart) =>
  part === "all"
    ? overall
    : overall.map((v, day) =>
        Math.round(v * (part === "rw" ? 0.86 : 1.17) + Math.sin(day / (part === "rw" ? 5 : 7)) * 2)
      );

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Minutes and days practiced on each day of the week over a run of the log. */
export function byWeekday(
  student: Student,
  logs: DayLog[],
  from: number,
  weekdayOf: (day: number) => number
) {
  const out = WEEKDAYS.map((name) => ({ name, minutes: 0, practiced: 0 }));
  logs
    .filter((l) => l.day >= from && l.day <= student.days)
    .forEach((l) => {
      const slot = out[weekdayOf(l.day)];
      slot.minutes += l.minutes;
      slot.practiced += l.questions > 0 ? 1 : 0;
    });
  return out;
}

/** How far back the grid of days practiced reaches: 100 days until the student has more than that,
 *  then 200, then a year (founder, 2026-11-16). The title says which. */
export const daysShown = (student: Student) =>
  student.days <= 100
    ? { many: 100, title: "Past 100 days" }
    : student.days <= 200
      ? { many: 200, title: "Past 200 days" }
      : { many: 365, title: "Past year" };

/** The longest run of days in a row with the Daily 10, anywhere in the log. */
export function longestStreak(logs: DayLog[]): number {
  let best = 0;
  let run = 0;
  logs.forEach((l) => {
    run = l.daily10 ? run + 1 : 0;
    best = Math.max(best, run);
  });
  return best;
}
