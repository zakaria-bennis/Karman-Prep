// Parse error codes and shape.

import type { SourceSpan } from "./ast";

export type ParseErrorCode =
  | "syntax"
  | "unsupported"
  | "point-arity"
  | "relation-chain"
  | "too-many-nodes"
  | "too-deep"
  | "sim-side" // PR-30: a regression row with nothing on one side of `\sim`
  | "function-parentheses" // PR-24: a built-in that needs `(` written without one
  | "argument-parentheses" // PR-24: a run without `(` followed by another built-in call
  | "comma-side" // PR-25: an empty argument beside a comma in a call
  | "range-bound" // PR-34: a range with nothing before or after its ellipsis
  | "log-power" // PR-26: a power other than 2 on the name `log` or `ln`
  | "empty-subscript" // PR-27: `\log_{}`
  | "name-subscript"; // PR-27: a subscript on a trig, hyperbolic or `ln` name
export interface ParseError {
  code: ParseErrorCode;
  span: SourceSpan;
  detail: string; // English, logs and tests only
  // `unsupported`: the deferred notation a row error names ("Indexing a list");
  // `function-parentheses`, `argument-parentheses`, `log-power` and `name-subscript`: the
  // built-in's name ("floor")
  feature?: string;
}

const PARSE_ERROR_CODES: ReadonlySet<string> = new Set<ParseErrorCode>([
  "syntax",
  "unsupported",
  "point-arity",
  "relation-chain",
  "too-many-nodes",
  "too-deep",
  "sim-side",
  "function-parentheses",
  "argument-parentheses",
  "comma-side",
  "range-bound",
  "log-power",
  "empty-subscript",
  "name-subscript",
]);

export function isParseErrorCode(code: string): code is ParseErrorCode {
  return PARSE_ERROR_CODES.has(code);
}

/**
 * Notation the parser or analysis reads but whose meaning has not shipped (PR-34's indexing,
 * slicing, filtering and comprehensions, NM-30, NM-31, NM-37; G-22's list-valued curves). An
 * `unsupported` row error naming one of these reads "{feature} isn't supported yet." (R-2).
 */
export const DEFERRED_FEATURES = Object.freeze({
  index: "Indexing a list",
  slice: "Slicing a list",
  filter: "Filtering a list",
  comprehension: "Building a list with 'for'",
  listCurves: "Graphing a list of curves",
} as const);
