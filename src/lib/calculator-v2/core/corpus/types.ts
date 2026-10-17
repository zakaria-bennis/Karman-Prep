// Golden corpus case shape (PR-40; 01-interfaces.md section 2). Relative imports only.

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
  | "unsolved-relation"
  | "point"
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
  | "timeout";
export interface CorpusSettings {
  angleMode?: "radians" | "degrees";
  complex?: boolean;
}
export type CorpusInput =
  | { latex: string } // typed, API and plain paste dialect
  | { keys: string[] } // MathField keystrokes, e.g. ["y","=","x","^","2","Right","+","3","/","4"]
  | { question: string; context?: "math" | "cell" | "coordinate" } // question dialect (TR-7)
  | { pastedQuestionMath: string }; // OI-6: rendered question math pasted (13-paste-standalone)
export interface CorpusCase {
  id: string; // "<case-file>-<n>", unique across the corpus
  rules: string[]; // spec IDs this case checks
  input: CorpusInput;
  rows?: string[]; // context rows, in order, before the case row
  settings?: CorpusSettings;
  tree?: string; // toSExpr
  latex?: string; // printLatex output, MathField latex() for keys, or the toPasteLatex output
  // written to MathQuill for pastedQuestionMath cases (13)
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
