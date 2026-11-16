// Homework's data: a Cohort or Private student's week of work. All of it is a stand-in until
// tutors assign real work. What is his (founder, 2026-11-16):
//   - Homework opens on the whole week, every day laid out, with today marked.
//   - A day is one list. Work is Reading and Writing (fuchsia), Math (blue) or Mixed (green), and
//     nothing else: pacing and strategy work belongs to one of the three. No key explains the colors.
//   - The Daily 10 is first in a day, except on Saturday: the full-length exam always comes first,
//     at the top and made much of.
//   - Only work still to do is listed. Done work is behind a Completed button at the foot of the day.
//   - Earlier weeks are stepped back to. Done work reads Done; missed work reads Missing for a
//     week, then it is closed and greyed out.
// What is mine: the names of the work, how much there is, and the class days and time.
import { DAY, TODAY } from "./progressData";

export const KINDS = {
  rw: "Reading and Writing",
  math: "Math",
  mixed: "Mixed",
} as const;
export type Kind = keyof typeof KINDS;

export type Work = {
  id: string;
  kind: Kind;
  name: string;
  /** What sort of work it is and how long: "Skill set, 8 questions". */
  what: string;
  /** The week's full-length exam, which leads its day. */
  exam?: boolean;
  state: "todo" | "done" | "missing" | "closed";
};
export type HomeworkDay = {
  date: Date;
  /** Days from today: 0 today, less than 0 past. */
  from: number;
  /** A live class that day, by its time. */
  class?: string;
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

/** One week's days, Sunday to Saturday. `week` 0 is this week, -1 the one before. */
export function weekOf(week: number): HomeworkDay[] {
  const sunday = new Date(TODAY.getTime() - TODAY.getDay() * DAY + week * 7 * DAY);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday.getTime() + i * DAY);
    const from = Math.round((date.getTime() - TODAY.getTime()) / DAY);
    const seed = week * 7 + i + 100;
    const drafts: Omit<Work, "id" | "state">[] = [];
    if (i === 6)
      drafts.push({
        kind: "mixed",
        name: "Full-length exam",
        what: "2 hours 14 minutes",
        exam: true,
      });
    drafts.push({ kind: "mixed", name: "Daily 10", what: "10 questions" });
    if (i !== 6) {
      drafts.push({
        kind: "rw",
        name: RW[Math.floor(noise(seed, 1) * RW.length)],
        what: "Skill set, 8 questions",
      });
      drafts.push({
        kind: "math",
        name: MATH[Math.floor(noise(seed, 2) * MATH.length)],
        what: "Skill set, 8 questions",
      });
      if (noise(seed, 3) < 0.5)
        drafts.push(
          noise(seed, 4) < 0.5
            ? { kind: "math", name: "Math flashcards", what: "Flashcards, 12 cards" }
            : { kind: "rw", name: "Grammar flashcards", what: "Flashcards, 12 cards" }
        );
      if (i === 2)
        drafts.push({ kind: "math", name: "Math time trial", what: "Timed, 5 questions" });
      if (i === 4)
        drafts.push({ kind: "rw", name: "Reading time trial", what: "Timed, 5 questions" });
      if (i === 3) drafts.push({ kind: "mixed", name: "Strategy exam", what: "12 questions" });
      if (i === 1 || i === 5)
        drafts.push({ kind: "mixed", name: "Challenge question", what: "1 question" });
      if (i === 0)
        drafts.push({ kind: "mixed", name: "Exam review", what: "Go over last Saturday" });
    }
    return {
      date,
      from,
      class: i === 2 || i === 4 ? "7:00 PM" : undefined,
      work: drafts.map((draft, n) => {
        const missed = noise(seed, 10 + n) < 0.14;
        const state: Work["state"] =
          from > 0
            ? "todo"
            : from === 0
              ? n < 2
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

/** How far back and forward the weeks go: the cohort is in its third week of nine. */
export const WEEK_NOW = 3;
export const WEEKS = 9;
