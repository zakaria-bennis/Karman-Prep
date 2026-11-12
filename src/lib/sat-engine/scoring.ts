/*
 * Section scoring like the digital SAT: every operational answer in both modules goes into one
 * maximum-likelihood ability estimate (3PL, 2PL for grid-ins), so which questions a student got
 * right matters, not only how many. Unscored (pretest) questions are left out. The estimate becomes a
 * 200-800 score with a range of one standard error either side, like the SAT score report.
 */
import { mle, type Response } from "./irt";
import { paramsOf, type EngineItem, type Section } from "./params";
import { sectionScaleScore } from "./scale";

export type AnsweredItem = { item: EngineItem; correct: boolean; pretest?: boolean };

export type SectionResult = {
  section: Section;
  theta: number;
  se: number;
  score: number;
  /** Score range, one standard error either side, rounded to 10. */
  low: number;
  high: number;
  right: number;
  scored: number;
  route: "harder" | "easier";
};

export function toResponses(answers: readonly AnsweredItem[]): Response[] {
  return answers
    .filter((a) => !a.pretest)
    .map((a) => ({ item: paramsOf(a.item), correct: a.correct }));
}

export function scoreSection(input: {
  section: Section;
  module1: readonly AnsweredItem[];
  module2: readonly AnsweredItem[];
  route: "harder" | "easier";
}): SectionResult {
  const operational = [...input.module1, ...input.module2].filter((a) => !a.pretest);
  const { theta, se } = mle(toResponses(operational));
  return {
    section: input.section,
    theta,
    se,
    score: sectionScaleScore(input.section, theta),
    low: sectionScaleScore(input.section, theta - se),
    high: sectionScaleScore(input.section, theta + se),
    right: operational.filter((a) => a.correct).length,
    scored: operational.length,
    route: input.route,
  };
}

export function totalScore(reading: SectionResult, math: SectionResult) {
  return {
    score: reading.score + math.score,
    low: reading.low + math.low,
    high: reading.high + math.high,
  };
}
