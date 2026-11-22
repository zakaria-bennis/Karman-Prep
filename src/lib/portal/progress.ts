/*
 * The record behind Progress and the Mistake Log for a real student: the days since they began,
 * their full-length exams, their test date and a log of every day. The shape is the design page's
 * own (src/app/dev/shell/progressData.ts), so the screens draw a real student exactly as they draw
 * the made-up ones. Pure: the loader (load.ts) reads the rows and passes them in.
 *
 * Days are counted in Central time, as everywhere else in the portal (src/lib/student/streak.ts).
 */
import type { DayLog, Exam, Student } from "@/app/dev/shell/progressData";
import { activeSeconds } from "@/lib/student/progress";
import { dayKey } from "@/lib/student/streak";

export interface ProgressAnswer {
  at: string | number;
  correct: boolean;
  seconds: number;
}

export interface ProgressInput {
  nowMs: number;
  /** Every practice answer, in any order: catalog practice, Daily 10s, sets and domain quizzes. */
  answers: readonly ProgressAnswer[];
  /** Full-length exams and diagnostics that gave a predicted score. */
  exams: readonly {
    at: string;
    total: number;
    rw?: number;
    math?: number;
    right?: number;
    asked?: number;
  }[];
  /** Days (YYYY-MM-DD) with a finished Daily 10. */
  dailyDays: readonly string[];
  /** Days with a challenge question answered. */
  challengeDays: readonly string[];
  /** One entry per finished skill set or domain quiz, at the time it finished. */
  sets: readonly string[];
  /** One entry per time-trial round, at the time it was played. */
  bursts: readonly string[];
  /** The test date the student entered (YYYY-MM-DD), if any. */
  testDate: string | null;
  /** Proficient skills (of the 72) from the answers up to a moment; the last day uses `proficientNow`. */
  proficientAt: (answers: readonly ProgressAnswer[], atMs: number) => number;
  /** Proficient skills today, as the Library counts them. */
  proficientNow: number;
}

const MS_DAY = 86_400_000;
/** Whole days from one YYYY-MM-DD to another. */
const between = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_DAY);
const time = (at: string | number) => (typeof at === "number" ? at : Date.parse(at));

export function buildStudent(input: ProgressInput): Student {
  const today = dayKey(input.nowMs);
  const answers = [...input.answers].sort((a, b) => time(a.at) - time(b.at));
  const exams = [...input.exams].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const starts = [
    ...answers.map((a) => dayKey(time(a.at))),
    ...exams.map((e) => dayKey(e.at)),
    ...input.dailyDays,
  ].filter((k) => k <= today);
  const first = starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : today;
  const days = Math.max(0, between(first, today));
  const indexOf = (at: string | number) => between(first, dayKey(time(at)));

  const log: DayLog[] = Array.from({ length: days + 1 }, (_, day) => ({
    day,
    questions: 0,
    correct: 0,
    minutes: 0,
    daily10: false,
    exam: 0,
    pace: 0,
    sets: 0,
    fives: 0,
    challenge: false,
  }));
  const seconds = new Array<number>(days + 1).fill(0);
  for (const a of answers) {
    const l = log[indexOf(a.at)];
    if (!l) continue;
    l.questions++;
    if (a.correct) l.correct++;
    seconds[l.day] += activeSeconds(a.seconds);
  }
  for (const l of log) {
    l.minutes = Math.round(seconds[l.day] / 60);
    l.pace = l.questions ? Math.round(seconds[l.day] / l.questions) : 0;
  }
  for (const k of input.dailyDays)
    if (log[between(first, k)]) log[between(first, k)].daily10 = true;
  for (const k of input.challengeDays)
    if (log[between(first, k)]) log[between(first, k)].challenge = true;
  for (const at of input.sets) if (log[indexOf(at)]) log[indexOf(at)].sets++;
  for (const at of input.bursts) if (log[indexOf(at)]) log[indexOf(at)].fives++;

  const examList: Exam[] = [];
  for (const e of exams) {
    const day = indexOf(e.at);
    if (!log[day]) continue;
    const exam: Exam = { day, score: e.total };
    if (e.rw !== undefined && e.math !== undefined) Object.assign(exam, { rw: e.rw, math: e.math });
    // two on one day: the later one stands
    const same = examList.findIndex((x) => x.day === day);
    if (same >= 0) examList[same] = exam;
    else examList.push(exam);
    log[day].exam = examList.length;
    log[day].questions += e.asked ?? 0;
    log[day].correct += e.right ?? 0;
  }

  // Proficient skills at the end of each day, worked out again only on days with answers
  let upTo = 0;
  let count = 0;
  for (const l of log) {
    const end = Date.parse(`${dayKey(input.nowMs - (days - l.day) * MS_DAY)}T23:59:59Z`);
    const before = upTo;
    while (upTo < answers.length && indexOf(answers[upTo].at) <= l.day) upTo++;
    if (upTo > before) count = input.proficientAt(answers.slice(0, upTo), end);
    l.proficient = count;
  }
  if (log.length) log[log.length - 1].proficient = input.proficientNow;

  const testIn =
    input.testDate && input.testDate >= today ? between(today, input.testDate.slice(0, 10)) : null;
  return {
    label: "You",
    days,
    exams: examList,
    // a prediction needs two exams (progressData.ts); until then there is none to show
    now: examList.length >= 2 ? examList[examList.length - 1].score : 0,
    testIn,
    blank: answers.length === 0 && examList.length === 0 ? true : undefined,
    log,
  };
}
