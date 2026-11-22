// The shape of a skill's lesson, its strategy quiz and its video (overnight build, 2026-11-22). One lesson
// per skill of the 72 (src/lib/skills/ids72.ts), read through index.ts.
//
// Text ("Rich") uses the quiz engine's marks, so a question reads the same in a lesson as in a quiz:
//   $...$ math (KaTeX)   <u>...</u> underlined   <i>...</i> italic   ______ a blank
// and, in lessons only, **...** bold. Plain words for a tenth grader, American spelling.
import type { Figure } from "./figures";

/** Text with the marks above. */
export type Rich = string;

/** The quiz engine's subjects (src/data/curriculum/types.ts). */
export type Subject = "math" | "reading";

/** One strategy-quiz question (shared contract 5): the Quiz modes stream plays these with the
 *  compass, at the end of the lesson. At most five per skill. */
export interface StrategyQuestion {
  /** The question. */
  text: Rich;
  /** A short passage, notes or table text the question is about (Reading and Writing), shown above
   *  the question. Math questions put everything in `text`. */
  passage?: Rich;
  /** Four choices, A to D. */
  choices: Rich[];
  /** The right choice, 0 to 3. */
  right: number;
  /** Why the right choice is right, and why the tempting wrong one is wrong. */
  why: Rich;
  subject: Subject;
}

/** One step of a worked example. */
export interface WorkedStep {
  /** What to do, in words. */
  say: Rich;
  /** The work for this step: usually one line of math. */
  show?: Rich;
}

/** A worked example, shown one step at a time. */
export interface WorkedExample {
  /** One to three words ("Sector area"). */
  title: string;
  /** The problem. */
  problem: Rich;
  /** A short passage, for Reading and Writing. */
  passage?: Rich;
  /** Choices, when the example is a multiple-choice question. */
  choices?: Rich[];
  /** The right choice, when there are choices. */
  right?: number;
  /** A picture for this example, drawn in code. */
  figure?: Figure;
  steps: WorkedStep[];
  /** The answer in one line. */
  answer: Rich;
  /** The faded example: from this step on, the student is asked to try it before it shows. */
  tryFrom?: number;
  /** One quick question right after the example (founder, round 2, 2026-11-22). */
  checkIn?: CheckIn;
}

/** A check-in after a worked example: the same kind of problem with new numbers or words. It counts for
 *  nothing (no coins, no level). A miss shows why, then the twin; the lesson goes on either way. */
export interface CheckIn {
  text: Rich;
  passage?: Rich;
  choices: Rich[];
  right: number;
  why: Rich;
  /** A graph, table or other picture the question needs, drawn in code. */
  figure?: Figure;
  /** A near-identical question (the same steps, other numbers or words), shown after a miss. */
  twin: Omit<CheckIn, "twin">;
}

/** A common trap: a wrong move students make, and how to dodge it. */
export interface Trap {
  /** Two to four words ("Too extreme"). */
  name: string;
  text: Rich;
}

/** The calculator tip (Math) or the reading tip (Reading and Writing). */
export interface Tip {
  kind: "calculator" | "reading";
  /** Two to five words. */
  title: string;
  /** Short steps. */
  steps: Rich[];
  /** Calculator tips: the lines to type into the graphing calculator, in order (plain text). */
  type?: string[];
  /** When working by hand is faster, a line that says so. */
  note?: Rich;
}

/** The quick check inside the lesson: one question, answered at once, with the reason. */
export interface QuickCheck {
  text: Rich;
  passage?: Rich;
  choices: Rich[];
  right: number;
  why: Rich;
}

/** The strategy the lesson teaches and the quiz practices. */
export interface Strategy {
  /** Two to four words ("Fraction of the circle"). */
  name: string;
  /** Its steps, each a short line. */
  steps: Rich[];
}

/** One skill's lesson. Its name, section and domain come from SKILLS72 by `id`. */
export interface Lesson {
  /** The skill's ID in src/lib/skills/ids72.ts. */
  id: string;
  /** What the skill tests, in one or two short sentences. */
  tests: Rich;
  /** How to spot one: what the question usually says. */
  spot: Rich;
  /** The core idea, in two to four short paragraphs (a sentence or two each). */
  idea: Rich[];
  /** The key rules or formulas, shown as chips under the idea. */
  rules?: Rich[];
  /** The picture beside the idea, drawn in code. */
  figure: Figure;
  strategy: Strategy;
  /** Two or three worked examples; the last is faded (`tryFrom`). */
  examples: WorkedExample[];
  /** Two or three traps. */
  traps: Trap[];
  tip: Tip;
  check: QuickCheck;
  /** The strategy quiz, at most five questions, easy to harder. */
  quiz: StrategyQuestion[];
}

/** A narrated video walk-through, drawn in code (videos.ts). */
export interface LessonVideo {
  id: string;
  /** The narrator: a calm, friendly voice from a commercial-use model; never a real person's clone. */
  voice: { name: string; gender: "male" | "female"; engine: string; license: string };
  /** The narration's address, or null until it is recorded. */
  audio: string | null;
  /** Length in seconds. */
  duration: number;
  /** Scenes in order; each is one caption, with what is drawn while it is said. */
  scenes: VideoScene[];
}

export interface VideoScene {
  /** Start and end, in seconds from the start. */
  start: number;
  end: number;
  /** The narration for this scene, shown as the caption. */
  say: Rich;
  /** A heading on the board while it plays ("The idea", "Question 1"). */
  title?: string;
  /** The question being worked, kept on the board. */
  problem?: Rich;
  choices?: Rich[];
  /** The board's lines written so far in this part. */
  board?: Rich[];
  /** The picture while it plays. */
  figure?: Figure;
  /** The choice to light up, when the answer is reached. */
  pick?: number;
}
