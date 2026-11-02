// Parse error codes and shape.

import type { SourceSpan } from "./ast";

export type ParseErrorCode =
  | "syntax"
  | "unsupported"
  | "point-arity"
  | "point-syntax" // a comma outside any bracket that takes one, `1,000`, `\sqrt{4,9}`
  | "relation-chain" // PR-29: a chain mixing `=` with an inequality, `x=y<3`
  | "relation-side" // PR-29: a relation operator straight after another, `x=>1`
  | "too-many-nodes"
  | "too-deep"
  | "sim-side" // PR-30: a regression row with nothing on one side of `\sim`
  | "function-parentheses" // PR-24: a built-in that needs `(` written without one
  | "argument-parentheses" // PR-24: a run without `(` followed by another built-in call
  | "comma-side" // PR-25: an empty argument beside a comma in a call
  | "range-bound" // PR-34: a range with nothing before or after its ellipsis
  | "empty-brackets" // PR-34: an index with nothing in its brackets, `L[]`
  | "log-power" // PR-26: a power other than 2 on the name `log` or `ln`
  | "trig-power" // PR-26: a power other than 2 or -1 on a trig or hyperbolic name or its inverse
  | "empty-subscript" // PR-27: `\log_{}`
  | "empty-root" // G9: `\sqrt{}`
  | "empty-root-index" // G9: `\sqrt[]{8}`
  | "name-subscript" // PR-27: a subscript on a trig, hyperbolic or `ln` name
  | "colon-side" // PR-31: nothing on one side of a piecewise `:`, `\{1>0:\}`
  | "colon-condition" // PR-31: a `:` whose left side is not a condition, `\{3:4\}`
  | "piecewise-condition" // PR-31: a piecewise with no condition, `\{5,6\}`
  | "piecewise-part" // PR-31: a part before the last without a condition, `\{1>0:5,6,7\}`
  | "unexpected-symbol" // PR-45: a `.` before a one-letter member, `a.\operatorname{p}`
  | "logic-outside-condition" // `or` or `and` in a row with no comparison, `n\operatorname{or}mal`
  // Desmos's surface parse errors (captured 2026-10-20), each naming its symbol in `names`:
  | "operator-side" // an infix operator with nothing on one side, `1+`, `=2`, `\cdot`
  | "operator-after" // a leading sign with nothing after it, `+`, `(-)`
  | "operator-before" // a postfix `!` with nothing before it, `!2`
  | "unmatched" // a bracket without its partner, `(1`, `1]`; names the opener
  | "unknown-symbol" // a character Desmos does not read, a raw `|`
  | "empty-parentheses" // `\left(\right)`, `2()`
  | "empty-pipe" // `\left|\right|`
  | "empty-superscript" // `x^{}`
  | "fraction-empty" // `\frac{}{}`
  | "fraction-numerator" // `\frac{}{2}`
  | "fraction-denominator" // `\frac{1}{}`
  | "invalid-subscript" // `x_{a+b}`; names the first piece that is not a letter or digit
  | "subscript-target" // a subscript on a number or group, `1_2`
  | "adjacent-numbers" // `1.2.3`; names both numbers
  | "for-duplicate" // NM-37: a name defined twice after `for`; names it
  | "for-ambiguous" // NM-37: a comma or second `for` beside a comprehension
  | "mixed-number" // a mixed number multiplied without a sign, `x2\frac{1}{2}`; names it
  | "number-dot" // `1..5`
  | "point-3d" // `(1,2,3)`
  | "percent-of" // `50\%x`: a percent sign without `of`
  | "prime-use" // a prime on a value, `x'`, `f'`
  | "equality-here" // `=` inside brackets, `(x=1)`
  | "inequality-here" // an inequality inside brackets, `(x<1)`
  | "prime-superscript" // a prime beside a power, `f'^{2}(2)`
  | "function-undefined" // `a()`, `g'(2)`: a call of a name no row defines as a function
  | "derivative-operand" // FN-61: `\frac{d}{dx}` with nothing after it to differentiate
  // calls of the reference's built-ins this calculator does not evaluate (desmos-calls.ts)
  | "arity"
  | "argument-type"
  | "refused-function"
  | "point-function-arity"
  | "color-arity" // `\operatorname{hsv}(1)`
  | "random-arguments" // `\operatorname{random}(1,2,3,4)`
  | "requires-list" // `\operatorname{boxplot}(5)`
  | "too-many-arguments" // `\operatorname{histogram}(L,2,3)`
  | "polygon-points" // `\operatorname{polygon}(1)`
  | "symbol-context" // `\operatorname{dt}` outside a ticker, `\operatorname{ans}`
  | "negate-type" // `-\operatorname{rgb}(1,2,3)`
  | "complex-only"; // `\operatorname{arg}(1)`: complex-number built-ins, in real mode
export interface ParseError {
  code: ParseErrorCode;
  span: SourceSpan;
  detail: string; // English, logs and tests only
  // `unsupported`: the deferred notation a row error names ("Building a list with 'for'");
  // `function-parentheses`, `argument-parentheses`, `log-power`, `trig-power` and `name-subscript`: the
  // built-in's name ("floor"); `relation-side` and `unexpected-symbol`: the symbol (">", "."); `logic-outside-condition`: "or" or "and"
  feature?: string;
  names?: string[]; // the display names a message shows when there are two (`adjacent-numbers`)
}

const PARSE_ERROR_CODES: ReadonlySet<string> = new Set<ParseErrorCode>([
  "syntax",
  "unsupported",
  "point-arity",
  "point-syntax",
  "relation-chain",
  "relation-side",
  "too-many-nodes",
  "too-deep",
  "sim-side",
  "function-parentheses",
  "argument-parentheses",
  "comma-side",
  "range-bound",
  "empty-brackets",
  "log-power",
  "trig-power",
  "empty-subscript",
  "empty-root",
  "empty-root-index",
  "name-subscript",
  "colon-side",
  "colon-condition",
  "piecewise-condition",
  "piecewise-part",
  "unexpected-symbol",
  "logic-outside-condition",
  "operator-side",
  "operator-after",
  "operator-before",
  "unmatched",
  "unknown-symbol",
  "empty-parentheses",
  "empty-pipe",
  "empty-superscript",
  "fraction-empty",
  "fraction-numerator",
  "fraction-denominator",
  "invalid-subscript",
  "subscript-target",
  "adjacent-numbers",
  "mixed-number",
  "for-duplicate",
  "for-ambiguous",
  "number-dot",
  "point-3d",
  "percent-of",
  "prime-use",
  "equality-here",
  "inequality-here",
  "prime-superscript",
  "function-undefined",
  "derivative-operand",
  // "arity", "argument-type", "refused-function" and "point-function-arity" are analysis codes
  // too: a parse that reports one is checked with the analysis's cases
  "color-arity",
  "random-arguments",
  "requires-list",
  "too-many-arguments",
  "polygon-points",
  "symbol-context",
  "negate-type",
  "complex-only",
]);

export function isParseErrorCode(code: string): code is ParseErrorCode {
  return PARSE_ERROR_CODES.has(code);
}

/**
 * Notation the parser or analysis reads but whose meaning has not shipped (PR-34's comprehensions,
 * NM-37). An `unsupported` row error naming one of these reads
 * "{feature} isn't supported yet." (R-2).
 */
export const DEFERRED_FEATURES = Object.freeze({} as const);
