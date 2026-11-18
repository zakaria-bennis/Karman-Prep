// Homework's data: a Cohort or Private student's work. All of it is a stand-in until tutors assign
// real work. What is his (founder, 2026-11-16):
//   - Homework opens on the day: what matters at the left, the day's work at the right. The days
//     ahead are stepped to, and a button shows the whole week.
//   - Only four things are assigned: skill sets, strategy quizzes, flashcards and time trials. The
//     Daily 10 and challenge questions are not homework.
//   - Work is Reading and Writing (fuchsia), Math (blue) or Mixed (green). No key explains it.
//   - A piece of work says its name and how much there is ("8 questions"), not what sort it is: a
//     small picture says that.
//   - The week's full-length exam is a banner of its own with a clock counting down to when it
//     opens (Saturday, 6 AM); then a Start exam button, and a clock counting down to midnight.
//   - Pacing is not homework. Strategy quizzes are: five questions at most, under a compass.
//   - Every piece has a Start button. Today's Daily 10, if not yet done, leads the day as a card of
//     its own (it is not assigned homework, but it is started from here).
//   - Only work still to do is listed; done work is behind a Completed button. Missed work is marked
//     with a sign, not a word; after a week it is closed.
// What is mine: the names of the work, how much there is, and the class days and time.
import { DAY, TODAY } from "./progressData";

export const KINDS = { rw: "Reading and Writing", math: "Math", mixed: "Mixed" } as const;
export type Kind = keyof typeof KINDS;
export const SORTS = {
  skill: "Skill set",
  strategy: "Strategy quiz",
  cards: "Flashcards",
  trial: "Time trial",
} as const;
export type Sort = keyof typeof SORTS;

export type Work = {
  id: string;
  kind: Kind;
  sort: Sort;
  name: string;
  /** How much there is: "8 questions". */
  much: string;
  state: "todo" | "done" | "missing" | "closed";
};
export type HomeworkDay = {
  date: Date;
  /** Days from today: 0 today, less than 0 past. */
  from: number;
  /** A live class that day, by its time. */
  class?: string;
  /** The week's full-length exam is taken this day. */
  exam: boolean;
  work: Work[];
};

/** The same "random" number every time for the same place. */
const noise = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const RW = [
  "Key details",
  "Words in context",
  "Unneeded punctuation",
  "Transitions",
  "Reading graphs",
  "Main idea",
  "Verb agreement",
];
const MATH = [
  "Slope and rate of change",
  "Percentages",
  "Graphs of quadratics",
  "Units and conversions",
  "Number of solutions",
  "Rational expressions",
  "Circle equations",
];

/** When the exam may be begun (his rule: Saturday only, 6 AM to midnight), in hours of the day. */
export const EXAM = { opens: 6, closes: 24 };
/** The live class: when it begins, how long it runs (mine), and how early its door opens: the
 *  countdown ends five minutes before the class, at 6:55 for a class at 7 (founder, 2026-11-16). */
export const CLASS = { hour: 19, minutes: 90, early: 5 };

/** One week's days, Sunday to Saturday. `week` 0 is this week, -1 the one before. */
export function weekOf(week: number): HomeworkDay[] {
  const sunday = new Date(TODAY.getTime() - TODAY.getDay() * DAY + week * 7 * DAY);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday.getTime() + i * DAY);
    const from = Math.round((date.getTime() - TODAY.getTime()) / DAY);
    const seed = week * 7 + i + 100;
    const drafts: Omit<Work, "id" | "state">[] = [];
    if (i !== 6) {
      drafts.push({
        kind: "rw",
        sort: "skill",
        name: RW[Math.floor(noise(seed, 1) * RW.length)],
        much: "8 questions",
      });
      drafts.push({
        kind: "math",
        sort: "skill",
        name: MATH[Math.floor(noise(seed, 2) * MATH.length)],
        much: "8 questions",
      });
      if (noise(seed, 3) < 0.5)
        drafts.push(
          noise(seed, 4) < 0.5
            ? { kind: "math", sort: "cards", name: "Formulas", much: "12 cards" }
            : { kind: "rw", sort: "cards", name: "Grammar rules", much: "12 cards" }
        );
      if (i === 2)
        drafts.push({ kind: "math", sort: "trial", name: "Algebra", much: "5 questions" });
      if (i === 4) drafts.push({ kind: "rw", sort: "trial", name: "Reading", much: "5 questions" });
      if (i === 0 || i === 3)
        drafts.push({
          kind: "mixed",
          sort: "strategy",
          name: i === 0 ? "Process of elimination" : "Plugging in numbers",
          much: "5 questions",
        });
    }
    return {
      date,
      from,
      class: i === 2 || i === 4 ? "7:00 PM" : undefined,
      exam: i === 6,
      work: drafts.map((draft, n) => {
        const missed = noise(seed, 10 + n) < 0.16;
        const state: Work["state"] =
          from > 0
            ? "todo"
            : from === 0
              ? n === 0
                ? "done"
                : "todo"
              : !missed
                ? "done"
                : from >= -7
                  ? "missing"
                  : "closed";
        return { ...draft, id: `${week}-${i}-${n}`, state };
      }),
    };
  });
}

/** The cohort is in its third week of nine. */
export const WEEK_NOW = 3;
export const WEEKS = 9;
