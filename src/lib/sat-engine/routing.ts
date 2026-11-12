/*
 * Routing after Module 1: the student goes to the harder or the easier Module 2. As on the
 * Digital SAT, the rule routes on the Module 1 ability estimate (EAP with a flat prior on [-5, 5],
 * 101 points), and the cut sits at the median student, so about half go each way.
 * `informationCrossing` gives the alternative cut where the harder module starts to measure better
 * than the easier one. `numberRightCut` turns a cut into "right answers needed" for screens.
 */
import {
  UNIFORM_GRID,
  eap,
  summedScoreEap,
  testInformation,
  type ItemParams,
  type Response,
} from "./irt";
import type { Section } from "./params";
import { thetaForScale } from "./scale";

/**
 * Section score of the median student, where the routing cut sits. Assumption: the middle of the
 * 200-800 scale. Replace with the median of real test takers once known.
 */
export const ROUTING_MEDIAN_SCORE: Record<Section, number> = { reading: 500, math: 500 };

export const medianCut = (section: Section) =>
  thetaForScale(section, ROUTING_MEDIAN_SCORE[section]);

/** The first theta, scanning upward from -3, where the harder module gives more information. */
export function informationCrossing(
  easier: readonly ItemParams[],
  harder: readonly ItemParams[]
): number {
  for (let theta = -3; theta <= 3; theta += 0.01) {
    if (testInformation(harder, theta) >= testInformation(easier, theta)) return theta;
  }
  return 0;
}

export type RoutingRule = {
  /** Route harder when the Module 1 EAP is at least this. */
  thetaCut: number;
  /** Module 1 right answers that reach the cut when every item counts alike. */
  numberRight: number;
};

/** Smallest Module 1 number right whose summed-score EAP reaches `thetaCut`. */
export function numberRightCut(module1: readonly ItemParams[], thetaCut: number): number {
  const table = summedScoreEap(module1, UNIFORM_GRID);
  const raw = table.findIndex((e) => e.theta >= thetaCut);
  return raw < 0 ? module1.length + 1 : raw;
}

export function routingRule(module1: readonly ItemParams[], thetaCut: number): RoutingRule {
  return { thetaCut, numberRight: numberRightCut(module1, thetaCut) };
}

/** Pattern routing: the operational Module 1 answers decide. */
export function routeHarder(module1: readonly Response[], rule: RoutingRule): boolean {
  return eap(module1, UNIFORM_GRID).theta >= rule.thetaCut;
}
