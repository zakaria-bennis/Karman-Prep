/*
 * The predicted score for a Karman full-length practice test: one number per section and one
 * total, never a range (founder, 2026-11-08). It is our own estimate from this practice test,
 * not an official score, and the screens must say so.
 *
 * Each answer earns credit weighted by its difficulty (harder questions count more). A student
 * routed to the easier Module 2 can reach at most 650 in that section, as on the digital SAT
 * where the easier second module caps the section score.
 */
import { routeHarder, type Section } from "./forms";

export type ScoredAnswer = { difficulty: number; correct: boolean };

const weight = (difficulty: number) => 0.6 + 0.1 * Math.max(1, Math.min(7, difficulty));
const roundTen = (n: number) => Math.round(n / 10) * 10;

export const EASIER_ROUTE_CAP = 650;

export function sectionScore(input: {
  section: Section;
  module1: readonly ScoredAnswer[];
  module2: readonly ScoredAnswer[];
}): number {
  const all = [...input.module1, ...input.module2];
  if (!all.length) return 200;
  const total = all.reduce((n, a) => n + weight(a.difficulty), 0);
  const earned = all.reduce((n, a) => n + (a.correct ? weight(a.difficulty) : 0), 0);
  const harder = routeHarder(input.section, input.module1.filter((a) => a.correct).length);
  const top = harder ? 800 : EASIER_ROUTE_CAP;
  return Math.max(200, Math.min(800, roundTen(200 + (top - 200) * (earned / total))));
}

export function predictedTotal(sections: { reading: number; math: number }): number {
  return sections.reading + sections.math;
}

/** The diagnostic has one module per section; the same weighting, no routing cap. */
export function diagnosticSectionScore(answers: readonly ScoredAnswer[]): number {
  if (!answers.length) return 200;
  const total = answers.reduce((n, a) => n + weight(a.difficulty), 0);
  const earned = answers.reduce((n, a) => n + (a.correct ? weight(a.difficulty) : 0), 0);
  return Math.max(200, Math.min(800, roundTen(200 + 600 * (earned / total))));
}
