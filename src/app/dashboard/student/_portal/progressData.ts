// The students behind the Progress page, and what is worked out from them: the line of the predicted
// score, a log of every day, and the dates. A signed-in student's record is built on the server
// (src/lib/portal/progress.ts) and carries its own day log (`log`); the made-up students below are
// for the design page and work theirs out here.
import type { RealSitting } from "./mistakeLogData";

/** Today, from midnight. Every day of a log is counted back from it. */
export const TODAY = new Date(new Date().setHours(0, 0, 0, 0));
export const DAY = 86_400_000;
export const round10 = (n: number) => Math.round(n / 10) * 10;

/** A full-length exam: its day and total, and its two sections when they were stored. */
export type Exam = { day: number; score: number; rw?: number; math?: number };
export type Student = {
  label: string;
  /** Days since they began. */
  days: number;
  exams: readonly Exam[];
  /** Turns in the prediction between exams (stand-in data only). */
  turns?: readonly Exam[];
  /** Today's prediction. */
  now: number;
  /** Days until the test date they entered, if they entered one. */
  testIn: number | null;
  /** A student who has answered nothing yet. */
  blank?: boolean;
  /** A real student's own log of every day, from day 0 to today. */
  log?: readonly DayLog[];
  /** A real student's sittings for the Mistake Log, newest first. */
  sittings?: readonly RealSitting[];
};

/** Questions to answer before a full-length exam is suggested. It is a suggestion, not a gate
 *  (founder, 2026-11-15). */
export const BEFORE_EXAM = 100;

export const STUDENTS = {
  // brand new: nothing answered, so Progress is the page that says where to start
  day1: { label: "Day 1", days: 0, exams: [], now: 0, testIn: null, blank: true },
  // a little practice, under 100 questions, no exam yet
  days2: { label: "2 days", days: 2, exams: [], now: 0, testIn: null },
  new: { label: "6 days", days: 6, exams: [{ day: 4, score: 1180 }], now: 0, testIn: null },
  weeks3: {
    label: "3 weeks",
    days: 21,
    exams: [
      { day: 2, score: 1200 },
      { day: 12, score: 1230 },
      { day: 20, score: 1270 },
    ],
    now: 1270,
    // their test is months off, the other two are near: the badge's three colors can all be seen
    testIn: 118,
  },
  // this one slipped in the last week, so the 7-day span shows red
  weeks9: {
    label: "9 weeks",
    days: 63,
    exams: [
      { day: 3, score: 1200 },
      { day: 14, score: 1230 },
      { day: 28, score: 1290 },
      { day: 42, score: 1320 },
      { day: 52, score: 1370 },
    ],
    turns: [{ day: 56, score: 1410 }],
    now: 1380,
    testIn: 20,
  },
  months7: {
    label: "7 months",
    days: 212,
    exams: [
      { day: 6, score: 1090 },
      { day: 24, score: 1120 },
      { day: 45, score: 1190 },
      { day: 70, score: 1240 },
      { day: 96, score: 1310 },
      { day: 121, score: 1350 },
      { day: 148, score: 1420 },
      { day: 170, score: 1460 },
      { day: 196, score: 1530 },
    ],
    now: 1550,
    testIn: 6,
  },
} as const satisfies Record<string, Student>;
export type StudentKey = keyof typeof STUDENTS;

export type Series = "total" | "rw" | "math";
export const NAMES: Record<Series, string> = {
  total: "Predicted score",
  rw: "Predicted Reading and Writing score",
  math: "Predicted Math score",
};
export const CHIPS: Record<Series, string> = {
  total: "Total",
  rw: "Reading and Writing",
  math: "Math",
};

export type Point = { day: number } & Record<Series, number>;

/** An exam's point on the graph: its own two sections, or, for a stand-in, the total split. */
export const pointOf = (exam: Exam): Point =>
  exam.rw !== undefined && exam.math !== undefined
    ? { day: exam.day, total: exam.score, rw: exam.rw, math: exam.math }
    : split(exam.day, exam.score);

/** A total split into its two sections (stand-in arithmetic). */
export const split = (day: number, total: number): Point => {
  const math = round10(total * (0.51 + 0.015 * Math.sin(day / 9)));
  return { day, total, math, rw: total - math };
};

/** The line for every day from the first exam to today. A prediction needs two exams, but once the
 *  second is taken the line is drawn back to the first, the student's starting point, so no part of
 *  the graph is empty. Between exams it rises and dips with practice (stand-in texture), in tens. */
export function predict(student: Student): Point[] {
  const { exams, days, now } = student;
  if (exams.length < 2) return [];
  if (student.log) return predictReal(exams, days);
  const marks = [...exams, ...(student.turns ?? []), { day: days, score: now }].sort(
    (a, b) => a.day - b.day
  );
  const points: Point[] = [];
  for (let day = exams[0].day; day <= days; day++) {
    const next = marks.findIndex((m) => m.day >= day);
    const a = marks[Math.max(0, next - 1)];
    const b = marks[next];
    const t = b.day === a.day ? 1 : (day - a.day) / (b.day - a.day);
    const wobble = day === days ? 0 : Math.sin(day * 0.9) * 4 + Math.sin(day * 0.31) * 5;
    points.push(split(day, round10(a.score + (b.score - a.score) * t + wobble)));
  }
  return points;
}

/** A real student's line: straight from exam to exam, held level from the last exam to today. No
 *  texture is added; nothing between two exams is known. */
