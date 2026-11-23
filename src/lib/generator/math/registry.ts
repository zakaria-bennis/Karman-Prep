/*
 * Every Math item model, by skill (one file per 72-skill in skills/). A template id is stable
 * forever (stored with each question): add templates freely, never rename or reuse an id.
 */
import type { Template } from "./core/types";
import { TEMPLATES as solvingLinearEquations } from "./skills/solving-linear-equations";
import { TEMPLATES as numberOfSolutions } from "./skills/number-of-solutions";
import { TEMPLATES as equationsFromWords } from "./skills/equations-from-words";
import { TEMPLATES as slopeAndRateOfChange } from "./skills/slope-and-rate-of-change";
import { TEMPLATES as graphsOfLines } from "./skills/graphs-of-lines";
import { TEMPLATES as parallelAndPerpendicularLines } from "./skills/parallel-and-perpendicular-lines";
import { TEMPLATES as linearFunctions } from "./skills/linear-functions";
import { TEMPLATES as solvingSystems } from "./skills/solving-systems";
import { TEMPLATES as systemsInContext } from "./skills/systems-in-context";
import { TEMPLATES as linearInequalities } from "./skills/linear-inequalities";
import { TEMPLATES as expandingAndFactoring } from "./skills/expanding-and-factoring";
import { TEMPLATES as rationalExpressions } from "./skills/rational-expressions";
import { TEMPLATES as exponentsAndRadicals } from "./skills/exponents-and-radicals";
import { TEMPLATES as solvingQuadratics } from "./skills/solving-quadratics";
import { TEMPLATES as graphsOfQuadratics } from "./skills/graphs-of-quadratics";
import { TEMPLATES as exponentialFunctions } from "./skills/exponential-functions";
import { TEMPLATES as radicalAndRationalEquations } from "./skills/radical-and-rational-equations";
import { TEMPLATES as nonlinearSystems } from "./skills/nonlinear-systems";
import { TEMPLATES as polynomials } from "./skills/polynomials";
import { TEMPLATES as functionsAndTransformations } from "./skills/functions-and-transformations";
import { TEMPLATES as ratiosAndProportions } from "./skills/ratios-and-proportions";
import { TEMPLATES as unitsAndConversions } from "./skills/units-and-conversions";
import { TEMPLATES as percentages } from "./skills/percentages";
import { TEMPLATES as meanMedianAndSpread } from "./skills/mean-median-and-spread";
import { TEMPLATES as readingDataDisplays } from "./skills/reading-data-displays";
import { TEMPLATES as scatterplots } from "./skills/scatterplots";
import { TEMPLATES as probability } from "./skills/probability";
import { TEMPLATES as samplesAndMarginOfError } from "./skills/samples-and-margin-of-error";
import { TEMPLATES as studiesAndExperiments } from "./skills/studies-and-experiments";
import { TEMPLATES as areaAndPerimeter } from "./skills/area-and-perimeter";
import { TEMPLATES as volumeAndSurfaceArea } from "./skills/volume-and-surface-area";
import { TEMPLATES as linesAndAngles } from "./skills/lines-and-angles";
import { TEMPLATES as triangles } from "./skills/triangles";
import { TEMPLATES as rightTriangles } from "./skills/right-triangles";
import { TEMPLATES as trigonometricRatios } from "./skills/trigonometric-ratios";
import { TEMPLATES as circles } from "./skills/circles";
import { TEMPLATES as circleEquations } from "./skills/circle-equations";
import { TEMPLATES as radians } from "./skills/radians";

export const MATH_TEMPLATES: readonly Template[] = [
  ...solvingLinearEquations,
  ...numberOfSolutions,
  ...equationsFromWords,
  ...slopeAndRateOfChange,
  ...graphsOfLines,
  ...parallelAndPerpendicularLines,
  ...linearFunctions,
  ...solvingSystems,
  ...systemsInContext,
  ...linearInequalities,
  ...expandingAndFactoring,
  ...rationalExpressions,
  ...exponentsAndRadicals,
  ...solvingQuadratics,
  ...graphsOfQuadratics,
  ...exponentialFunctions,
  ...radicalAndRationalEquations,
  ...nonlinearSystems,
  ...polynomials,
  ...functionsAndTransformations,
  ...ratiosAndProportions,
  ...unitsAndConversions,
  ...percentages,
  ...meanMedianAndSpread,
  ...readingDataDisplays,
  ...scatterplots,
  ...probability,
  ...samplesAndMarginOfError,
  ...studiesAndExperiments,
  ...areaAndPerimeter,
  ...volumeAndSurfaceArea,
  ...linesAndAngles,
  ...triangles,
  ...rightTriangles,
  ...trigonometricRatios,
  ...circles,
  ...circleEquations,
  ...radians,
];

export function templatesFor(skillId: string): Template[] {
  return MATH_TEMPLATES.filter((t) => t.skill === skillId);
}

export function templateById(id: string): Template | undefined {
  return MATH_TEMPLATES.find((t) => t.id === id);
}
