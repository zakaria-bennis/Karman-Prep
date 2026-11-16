// The made-up students behind the Progress page, and what is worked out from them: the line of the
// predicted score, a log of every day, and the dates. Nothing here is read from a real student. When
// real data arrives, these functions are what it replaces.

/** The day the stand-ins call today, fixed so the server and the browser draw the same page. */
export const TODAY = new Date(2026, 10, 15);
export const DAY = 86_400_000;
export const round10 = (n: number) => Math.round(n / 10) * 10;

export type Exam = { day: number; score: number };
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
};

export const STUDENTS = {
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
    testIn: 48,
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
    testIn: 20,
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
};

/** The same "random" number every time for the same day and purpose, so the page never flickers. */
const noise = (day: number, k: number) => {
  const v = Math.sin(day * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** Every day from the first to today (stand-in): most days have practice, some are rest days, exam days
 *  are long, and the last stretch is an unbroken run of Daily 10s. */
export function activity(student: Student): DayLog[] {
  const run = Math.min(12, Math.ceil(student.days / 2));
  const logs: DayLog[] = [];
  for (let day = 0; day <= student.days; day++) {
    const exam = student.exams.findIndex((e) => e.day === day) + 1;
    const recent = day > student.days - run;
    const rest = !exam && !recent && noise(day, 1) < 0.2;
    const daily10 = !rest && (recent || noise(day, 2) < 0.8);
    const practice = rest
      ? 0
      : (daily10 ? 10 : 0) + Math.floor(noise(day, 3) * 4) * 8 + Math.floor(noise(day, 4) * 3) * 5;
    const questions = practice + (exam ? 98 : 0);
    const rate = 0.6 + 0.24 * (day / Math.max(1, student.days)) + (noise(day, 5) - 0.5) * 0.16;
    logs.push({
      day,
      questions,
      correct: Math.round(questions * Math.min(0.98, rate)),
      minutes: Math.round(practice * (1 + noise(day, 6) * 0.5)) + (exam ? 134 : 0),
      daily10,
      exam,
    });
  }
  return logs;
}

/** How many skills were Proficient by a given day (stand-in), out of 72. */
export const SKILLS = 72;
export const proficientBy = (day: number) => Math.min(SKILLS, Math.floor(Math.max(0, day) * 0.4));

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
    proficient: proficientBy(to) - proficientBy(from - 1),
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
