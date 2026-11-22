/*
 * The shapes every Math item model (template) works with. A template draws numbers with a
 * seeded Rng and returns a Draft: the question, the exact answer, the named slips that make
 * the wrong choices, the full-teaching explanation in parts, a hint, a difficulty, and an
 * independent check. build.ts turns a Draft into a finished, checked item.
 */
import type { FigureSpec } from "@/lib/figures/engine/spec";
import type { Rng } from "./rng";
import type { Sym } from "./sym";

/** mc: four choices, one right. spr: the student types a number (student-produced response). */
export type Format = "mc" | "spr";

/** One answer a student could give. */
export interface Answer {
  /** What the student sees, as MathText: "$-\\frac{3}{4}$", "$2x + 3$", "The cost per mile". */
  text: string;
  /** The exact value, when the answer is a number. */
  value?: Sym;
  /**
   * The answer as a function of the question's variables, when it is an expression. The check
   * compares candidates at many points, so two forms of the same expression count as equal.
   */
  expr?: (vars: Readonly<Record<string, number>>) => number;
  /** A stable name, when the answer is a statement or a category ("no-solution", "slope"). */
  key?: string;
}

/** A wrong answer, and the slip that produces it. */
export interface Slip extends Answer {
  /**
   * What a student did to get this answer, as a short clause in the second person, no period:
   * "you added 7 to both sides instead of subtracting it". It is shown after the answer's words.
   */
  why: string;
}

/** One numbered step: a goal label (2 to 6 words) and the work in the question's own numbers. */
export interface Step {
  /** The goal, not the arithmetic: "Get the x-term alone", "Find the slope". */
  label: string;
  /** The move, with $...$ math, and the reason where a student would ask why. */
  work: string;
}

export interface Draft {
  format: Format;
  /** The question as MathText. Standalone equations may sit on their own line in $$...$$. */
  stem: string;
  /** A figure in the figure engine's format, when the question needs one. */
  figure?: FigureSpec;
  answer: Answer;
  /**
   * Wrong answers from named slips, most common first. Multiple choice needs at least three
   * that are distinct from the answer and from each other; extra ones are spares. For spr they
   * become the "Watch out" lines (the first two are used).
   */
  slips: Slip[];
  /** What the question really asks, in one plain sentence. */
  asks: string;
  steps: Step[];
  /** A check of the answer by a different route (substitute back, estimate, recount). */
  check: string;
  /** One sentence the student can use on a different question of this skill. */
  tip: string;
  /** One short nudge toward the first move. Never the answer. */
  hint: string;
  /** Editorial difficulty, 1 (easiest) to 7 (hardest), inside the template's range. */
  difficulty: number;
  /**
   * The independent check: true exactly when a candidate is right. It must not reuse the work
   * that built the answer: substitute into the original condition, recount, test at points.
   */
  isCorrect(candidate: Answer): boolean;
  /** spr only: the stored key ("3/4", "12", "-2.5"). Defaults to the answer's exact value. */
  key?: string;
}

export interface Template {
  /** Unique and stable forever: questions point at it. "lin-eq.two-step". */
  id: string;
  /** The 72-skill id (src/lib/skills/ids72.ts), always an "m-" id. */
  skill: string;
  /** What the template makes, for the admin and the docs. */
  label: string;
  /** The editorial difficulty range of its drafts, inclusive. */
  difficulty: readonly [number, number];
  /** The formats it can make. */
  formats: readonly Format[];
  /** One draft from these draws. Throw (anything) to have the builder draw again. */
  make(rng: Rng, format: Format): Draft;
}

export type Letter = "A" | "B" | "C" | "D";

/** A finished, checked Math question, ready to store. */
export interface MathItem {
  templateId: string;
  skill: string;
  seed: number;
  attempt: number;
  format: Format;
  stem: string;
  figure: FigureSpec | null;
  /** Four choices for mc (in display order), none for spr. */
  choices: { letter: Letter; text: string; correct: boolean }[];
  /** mc: the right letter. spr: the numeric key. */
  key: string;
  explanation: string;
  hint: string;
  difficulty: number;
  /** The checks this item passed, by name. */
  checks: string[];
}
