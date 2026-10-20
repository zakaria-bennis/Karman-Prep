// FN-80, FN-81, NM-32, PR-45, RC-15: every live Desmos value, error text and graphed row the
// function catalogue captured for points, point arithmetic (M4), the members .x and .y, distance
// and midpoint (desmos-geometry.fixture.json, copied from its ALL.values.json). A key's rows are
// separated by " ;; ", the last one being the case; " [degrees]" marks degree mode. A point is
// [x, y], null for an undefined coordinate. Not yet matched, each an expected failure that fails
// once matched, by the notation they use that has not shipped: 3D points and the cross product,
// comprehensions (`for`) and `with`, the hidden names hypot, pointDot, pointDet, pointPerp and
// complexMultiplyPoints, length's dot call, parametric points in t (RC-16), `y=` rows, which
// Desmos gives a value when the right side is constant, and Desmos's free-variable texts ("Too
// many variables. Try defining 'i'.", `\int` bounds, `distance((0,0),(i,1))`'s "Try adding 'y='").
import { expect, it } from "vitest";
import { analyzeRows } from "../analysis";
import { rowErrorMessage } from "../analysis/messages";
import { evaluateLatex, type EvalSettings } from "../eval/compile";
import type { Value } from "../eval/values";
import geometry from "./desmos-geometry.fixture.json";
import { withinTolerance } from "./tolerance";

type Coordinate = number | null;
type Captured = Coordinate | Coordinate[] | Coordinate[][];

