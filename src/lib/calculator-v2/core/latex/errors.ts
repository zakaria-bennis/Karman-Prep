// Parse error codes and shape (01-interfaces.md section 1).

import type { SourceSpan } from "./ast";

export type ParseErrorCode =
  | "syntax"
  | "unsupported"
  | "point-arity"
  | "relation-chain"
  | "too-many-nodes"
  | "too-deep";
export interface ParseError {
  code: ParseErrorCode;
  span: SourceSpan;
  detail: string;
} // detail: English, logs and tests only

const PARSE_ERROR_CODES: ReadonlySet<string> = new Set<ParseErrorCode>([
  "syntax",
  "unsupported",
  "point-arity",
  "relation-chain",
  "too-many-nodes",
  "too-deep",
]);

export function isParseErrorCode(code: string): code is ParseErrorCode {
  return PARSE_ERROR_CODES.has(code);
}