function predictReal(exams: readonly Exam[], days: number): Point[] {
  const marks = [...exams].sort((a, b) => a.day - b.day).map(pointOf);
  const points: Point[] = [];
  for (let day = marks[0].day; day <= days; day++) {
    const next = marks.findIndex((m) => m.day >= day);
    if (next === -1) {
      points.push({ ...marks[marks.length - 1], day });
      continue;
    }
    const a = marks[Math.max(0, next - 1)];
    const b = marks[next];
    const t = b.day === a.day ? 1 : (day - a.day) / (b.day - a.day);
    const at = (k: Series) => round10(a[k] + (b[k] - a[k]) * t);
    points.push({ day, total: at("rw") + at("math"), rw: at("rw"), math: at("math") });
  }
  return points;
}

export const dateOf = (student: Student, day: number) =>
  new Date(TODAY.getTime() - (student.days - day) * DAY);
export const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const long = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

/** One day of a student's log. */
export type DayLog = {
  day: number;
  questions: number;
  correct: number;
  /** Minutes spent actively answering, reading or watching. Idle time is never counted. */
  minutes: number;
  /** A day counts toward the streak only if the Daily 10 was done. */
  daily10: boolean;
  /** Which full-length exam was taken that day, counted from 1; 0 for none. */
  exam: number;
  /** Seconds a question took on timed work that day, on average; 0 if nothing was done. */
  pace: number;
  /** How many answers the pace was taken from (a real student's log): exam questions count toward
   *  questions but carry no time, so pace is weighted by this instead. */
  timed?: number;
  /** What the day's practice was made of, for the Mistake Log: skill sets of 8 questions, bursts of
   *  5 (a time trial or endless mode), and whether the challenge question was answered. */
  sets: number;
  fives: number;
  challenge: boolean;
  /** How many of the 72 skills were Proficient at the end of the day (a real student's log). */
  proficient?: number;
};

/** Seconds a question the real SAT allows, on average: 134 minutes for 98 questions. Standard time;
 *  a student's accommodations will change this once Settings holds them. */
export const SAT_PACE = Math.round((134 * 60) / 98);

/** The same "random" number every time for the same day and purpose, so the page never flickers. */
const noise = (day: number, k: number) => {
  const v = Math.sin(day * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** Every day from the first to today (stand-in): most days have practice, some are rest days, exam days
 *  are long, and the last stretch is an unbroken run of Daily 10s. */
export function activity(student: Student): DayLog[] {
  if (student.log) return [...student.log];
  const run = Math.min(12, Math.ceil(student.days / 2));
  const logs: DayLog[] = [];
  for (let day = 0; day <= student.days; day++) {
    const exam = student.exams.findIndex((e) => e.day === day) + 1;
    const recent = day > student.days - run;
    const rest = student.blank || (!exam && !recent && noise(day, 1) < 0.2);
    const daily10 = !rest && (recent || noise(day, 2) < 0.8);
    const sets = rest ? 0 : Math.floor(noise(day, 3) * 4);
    const fives = rest ? 0 : Math.floor(noise(day, 4) * 3);
    const challenge = !rest && noise(day, 8) < 0.7;
    const practice = (daily10 ? 10 : 0) + sets * 8 + fives * 5 + (challenge ? 1 : 0);
    const questions = practice + (exam ? 98 : 0);
    const rate = 0.6 + 0.24 * (day / Math.max(1, student.days)) + (noise(day, 5) - 0.5) * 0.16;
    logs.push({
      day,
      questions,
      correct: Math.round(questions * Math.min(0.98, rate)),
      minutes: Math.round(practice * (1 + noise(day, 6) * 0.5)) + (exam ? 134 : 0),
      daily10,
      exam,
      pace: questions
        ? Math.round(98 - 18 * (day / Math.max(1, student.days)) + (noise(day, 7) - 0.5) * 14)
        : 0,
      sets,
      fives,
      challenge,
    });
  }
  return logs;
}

/** How many skills were Proficient by a given day (stand-in), out of 72. */
export const SKILLS = 72;
const proficientBy = (day: number) => Math.min(SKILLS, Math.floor(Math.max(0, day) * 0.4));

/** How many skills were Proficient at the end of a day: from the log when it says, else stand-in. */
export const proficientOn = (logs: readonly DayLog[], day: number) =>
  day < 0
    ? logs[0]?.proficient !== undefined
      ? 0
      : proficientBy(day)
    : (logs[day]?.proficient ?? proficientBy(day));

/** The sums over a run of days, both ends included. */
export function sumOver(logs: DayLog[], from: number, to: number) {
  const days = logs.filter((l) => l.day >= from && l.day <= to);
  const questions = days.reduce((n, l) => n + l.questions, 0);
  const correct = days.reduce((n, l) => n + l.correct, 0);
  return {
    questions,
    minutes: days.reduce((n, l) => n + l.minutes, 0),
    practiced: days.filter((l) => l.questions > 0).length,
    accuracy: questions ? Math.round((correct / questions) * 100) : 0,
    exams: days.filter((l) => l.exam > 0).length,
    proficient: proficientOn(logs, to) - proficientOn(logs, from - 1),
  };
}

/** Days in a row, ending today (or yesterday, if today's Daily 10 is not done yet), with the Daily 10. */
export function streak(logs: DayLog[]): number {
  let at = logs.length - 1;
  if (at >= 0 && !logs[at].daily10) at--;
  let n = 0;
  while (at >= 0 && logs[at].daily10) {
    n++;
    at--;
  }
  return n;
}
