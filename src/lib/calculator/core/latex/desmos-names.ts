// The reference's built-ins outside the operator-name allowlist that this calculator does not
// evaluate, with the argument counts live Desmos accepts and whether its graphing calculator
// refuses them (function catalogue, 2026-10-19; checked again 2026-10-20). Data only: no imports,
// so the allowlist and the parser can both read it.

/**
 * Accepted argument counts; `max` alone checks only too many, as for the geometry tools, whose
 * too-few calls the reference answers with what their points must be.
 */
export interface Rule {
  counts?: readonly number[];
  max?: number;
  refused?: true; // the reference's graphing calculator refuses the function once its count passes
}

const R = { refused: true } as const;
const n = (...counts: number[]): Rule => ({ counts });
const refusedWith = (...counts: number[]): Rule => ({ counts, refused: true });
const atMost = (max: number): Rule => ({ max, refused: true });

/** The reference's built-ins outside the operator-name allowlist, by name. */
export const DESMOS_ONLY_CALLS: ReadonlyMap<string, Rule> = new Map<string, Rule>([
  // refused by the graphing calculator: geometry tools, complex and matrix internals
  ...["segment", "line", "ray", "vector", "circle"].map((k): [string, Rule] => [
    k,
    atMost(k === "circle" ? 2 : 2),
  ]),
  ...["arc", "angle", "directedangle"].map((k): [string, Rule] => [k, atMost(3)]),
  ...[
    "vertices",
    "segments",
    "perimeter",
    "area",
    "angles",
    "directedangles",
    "glider",
    "translate",
    "rotate",
    "dilate",
    "reflect",
    "triangle",
    "sphere",
    "inv",
    "complexMultiplyPoints",
    "coerceComplexToReal",
    "coerceRealToComplex",
    "coerceComplexToRealWithTolerance",
    "peelableCoerceComplexToRealWithTolerance",
  ].map((k): [string, Rule] => [k, R]),
  ["complex", refusedWith(2)],
  ["complexDivide", refusedWith(2)],
  ["cumulativeSum", refusedWith(1)],
  ["zeroMatrix", refusedWith(2)],
  ["submatrix", refusedWith(3)],
  ["matrixElement", refusedWith(3)],
  ...["coerceMatrixToNumber", "colCount", "rowCount", "rowMatrix", "hcat", "vcat"].map(
    (k): [string, Rule] => [k, refusedWith(1)]
  ),
  // evaluated by the reference, not yet here
  ...[
    "factorial",
    "inverse",
    "reflection",
    "restriction",
    "restrictionToBoolean",
    "translation",
    "trapezoidalPartition",
    "validateSampleCount",
    "complexArctan",
  ].map((k): [string, Rule] => [k, n(1)]),
  ...[
    "chisqpdf",
    "complexLogbase",
    "complexMod",
    "complexPow",
    "elementsAt",
    "geopdf",
    "hypot",
    "invChisq",
    "invGeo",
    "invPoisson",
    "lowerQuantileIndex",
    "lowerQuartileIndex",
    "pointDot",
    "poissonpdf",
    "polyGamma",
    "quartileIndex",
    "select",
    "stringsEqual",
    "upperQuantileIndex",
    "upperQuartileIndex",
    "wirtingerEqualOrWarning",
  ].map((k): [string, Rule] => [k, n(2)]),
  ...[
    "chisqIndependenceRowTotals",
    "chisqcdf",
    "chooseNonIncidentPoint",
    "geocdf",
    "invUniform",
    "normalSample",
    "poissoncdf",
  ].map((k): [string, Rule] => [k, n(3)]),
  ["uniformcdf", n(2, 3, 4)],
  ["uniformpdf", n(1, 2, 3)],
  ["validateRangeLength", n(4)],
]);

/**
 * Every built-in name the reference knows, whether or not this calculator evaluates it (its
 * built-in table and the names its error texts give, 2026-10-19). A name here is never read as a
 * variable: `\operatorname{complexSqrt}(4)` is a built-in this calculator does not evaluate,
 * while an unknown `\operatorname{foo}` is the name foo, as in Desmos.
 */
