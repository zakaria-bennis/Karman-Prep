// Parse error codes and shape (01-interfaces.md section 1).

import type { SourceSpan } from "./ast";

export type ParseErrorCode =
  | "syntax"
  | "unsupported"
  | "point-arity"
  | "relation-chain"
  | "too-many-nodes"
  | "too-deep"
  | "sim-side"; // PR-30: a regression row with nothing on one side of `\sim`
export interface ParseError {
  code: ParseErrorCode;
  span: SourceSpan;
  detail: string; // English, logs and tests only
  feature?: string; // `unsupported` only: the deferred notation a row error names ("Indexing a list")
}

const PARSE_ERROR_CODES: ReadonlySet<string> = new Set<ParseErrorCode>([
  "syntax",
  "unsupported",
  "point-arity",
  "relation-chain",
  "too-many-nodes",
  "too-deep",
  "sim-side",
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
