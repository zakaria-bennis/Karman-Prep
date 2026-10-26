// Golden corpus case shape (PR-40). Relative imports only.

import type { ParseErrorCode } from "../latex/errors";

export type RowKind =
  | "empty"
  | "value"
  | "definition"
  | "dependent-definition"
  | "function-definition"
  | "curve-y"
  | "curve-x"
  | "implicit"
  | "vertical-lines"
  | "horizontal-lines"
  | "region"
  | "constant-relation"
  | "regression" // PR-30, D-2: L ~ M
  | "unsolved-relation"
  | "point"
  | "table" // D-1
  | "error";
export type RowErrorCode =
  | ParseErrorCode
  | "too-many-params"
  | "duplicate-definition"
  | "dependency"
  | "cycle" // names defined in terms of each other, alphabetically
  | "function-cycle" // functions defined in terms of each other, in Desmos's order
  | "recursive-cycle" // the same, passing other arguments around the cycle (a recursion)
  | "implicit-variables" // a value defined in terms of itself, `a=a+1`
  | "repeated-parameter" // `f(x,x)=x`
  | "function-coordinate" // a coordinate the parameters leave out, `f(x)=y`
  | "for-list" // NM-37: a comprehension's definition that is not a list, `[n\operatorname{for}n=1]`
  | "parameter-defined" // a constant as a parameter, `f(e)=e`, `f(\pi)=1`
  | "equation-required" // an expression in x and y, or that is only a name: needs `y=` or `=`
  | "reserved-name"
  | "arity"
  | "prime-arity" // FN-63: a prime on a function of other than one argument, `g'(1,2)`
  | "point-coordinates"
  | "mixed-variables"
  | "polar-variable"
  | "timeout"
  | "regression-data" // D-22
  | "regression-predictor" // D-22
  | "regression-params" // D-22
  | "regression-fit" // D-24
  | "nested-list" // NM-34
  | "sample-size" // `random(-1)`
  | "nested-empty-list" // NM-34: an empty list in a list, `[[]]`
  | "list-too-long" // NM-35, NM-42
  | "range-step" // NM-36
  | "list-mixed" // PR-34: numbers and points in one list
  | "too-many-variables" // RC-10: undefined names; the row view adds it, the analysis gives chips
  | "index-type" // NM-30: indexing something that is not a list, `5[1]`
  | "list-length-free" // NM-31, NM-36: a list whose length depends on x or y
  | "reducer-arguments" // FN-23: `mean()`
  | "first-argument-list" // FN-27: `quantile(5,0.5)`
  | "argument-type" // FN-2, FN-23, FN-27: `median(P)` of a list of points P
  | "both-lists" // FN-30: `cov(1,2)`
  | "repeat-count" // FN-34: `repeat(1,2.5)`
  | "repeat-counts" // FN-34: `repeat([1,2],[1.5,2])`
  | "refused-function" // a Desmos built-in its calculator refuses: `frequencyList(L,M)`
  | "repeat-lengths" // FN-34: `repeat([1,2,3],[1,2])`
  | "piecewise-types" // PR-31: branches of different types, `\{1>0:(1,2),3\}`
  | "comparator-types" // PR-31, NM-31: comparing a point, `\{(1,2)=(1,2):1,0\}`
  | "chained-equation" // RC-14: graphing `x=y=3`
  | "long-chain" // RC-14: graphing more than two inequalities, `0<x<y<3`
  | "double-inequality" // RC-14: a graphed double inequality not solved for x or y, `x<1<2`
  | "double-direction" // RC-14: a graphed double inequality pointing both ways, `1<y>0`
  | "distribution-call" // FN-47: `pdf(normaldist())`, pdf without a distribution and a number
  | "distribution-function" // FN-45: `N(1)` with N a distribution
  | "add-types" // FN-45: `normaldist()+1`; the next four are the other operators'
  | "subtract-types"
  | "multiply-types"
  | "divide-types"
  | "power-types"
  | "negate-type"
  | "point-coordinate-type" // NM-32: a point as a point's coordinate, `((0,0),(4,0))`
  | "coordinate-type" // PR-45: `a.x` with a a number
  | "point-function-arguments" // FN-70, FN-71: `distance(1,2)`
  | "point-function-arity" // FN-70, FN-71: three arguments
  | "dot-call" // FN-70: `(0,0).\operatorname{distance}((3,4))`
  | "member-target"; // FN-71: `(0,0).\operatorname{midpoint}((2,4))`
export interface CorpusSettings {
  angleMode?: "radians" | "degrees";
  complex?: boolean;
}
export type CorpusInput =
  | { latex: string } // typed, API and plain paste dialect
  | { keys: string[] } // MathField keystrokes, e.g. ["y","=","x","^","2","Right","+","3","/","4"]
  | { question: string; context?: "math" | "cell" | "coordinate" } // question dialect (TR-7)
  | { pastedQuestionMath: string }; // OI-6: rendered question math pasted
export interface CorpusCase {
  id: string; // "<case-file>-<n>", unique across the corpus
  rules: string[]; // spec IDs this case checks
  input: CorpusInput;
  rows?: string[]; // context rows, in order, before the case row
  settings?: CorpusSettings;
  tree?: string; // toSExpr
  latex?: string; // printLatex output, MathField latex() for keys, or the toPasteLatex output
  // written to MathQuill for pastedQuestionMath cases
  kind?: RowKind;
  chips?: string[]; // RC-10 names in order
  display?: string; // formatValue text
  error?: RowErrorCode;
}
export type InputKind = "latex" | "keys" | "question" | "pastedQuestionMath";
export type ExpectedField = "tree" | "latex" | "kind" | "chips" | "display" | "error";

export const EXPECTED_FIELDS: readonly ExpectedField[] = [
  "tree",
  "latex",
  "kind",
  "chips",
  "display",
  "error",
];

export function inputKind(input: CorpusInput): InputKind {
  if ("latex" in input) return "latex";
  if ("keys" in input) return "keys";
  if ("question" in input) return "question";
  return "pastedQuestionMath";
}

/** Expected fields present on `c`, in EXPECTED_FIELDS order. */
export function expectedFields(c: CorpusCase): ExpectedField[] {
  return EXPECTED_FIELDS.filter((f) => c[f] !== undefined);
}