const GAPS: readonly RegExp[] = [
  /^(?!.*length).*(\(\d,\d,\d|\\times\()/,
  /\\operatorname\{(for|with)\}/,
  /\\operatorname\{(hypot|pointDot|pointDet|pointPerp|complexMultiplyPoints)\}/,
  /\.\\operatorname\{length\}/,
  /\(t,|;; y=/,
  /\(i,1\)|\\int|^area|^dist$/,
];
const isGap = (key: string) => GAPS.some((gap) => gap.test(key));

function caseOf(key: string): { latex: string; rows: string[]; settings: Partial<EvalSettings> } {
  const degrees = key.endsWith(" [degrees]");
  const parts = (degrees ? key.slice(0, -" [degrees]".length) : key).split(" ;; ");
  return {
    latex: parts[parts.length - 1],
    rows: parts.slice(0, -1),
    settings: degrees ? { angleMode: "degrees" } : {},
  };
}

function lastRow(rows: readonly string[], latex: string) {
  const all = [...rows, latex].map((row, i) => ({ id: `row-${i}`, latex: row, hidden: false }));
  return analyzeRows(all, { angleMode: "radians", complex: false }).rows[rows.length];
}

function matches(v: Value, expected: Coordinate): boolean {
  if (expected === null) return v.type === "undefined";
  if (v.type !== "number") return false;
  return Number.isInteger(expected)
    ? v.value === expected
    : withinTolerance(v.value, expected, "default");
}

/** A point's coordinate: NaN is Desmos's null. */
function sameCoordinate(c: number, expected: Coordinate): boolean {
  if (expected === null) return Number.isNaN(c);
  return Number.isInteger(expected) ? c === expected : withinTolerance(c, expected, "default");
}

function samePoint(v: Value, expected: Coordinate[]): boolean {
  return (
    v.type === "point" &&
    v.value.length === expected.length &&
    expected.every((e, k) => sameCoordinate(v.value[k], e))
  );
}

/** A number list is [1, 2]; a point [1, 2] too, told apart by the value; a point list [[1, 2]]. */
function sameValue(v: Value, expected: Captured): boolean {
  if (!Array.isArray(expected)) return matches(v, expected);
  if (v.type === "point") return samePoint(v, expected as Coordinate[]);
  return (
    v.type === "list" &&
    v.value.length === expected.length &&
    expected.every((e, i) => (Array.isArray(e) ? samePoint(v.value[i], e) : matches(v.value[i], e)))
  );
}

const VALUES = Object.entries(geometry.values) as [string, Captured][];
const ERRORS = Object.entries(geometry.errors);
const GRAPHED = Object.keys(geometry.graphed);

it("FN-70 FN-71 NM-32 PR-45 all 114 catalogue point values are checked, 95 matched", () =>
  expect([VALUES.length, VALUES.filter(([key]) => !isGap(key)).length]).toEqual([114, 95]));

for (const [key, expected] of VALUES) {
  const check = () => {
    const { latex, rows, settings } = caseOf(key);
    expect(lastRow(rows, latex).error).toBe(null);
    const v = evaluateLatex(latex, { rows, settings });
    expect(sameValue(v, expected), JSON.stringify(v)).toBe(true);
  };
  const shown = JSON.stringify(expected).slice(0, 60);
  if (isGap(key)) it.fails(`not yet matched: ${key} is ${shown} in Desmos`, check);
  else it(`FN-70 FN-71 NM-32 PR-45 ${key} is ${shown}, as in Desmos`, check);
}

it("FN-70 FN-71 NM-32 PR-45 all 61 catalogue point errors are checked, 44 matched", () =>
  expect([ERRORS.length, ERRORS.filter(([key]) => !isGap(key)).length]).toEqual([61, 44]));

// A row's error is its analysis error or, as the row shows it, the error its value carries
// (`[(1,2),3]`, NM-32).
function shownError(rows: readonly string[], latex: string): string | undefined {
  const error = lastRow(rows, latex).error?.message;
  if (error !== undefined) return error;
  const v = evaluateLatex(latex, { rows: [...rows] });
  return v.type === "undefined" && v.error !== undefined ? rowErrorMessage(v.error, []) : undefined;
}

for (const [key, message] of ERRORS) {
  const check = () => {
    const { latex, rows } = caseOf(key);
    expect(shownError(rows, latex)).toBe(message);
  };
  if (isGap(key)) it.fails(`not yet matched: ${key} reads "${message}" in Desmos`, check);
  else it(`FN-70 FN-71 NM-32 PR-45 ${key} reads "${message}", as in Desmos`, check);
}

it("FN-70 FN-71 RC-15 all 7 catalogue rows Desmos graphs without a value are checked", () =>
  expect(GRAPHED.length).toBe(7));

for (const key of GRAPHED) {
  const check = () => {
    const { latex, rows } = caseOf(key);
    const row = lastRow(rows, latex);
    expect([row.error, row.isGraphable]).toEqual([null, true]);
  };
  if (isGap(key)) it.fails(`not yet matched: ${key} graphs in Desmos`, check);
  else it(`FN-70 FN-71 RC-15 ${key} graphs, as in Desmos`, check);
}

// M4, M5 (RC-6, RC-15, G-3): Desmos draws a point-valued row, so arithmetic that gives a point,
// a point definition, a list-of-points definition and a bare name that holds points all graph as
// points (plan.md design note 4); a dot product is a number and does not.
it("RC-6 RC-15 G-3 point definitions, point names and point arithmetic graph as points, as in Desmos", () => {
  const graphOf = (rows: readonly string[], latex: string) => {
    const row = lastRow(rows, latex);
    return [row.kind, row.isGraphable, row.graph?.kind ?? null];
  };
  expect([
    graphOf([], "A=(1,2)"),
    graphOf([], "P=[(1,2),(3,4)]"),
    graphOf(["P=[(1,2),(3,4)]"], "P"),
    graphOf(["P=[(1,2),(3,4)]"], "P[2]"),
    graphOf([], "(1,2)+(3,4)"),
    graphOf([], "2(1,2)"),
    graphOf(["A=(1,2)"], "M=\\operatorname{midpoint}(A,(3,4))"),
    graphOf([], "(1,2)\\cdot(3,4)"),
    graphOf([], "a=1"),
  ]).toEqual([
    ["definition", true, "point"],
    ["definition", true, "point"],
    ["point", true, "point"],
    ["point", true, "point"],
    ["point", true, "point"],
    ["point", true, "point"],
    ["definition", true, "point"],
    ["value", false, null],
    ["definition", false, null],
  ]);
});
