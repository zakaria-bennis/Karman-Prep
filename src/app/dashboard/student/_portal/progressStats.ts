// The numbers beside the predicted score, in the founder's order (2026-11-16): time invested, questions
// answered (which carries accuracy), skills Proficient, pacing, days practiced, exams taken last. Each is kept like a
// stock: what it stands at now, how far it moved over a span, and a line of how it got there. A line
// that fell is red and one that rose is green, whatever the number. Pacing alone is drawn upside down,
// faster at the top, so a student getting faster sees a line that rises.
import { SKILLS, proficientOn, type DayLog, type Student } from "./progressData";

export type StatKey = "time" | "questions" | "skills" | "exams" | "pace" | "accuracy" | "days";
/** The numbers shown beside the score, in his order. Accuracy is kept as a number but has no place of
 *  its own there: it is shown inside Questions answered (founder, 2026-11-16). */
export const STAT_ORDER: StatKey[] = ["time", "questions", "skills", "pace", "days", "exams"];

export const clock = (minutes: number) =>
  minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
export const minSec = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
/** A length of time in words, so it is not read as a time of day: "1m 24s", "8m", "45s". */
export const minSecWords = (seconds: number) => {
  const all = Math.round(seconds);
  if (all < 60) return `${all}s`;
  return all % 60 ? `${Math.floor(all / 60)}m ${all % 60}s` : `${all / 60}m`;
};
/** A time of day from minutes after midnight: "4:15 PM". */
export const timeOfDay = (minutes: number) => {
  const hour = Math.floor(minutes / 60) % 24;
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
const count = (n: number) => n.toLocaleString("en-US");

export type Stat = {
  name: string;
  /** Small words after the value: "of 72", "per question". */
  after?: string;
  /** Whether "all time" is a span worth choosing: not for a count that only ever adds up. */
  allTime: boolean;
  /** A number that is better when it is smaller (pacing). Its graph is drawn upside down, so getting
   *  better is a line that rises, and it is colored by better and worse. */
  lessIsBetter?: boolean;
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

const plain = {
  allTime: false,
  plot: (v: number) => v,
  mark: (v: number) => count(v),
  finest: 1,
  least: 0,
};

export const STATS: Record<StatKey, Stat> = {
  time: {
    name: "Time invested",
    allTime: false,
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
    allTime: true,
    lessIsBetter: true,
    show: minSec,
    moved: (n) => `${sign(n)}${minSec(Math.abs(n))}`,
    plot: (v) => v,
    mark: minSec,
    finest: 5,
    least: 0,
  },
  accuracy: {
    name: "Accuracy",
    allTime: true,
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
    allTime: true,
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
    out.skills.push(proficientOn(logs, day));
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

/** Which way a number's line goes: up is green and down is red on every graph (founder, 2026-11-16:
 *  "if there's a downward trend, it shouldn't be in green"). Pacing is drawn upside down, faster at
 *  the top, so getting faster is a line that rises and is green (founder, 2026-11-16: "it makes good
 *  progress look bad"). */
export const wayOf = (change: number, lessIsBetter = false): "up" | "down" | "flat" =>
  change === 0 ? "flat" : change > 0 !== lessIsBetter ? "up" : "down";
