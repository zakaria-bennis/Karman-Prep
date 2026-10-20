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
  | "cycle"
  | "reserved-name"
  | "arity"
  | "point-coordinates"
  | "mixed-variables"
  | "polar-variable"
  | "timeout"
  | "regression-data" // D-22
  | "regression-predictor" // D-22
  | "regression-params" // D-22
  | "regression-fit" // D-24
  | "nested-list" // NM-34
  | "list-too-long" // NM-35, NM-42
  | "range-step" // NM-36
  | "list-mixed" // PR-34: numbers and points in one list
  | "index-type" // NM-30: indexing something that is not a list, `5[1]`
  | "list-length-free"; // NM-31, NM-36: a list whose length depends on x or y
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
