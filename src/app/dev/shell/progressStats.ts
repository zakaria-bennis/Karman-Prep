// The numbers beside the predicted score, in the founder's order (2026-11-16): time invested, questions
// answered, skills Proficient, exams taken, pacing, accuracy, days practiced. Each is kept like a
// stock: what it stands at now, how far it moved over a span, and a line of how it got there.
import { SAT_PACE, SKILLS, proficientBy, type DayLog, type Student } from "./progressData";

export type StatKey = "time" | "questions" | "skills" | "exams" | "pace" | "accuracy" | "days";
export const STAT_ORDER: StatKey[] = [
  "time",
  "questions",
  "skills",
  "exams",
  "pace",
  "accuracy",
  "days",
];

export const clock = (minutes: number) =>
  minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
export const minSec = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
const count = (n: number) => n.toLocaleString("en-US");

export type Stat = {
  name: string;
  /** Small words after the value: "of 72", "per question". */
  after?: string;
  /** A quiet line under the ticker on the number's own page. */
  note?: string;
  /** For pacing a lower number is the better one. */
  lowerIsBetter?: boolean;
  /** The value as written. */
  show: (value: number) => string;
  /** A change in the value as written, with its sign. */
  moved: (change: number) => string;
  /** The value as plotted (minutes become hours), how a mark up the side is written, and the limits. */
  plot: (value: number) => number;
  mark: (plotted: number) => string;
  finest: number;
  least?: number;
  most?: number;
};

const plain = { plot: (v: number) => v, mark: (v: number) => count(v), finest: 1, least: 0 };

export const STATS: Record<StatKey, Stat> = {
  time: {
    name: "Time invested",
    show: clock,
    moved: (n) => `${sign(n)}${clock(Math.abs(n))}`,
    plot: (v) => Math.round((v / 60) * 10) / 10,
    mark: (v) => `${v}h`,
    finest: 0.5,
    least: 0,
  },
  questions: {
    name: "Questions answered",
    show: count,
    moved: (n) => `${sign(n)}${count(Math.abs(n))}`,
    ...plain,
  },
  skills: {
    name: "Skills Proficient",
    after: `of ${SKILLS}`,
    show: count,
    moved: (n) => `${sign(n)}${Math.abs(n)}`,
    ...plain,
    most: SKILLS,
  },
  exams: {
    name: "Exams taken",
    show: count,
    moved: (n) => `${sign(n)}${Math.abs(n)}`,
    ...plain,
  },
  pace: {
    name: "Pacing",
    after: "per question",
    note: `The SAT allows ${minSec(SAT_PACE)} per question`,
    lowerIsBetter: true,
    show: minSec,
    moved: (n) => `${sign(n)}${minSec(Math.abs(n))}`,
    plot: (v) => v,
    mark: minSec,
    finest: 5,
    least: 0,
  },
  accuracy: {
    name: "Accuracy",
    show: (v) => `${v}%`,
    moved: (n) => `${sign(n)}${Math.abs(n)}%`,
    plot: (v) => v,
    mark: (v) => `${v}%`,
    finest: 1,
    least: 0,
    most: 100,
  },
  days: {
    name: "Days practiced",
    show: count,
    moved: (n) => `${sign(n)}${Math.abs(n)}`,
    ...plain,
  },
};

/** Every number as it stood at the end of each day, from the first day to today. Counts add up;
 *  accuracy and pacing are taken over the two weeks ending that day, so one bad day does not swing
 *  them. */
export function ledger(student: Student, logs: DayLog[]): Record<StatKey, number[]> {
  const out: Record<StatKey, number[]> = {
    time: [],
    questions: [],
    skills: [],
    exams: [],
    pace: [],
    accuracy: [],
    days: [],
  };
  let minutes = 0;
  let questions = 0;
  let exams = 0;
  let practiced = 0;
  for (let day = 0; day <= student.days; day++) {
    const log = logs[day];
    minutes += log.minutes;
    questions += log.questions;
    exams += log.exam ? 1 : 0;
    practiced += log.questions ? 1 : 0;
    const recent = logs.slice(Math.max(0, day - 13), day + 1).filter((l) => l.questions > 0);
    const asked = recent.reduce((n, l) => n + l.questions, 0);
    out.time.push(minutes);
    out.questions.push(questions);
    out.skills.push(proficientBy(day));
    out.exams.push(exams);
    out.days.push(practiced);
    out.accuracy.push(
      asked
        ? Math.round((recent.reduce((n, l) => n + l.correct, 0) / asked) * 100)
        : (out.accuracy[day - 1] ?? 0)
    );
    out.pace.push(
      asked
        ? Math.round(recent.reduce((n, l) => n + l.pace * l.questions, 0) / asked)
        : (out.pace[day - 1] ?? 0)
    );
  }
  // accuracy and pacing have no value until the first questions are answered: the days before that
  // take the first real value, so "all time" never counts up from zero
  for (const key of ["accuracy", "pace"] as const) {
    const begun = out[key].findIndex((v) => v > 0);
    for (let day = 0; day < begun; day++) out[key][day] = out[key][begun];
  }
  return out;
}

/** Whether a change is for the better, for the worse, or neither. */
export const wayOf = (stat: Stat, change: number): "up" | "down" | "flat" =>
  change === 0 ? "flat" : change > 0 !== Boolean(stat.lowerIsBetter) ? "up" : "down";