export const DESMOS_BUILTIN_NAMES: readonly string[] = (
  "abs addTangentArc addTangentCircle addTangentDirectedAngleMarker addTangentLine " +
  "addTangentPolygon addTangentRay addTangentSegment addTangentSegmentThreeD " +
  "addTangentTransformation addTangentUndirectedAngleMarker addTangentVector angle " +
  "angleStart angleVertex anglebisector angles apply arc arcArcIntersection arcCenter " +
  "arcCircleIntersection arcFirstPoint arcGlider arcLineIntersection arcMiddlePoint " +
  "arcOmega arcThirdPoint arccos arccosh arccot arccoth arccsc arccsch arcosh arcoth " +
  "arcsch arcsec arcsech arcsin arcsinh arctan arctanh area arg argmax argmin arsech " +
  "arsinh artanh assertColCount basePointFromVector basePointFromVectorThreeD binomSample " +
  "binomcdf binomialdist binompdf boxplot cdf ceil center chisqIndependenceColTotals " +
  "chisqIndependenceExpectedValues chisqIndependenceRowTotals chisqcdf chisqdist chisqgof " +
  "chisqpdf chisqtest chooseNonIncidentPoint circle circleArcIntersection " +
  "circleCircleIntersection circleGlider circleLineIntersection coerceComplexToReal " +
  "coerceComplexToRealWithTolerance coerceMatrixToNumber coerceRealToComplex colCount " +
  "columns complex complexArccos complexArccosh complexArccot complexArccoth complexArccsc " +
  "complexArccsch complexArcsec complexArcsech complexArcsin complexArcsinh complexArctan " +
  "complexArctanh complexCeil complexCos complexCosh complexCot complexCoth complexCsc " +
  "complexCsch complexDivide complexExp complexFloor complexGCD complexLCM complexLn " +
  "complexLog complexLogbase complexMod complexMultiplyPoints complexPow complexRound " +
  "complexSec complexSech complexSin complexSinh complexSortPerm complexSqrt complexTan " +
  "complexTanh compose conj corr cos cosh cot coterminal coth count cov covp csc csch " +
  "cumulativeSum det dilate dilation directedAngleMarker directedAngleMarkerMultiplier " +
  "directedAngleMarkerRawDelta directedAngleStart directedAngleVertex " +
  "directedCoterminalAngle directedangle directedanglebisector directedangles discretedist " +
  "distance distanceThreeD dotplot elementsAt end erf exp factorial floor frequencyList " +
  "frequencyListAssert gcd gcf geocdf geodist geopdf glider hcat histogram hsv hypot imag " +
  "intersection inv invBinom invChisq invGeo invNorm invPoisson invT invUniform inverse " +
  "inverseCdf inversecdf join lcm length line lineArcIntersection lineCircleIntersection " +
  "lineFromRay lineFromSegment lineGlider lineLineIntersection listMax listMin ln log " +
  "logbase lowerQuantileIndex lowerQuartileIndex mad mathVector mathVectorThreeD matrixAdd " +
  "matrixElement matrixMultiply matrixNegate matrixPow matrixScalarDivide matrixScale " +
  "matrixSubtract matrixTimesPoint matrixTimesPointThreeD max mcd mcm mean median midpoint " +
  "min mod nCr nPr normalSample normalcdf normaldist normalpdf okhsv oklab oklch parallel " +
  "pdf peelableCoerceComplexToReal peelableCoerceComplexToRealWithTolerance perimeter " +
  "perpendicular pointDet pointDot pointPerp poissonSample poissoncdf poissondist " +
  "poissonpdf polyGamma polygon polygonEdgeByParameter polygonGlider " +
  "polygonInteriorDirectedAngles polygonInteriorUndirectedAngles quantile quartile " +
  "quartileIndex radius random rank rawTransform rawTransformConj ray rayGlider real " +
  "reflect reflection repeat repeatAssert restriction restrictionToBoolean rgb rotate " +
  "rotation round rowCount rowMatrix rows rref rtxsqmone rtxsqpone scaleTangentArc " +
  "scaleTangentCircle scaleTangentDirectedAngleMarker scaleTangentLine scaleTangentPolygon " +
  "scaleTangentRay scaleTangentSegment scaleTangentTransformation " +
  "scaleTangentUndirectedAngleMarker sec sech segment segmentGlider segmentThreeD " +
  "segmentThreeDGlider segments select sgn shuffle sign signum sin sinh sort sortPerm " +
  "sortedLastLessEqualIndex sortedLastLessIndex spearman sphere start stats stdDev stdDevP " +
  "stddev stddevp stdev stdevp strictintersection stringsEqual submatrix supplement " +
  "tSample tan tanh tcdf tdist tone total tpdf trace transformAngleMarker transformArc " +
  "transformCircle transformDirectedAngleMarker transformLine transformPoint " +
  "transformPolygon transformRay transformScaleFactor transformSegment transformVector " +
  "transformWithoutTranslation translate translation transpose trapezoidalPartition " +
  "triangle tscore ttest undirectedAngleMarker undirectedAngleMarkerMultiplier " +
  "undirectedAngleMarkerRawDelta undirectedCoterminalAngle uniformSample uniformcdf " +
  "uniformdist uniformpdf unique uniquePerm upperQuantileIndex upperQuartileIndex " +
  "validateRangeLength validateSampleCount var variance varp vcat vector " +
  "vectorDisplacementAsPoint vectorThreeD vectorThreeDDisplacementAsPoint vertices " +
  "wirtingerEqualOrWarning zeroMatrix zproptest ztest"
).split(" ");
