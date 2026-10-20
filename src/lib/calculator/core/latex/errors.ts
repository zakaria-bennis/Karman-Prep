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
  | "empty-brackets" // PR-34: an index with nothing in its brackets, `L[]`
  | "log-power" // PR-26: a power other than 2 on the name `log` or `ln`
  | "empty-subscript" // PR-27: `\log_{}`
  | "empty-root" // G9: `\sqrt{}`
  | "empty-root-index" // G9: `\sqrt[]{8}`
  | "name-subscript" // PR-27: a subscript on a trig, hyperbolic or `ln` name
  | "colon-side" // PR-31: nothing on one side of a piecewise `:`, `\{1>0:\}`
  | "colon-condition" // PR-31: a `:` whose left side is not a condition, `\{3:4\}`
  | "piecewise-condition" // PR-31: a piecewise with no condition, `\{5,6\}`
  | "piecewise-part"; // PR-31: a part before the last without a condition, `\{1>0:5,6,7\}`
export interface ParseError {
  code: ParseErrorCode;
  span: SourceSpan;
  detail: string; // English, logs and tests only
  // `unsupported`: the deferred notation a row error names ("Graphing a list of curves");
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
  "empty-brackets",
  "log-power",
  "empty-subscript",
  "empty-root",
  "empty-root-index",
  "name-subscript",
  "colon-side",
  "colon-condition",
  "piecewise-condition",
  "piecewise-part",
]);

export function isParseErrorCode(code: string): code is ParseErrorCode {
  return PARSE_ERROR_CODES.has(code);
}

/**
 * Notation the parser or analysis reads but whose meaning has not shipped (PR-34's comprehensions,
 * NM-37; G-22's list-valued curves). An `unsupported` row error naming one of these reads
 * "{feature} isn't supported yet." (R-2).
 */
export const DEFERRED_FEATURES = Object.freeze({
  comprehension: "Building a list with 'for'",
  listCurves: "Graphing a list of curves",
} as const);
