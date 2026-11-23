/*
 * Item parameters for the SAT engine. Before Karman has student answers, each question's 3PL
 * parameters come from what we already know about it (cold start): its 1-7 difficulty rating,
 * its section, and whether it is multiple choice or student-produced. As answers come in,
 * `calibrate.ts` replaces these with estimates, and `blendWithPrior` moves between the two by how
 * much data an item has.
 */
import type { ItemParams } from "./irt";

export type Section = "reading" | "math";
export type AnswerFormat = "multiple-choice" | "student-produced";

/** What the engine needs to know about one bank question. */
export type EngineItem = {
  id: string;
  section: Section;
  domainId: string;
  skillId: string;
  /** Karman's 1-7 rating (1 easiest). */
  difficulty: number;
  format: AnswerFormat;
  /** Same question family = never twice on one form or across a student's forms. */
  family: string;
  /** Calibrated parameters and how many student answers back them, when there are any. */
  calibrated?: { params: ItemParams; responses: number };
};

/**
 * Cold-start difficulty (b) for each 1-7 rating. The spacing puts rating 4 at the middle of the
 * SAT population and rating 7 near the top 2 percent. It is a starting assumption to be replaced
 * by calibration, and the validation script tests how sensitive scores are to it.
 */
export const COLD_START_B: Record<number, number> = {
  1: -2.0,
  2: -1.3,
  3: -0.6,
  4: 0.0,
  5: 0.65,
  6: 1.35,
  7: 2.1,
};

/**
 * Typical discrimination on the D = 1 logistic scale (about 0.95 and 1.15 on the normal-ogive
 * scale): Math items are usually a little sharper than Reading and Writing.
 */
export const COLD_START_A: Record<Section, number> = { reading: 1.6, math: 1.95 };

/**
 * Guessing floor. Four-choice questions start at 0.2. Student-produced answers use the 2PL (no
 * guessing), as the Digital SAT does.
 */
export const COLD_START_C: Record<AnswerFormat, number> = {
  "multiple-choice": 0.2,
  "student-produced": 0,
};

export function coldStartParams(item: Pick<EngineItem, "section" | "difficulty" | "format">) {
  const level = Math.max(1, Math.min(7, Math.round(item.difficulty)));
  return {
    a: COLD_START_A[item.section],
    b: COLD_START_B[level],
    c: COLD_START_C[item.format],
  } satisfies ItemParams;
}

/**
 * Answers an item needs before its calibrated values count as much as the cold-start guess.
 * Below this, the two are blended; far above it, the calibrated values win.
 */
export const RESPONSES_FOR_HALF_WEIGHT = 150;

export function blendWithPrior(item: EngineItem): ItemParams {
  const prior = coldStartParams(item);
  if (!item.calibrated) return prior;
  const w = item.calibrated.responses / (item.calibrated.responses + RESPONSES_FOR_HALF_WEIGHT);
  const p = item.calibrated.params;
  return {
    a: Math.exp((1 - w) * Math.log(prior.a) + w * Math.log(p.a)),
    b: (1 - w) * prior.b + w * p.b,
    c: (1 - w) * prior.c + w * p.c,
  };
}

/** Parameters the engine uses for an item right now. */
export function paramsOf(item: EngineItem): ItemParams {
  return blendWithPrior(item);
}
