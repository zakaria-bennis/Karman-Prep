// Independent answer checks for the lessons (tests only; the app never imports this folder). A second
// writer, who has not seen which choice the lesson marks right, works every problem out here: a Math
// value is computed in code from the problem's own numbers; a Reading and Writing answer is solved blind
// and recorded as the choice's index. lessons.test.ts then compares each with the lesson.

/** What the right answer must be. */
export type Expect =
  /** The answer's value (compared with the right choice's value, or with the example's answer line). */
  | number
  /** A pair, such as a point (x, y) or two solutions in order. */
  | readonly [number, number]
  /** An expression in x: the right choice must match it at several values of x. */
  | ((x: number) => number)
  /** The right choice contains this text (case and spacing ignored). */
  | { text: string }
  /** The right choice by index, solved blind, when no value fits (Reading and Writing, or a choice
   *  that is a statement rather than a number). */
  | { index: number };

export interface LessonChecks {
  /** One per worked example, in order. */
  examples: Expect[];
  check: Expect;
  /** One per strategy-quiz question, in order. */
  quiz: Expect[];
}
