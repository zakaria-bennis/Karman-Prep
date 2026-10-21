// Recursive-descent parser, precedence levels 5 to 8 (parser grammar G2):
// rows with their relations (G12), sums, terms with explicit and implicit multiplication, and unary
// signs. Factors and atoms (levels 9 to 11) are in atoms.ts. Every failure throws ParseFailure,
// which parseLatex turns into a result.

import type { Node, RelOp, SourceSpan } from "./ast";
import { parseFactor } from "./atoms";
import type { ParseError, ParseErrorCode } from "./errors";
import type { ParseOptions } from "./index";
import { MAX_NESTING_DEPTH } from "./limits";
import { isFor, takeComprehension } from "./lists";
import { checkMixedProduct } from "./mixed-numbers";
import type { Token } from "./tokens";

export interface ParserState {
  tokens: Token[];
  pos: number;
  depth: number;
  readonly prefixSigns: Set<number>; // indices of the `+` and `-` tokens read as leading signs
  readonly normalized: string;
  readonly options: ParseOptions;
}

export class ParseFailure extends Error {
  readonly error: ParseError;
  constructor(error: ParseError) {
    super(error.detail);
    this.name = "ParseFailure";
    this.error = error;
  }
}

/** The colour built-ins, which cannot be negated. */
const COLOR_NAMES: ReadonlySet<string> = new Set(["rgb", "hsv", "okhsv", "oklab", "oklch"]);

/** The operators and the closer that are commands (G3): no factor or atom starts with one. */
const OPERATOR_COMMANDS: ReadonlySet<string> = new Set([
  "cdot",
  "le",
  "ge",
  "rvert",
  "of",
  "sim",
  "ldots", // PR-34: the range ellipsis, read only inside list brackets
  "for", // NM-37: the comprehension operator
  "}", // PR-31: the closing piecewise brace `\}`
]);

export function createParserState(
  tokens: Token[],
  normalized: string,
  options: ParseOptions
): ParserState {
  return { tokens, pos: 0, depth: 0, prefixSigns: new Set(), normalized, options };
}

export function fail(
  code: ParseErrorCode,
  span: SourceSpan,
  detail: string,
  feature?: string,
  names?: string[]
): never {
  const error: ParseError = { code, span: { start: span.start, end: span.end }, detail };
  const named = names === undefined ? error : { ...error, names };
  throw new ParseFailure(feature === undefined ? named : { ...named, feature });
}

/**
 * A `syntax` failure at `token` (G14): the end token reports the end of the input. A misplaced
 * ellipsis or `~` and a relation inside brackets are Desmos's own errors there (captured
 * 2026-10-20): "Sorry, I don't understand the way that '~' is used here." and "Cannot use an
 * inequality here.".
 */
export function unexpected(state: ParserState, token: Token): never {
  if (token.t === "end") return fail("syntax", token.span, "unexpected end of input");
  const symbol = misplacedSymbol(token);
  if (symbol !== null) return fail("unexpected-symbol", token.span, "a misplaced symbol", symbol);
  const relation = relopSymbol(token);
  if (relation === "=") return fail("equality-here", token.span, "an equation inside brackets");
  if (relation !== null) return fail("inequality-here", token.span, "a relation inside brackets");
  const text = state.normalized.slice(token.span.start, token.span.end);
  return fail("syntax", token.span, `unexpected "${text}"`);
}

/**
 * `token` met where a complete sum must end, at the end of the row or of a braced argument: a
 * comma there is a point written without its brackets, Desmos's "Points are written like this:
 * (1, 2)." for `1,000` and `\sqrt{4,9}` (captured 2026-10-19); anything else is unexpected.
 */
export function unexpectedAfterSum(state: ParserState, token: Token): never {
  if (token.t === "symbol" && token.ch === ",") {
    // Desmos reads the sum after the comma first: `1,` and `1,+` are that sum's errors
    take(state);
    parseSum(state);
    return fail("point-syntax", token.span, "a comma outside a point, list or call");
  }
  const previous = state.tokens[state.pos - 1];
  if (token.t === "symbol" && token.ch === "." && previous?.t === "digits") {
    return fail("number-dot", token.span, "a dot after a number");
  }
  const symbol = misplacedSymbol(token);
  if (symbol !== null) return fail("unexpected-symbol", token.span, "a misplaced symbol", symbol);
  return unexpected(state, token);
}

/** The ellipsis and `~`, which Desmos names when they stand where it cannot read them. */
function misplacedSymbol(token: Token): string | null {
  if (token.t === "command" && token.name === "ldots") return "...";
  if (token.t === "command" && token.name === "sim") return "~";
  return token.t === "symbol" && token.ch === "~" ? "~" : null;
}

/** The symbol Desmos names for an infix operator token, or null. */
function infixSymbol(token: Token | undefined): string | null {
  if (token === undefined) return null;
  if (token.t === "symbol") return INFIX_SYMBOLS[token.ch] ?? null;
  return token.t === "command" ? (INFIX_COMMANDS[token.name] ?? null) : null;
}
const INFIX_SYMBOLS: Readonly<Record<string, string>> = {
  "+": "+",
  "-": "-",
  "*": "*",
  "/": "/",
  "=": "=",
  "<": "<",
  ">": ">",
  ",": ",",
  ".": ".",
  "%": "% of",
};
const INFIX_COMMANDS: Readonly<Record<string, string>> = {
  cdot: "⋅",
  le: "≤",
  ge: "≥",
  of: "% of",
  with: "with",
  for: "for",
};

/** True for the end of the row or a closing bracket, bar or brace. */
function closesGroup(token: Token): boolean {
  if (token.t === "end" || token.t === "close") return true;
  return token.t === "command" && (token.name === "rvert" || token.name === "}");
}

/**
 * `token` met where an operand is due, as Desmos's parser reports it (captured 2026-10-20): an
 * infix operator there has nothing before it (`=2`, `1+*2`: "You need something on both sides of
 * the '*' symbol."), `!` nothing before it, a raw `|` is a symbol Desmos does not read, and the
 * ellipsis is misplaced. At the end of the row or a group, the operator just read has nothing
 * after it: a leading sign "You need something after the '+' symbol.", an infix operator its
 * both-sides text; an empty `(…)` or `|…|` is its own error. Anything else is `syntax`.
 */
export function missingOperand(state: ParserState, token: Token): never {
  if (token.t === "symbol" && token.ch === "!") {
    return fail("operator-before", token.span, "nothing before !", "!");
  }
  // Desmos: `^2`, `^{}`, `_2` and `_{1}` with nothing before them (captured 2026-10-20)
  if (token.t === "symbol" && (token.ch === "^" || token.ch === "_")) {
    const name = token.ch === "^" ? "superscript" : "subscript";
    return fail("operator-before", token.span, `nothing before ${name}`, name);
  }
  if (token.t === "symbol" && token.ch === "|") {
    return fail("unknown-symbol", token.span, "a raw bar", "|");
  }
  if (isSim(token)) return fail("sim-side", token.span, "nothing before \\sim", simSymbol(token));
  const misplaced = misplacedSymbol(token);
  if (misplaced !== null) {
    return fail("unexpected-symbol", token.span, "a misplaced symbol", misplaced);
  }
  const own = infixSymbol(token);
  if (own !== null && own !== "+" && own !== "-") {
    return fail("operator-side", token.span, `nothing before ${own}`, own);
  }
  if (!closesGroup(token)) return unexpected(state, token);
  const k = state.pos - 1,
    previous = state.tokens[k];
  const symbol = infixSymbol(previous);
  if (symbol !== null && state.prefixSigns.has(k)) {
    return fail("operator-after", previous.span, `nothing after ${symbol}`, symbol);
  }
  if (symbol !== null)
    return fail("operator-side", previous.span, `nothing after ${symbol}`, symbol);
  if (previous?.t === "open" && previous.ch === "(") {
    const span = { start: previous.span.start, end: token.span.end };
    return fail("empty-parentheses", span, "empty parentheses");
  }
  if (previous?.t === "command" && previous.name === "lvert") {
    const span = { start: previous.span.start, end: token.span.end };
    return fail("empty-pipe", span, "empty bars");
  }
  return unexpected(state, token);
}

/** The token `offset` places after the cursor; past the end it is the `end` token. */
export function peek(state: ParserState, offset = 0): Token {
  return state.tokens[Math.min(state.pos + offset, state.tokens.length - 1)];
}

/** Returns the token at the cursor and moves past it; the cursor never moves past `end`. */
export function take(state: ParserState): Token {
  const token = peek(state);
  if (token.t !== "end") state.pos += 1;
  return token;
}

/**
 * Runs `body` one nesting level deeper (G13); `opener` is the token that opened the level. Opening
 * level MAX_NESTING_DEPTH + 1 is `too-deep` at that opener.
 */
export function enter<T>(state: ParserState, opener: Token, body: () => T): T {
  if (state.depth >= MAX_NESTING_DEPTH) {
    fail("too-deep", opener.span, `more than ${MAX_NESTING_DEPTH} nesting levels`);
  }
  state.depth += 1;
  try {
    return body();
  } finally {
    state.depth -= 1;
  }
}

/**
 * `row := rel end` and `rel := sum (relop sum)*` (G12). Relations exist only here: anywhere else a
 * relation operator is unexpected, so it is `syntax`.
 */
export function parseRow(state: ParserState): Node {
  // PR-30: `L \sim M` (or `~`) is a whole row; an empty side is `sim-side`, and anything after M,
  // or a relation, is `syntax`.
  const first = peek(state);
  if (isSim(first)) fail("sim-side", first.span, "nothing before \\sim", simSymbol(first));
  const operands = [parseSum(state)];
  // NM-37: a whole row may be a comprehension without brackets, `n\operatorname{for}n=[1,2]`
  if (isFor(peek(state))) {
    const comprehension = takeComprehension(state, operands[0]);
    const after = peek(state);
    if (after.t !== "end") unexpectedAfterSum(state, after);
    return comprehension;
  }
  const sim = peek(state);
  if (isSim(sim)) {
    take(state);
    if (peek(state).t === "end") fail("sim-side", sim.span, "nothing after \\sim", simSymbol(sim));
    const right = parseSum(state);
    const after = peek(state);
    if (after.t !== "end") fail("unexpected-symbol", sim.span, "more after a regression", "~");
    return { kind: "sim", left: operands[0], right, span: spanning(operands[0], right) };
  }
  const tree = takeRelations(state, operands[0]);
  const next = peek(state);
  if (next.t !== "end") unexpectedAfterSum(state, next);
  return tree;
}

/**
 * `condition := sum (relop sum)*` (G12): a sum with an optional relation chain, as a filter in
 * `L[…]` (PR-34, NM-31: `L[L>2]`, `L[2<L<6]`) and a piecewise part (PR-31) write it.
 */
export function parseCondition(state: ParserState): Node {
  return takeRelations(state, parseSum(state));
}

/**
 * The relation chain after `first`, checked by checkChain; `first` itself without one. A relation
 * operator straight after another is `relation-side` naming the second, as Desmos reads `x=>1`
 * ("You need something on both sides of the '>' symbol.", captured 2026-10-19).
 */
function takeRelations(state: ParserState, first: Node): Node {
  const operands = [first];
  const ops: RelOp[] = [];
  for (let relop = takeRelop(state); relop !== null; relop = takeRelop(state)) {
    checkChain(ops, relop);
    ops.push(relop.op);
    const next = peek(state);
    const symbol = relopSymbol(next);
    if (symbol !== null) fail("relation-side", next.span, "two relation operators", symbol);
    operands.push(parseSum(state));
  }
  if (ops.length === 0) return first;
  const span = spanning(first, operands[operands.length - 1]);
  return { kind: "rel", ops, operands, span };
}

/** `sum := term (("+" | "-") term)*`, grouping left to right. */
export function parseSum(state: ParserState): Node {
  let left = parseTerm(state);
  for (let op = peek(state); isSign(op); op = peek(state)) {
    take(state);
    const right = parseTerm(state);
    left = { kind: op.ch === "+" ? "add" : "sub", left, right, span: spanning(left, right) };
  }
  return left;
}

/**
 * True when the cursor can start an implicitly multiplied factor (G3): digits, a letter, `(`, `{`,
 * `[`, a raw `|` (an error where it starts) and any command except `\cdot`, `\le`, `\ge`, `\rvert`,
 * `\operatorname{of}`, the ellipsis and `\}`; `\{` starts one, so braces after a factor restrict
 * it (PR-32).
 */
export function startsFactor(state: ParserState): boolean {
  const token = peek(state);
  switch (token.t) {
    case "digits":
    case "letter":
    case "open":
      return true;
    case "symbol":
      return token.ch === "|"; // a raw bar, which Desmos does not read, reported where it starts
    case "command":
      return !OPERATOR_COMMANDS.has(token.name);
    default:
      return false;
  }
}

/**
 * `term := unary (mulop unary | factor)*` (G2): explicit and implicit multiplication and division
 * share one level and group left to right (PR-18).
 */
function parseTerm(state: ParserState): Node {
  let { node: left, factor } = parseUnary(state);
  for (;;) {
    const kind = mulop(peek(state), factor);
    if (kind !== null) {
      take(state);
      const right = parseUnary(state);
      left = { kind, left, right: right.node, span: spanning(left, right.node) };
      factor = right.factor;
    } else if (startsFactor(state)) {
      const before = factor;
      factor = parseFactor(state);
      checkMixedProduct(state, before, factor);
      left = { kind: "mul", left, right: factor, span: spanning(left, factor) };
    } else {
      return left;
    }
  }
}

/**
 * The node an explicit operator at `token` builds (G2): `*` and `\cdot` multiply, `/` divides, and
 * `\operatorname{of}` multiplies only right after a factor whose node is `pct` (PR-7).
 */
function mulop(token: Token, factor: Node): "mul" | "div" | null {
  if (token.t === "symbol") return token.ch === "*" ? "mul" : token.ch === "/" ? "div" : null;
  if (token.t !== "command") return null;
  if (token.name === "cdot") return "mul";
  return token.name === "of" && factor.kind === "pct" ? "mul" : null;
}

/**
 * `unary := ("-" | "+")* factor`, read in a loop: each `-` wraps `neg`, a `+` adds nothing. Returns
 * the signed node and the factor inside it, which decides whether `\operatorname{of}` may follow.
 */
function parseUnary(state: ParserState): { node: Node; factor: Node } {
  const minuses: Token[] = [];
  for (let sign = peek(state); isSign(sign); sign = peek(state)) {
    state.prefixSigns.add(state.pos);
    take(state);
    if (sign.ch === "-") minuses.push(sign);
  }
  const first = peek(state);
  // Desmos: `-\operatorname{rgb}(1,2,3)` is "Cannot negate a color." (captured 2026-10-20)
  if (minuses.length % 2 === 1 && first.t === "command" && COLOR_NAMES.has(first.name)) {
    const color = state.pos;
    try {
      parseFactor(state);
    } catch (thrown) {
      const unsupported = thrown instanceof ParseFailure && thrown.error.code === "unsupported";
      if (!unsupported || state.tokens[color] !== first) throw thrown;
    }
    fail("negate-type", first.span, "a negated colour", undefined, ["a color"]);
  }
  const factor = parseFactor(state);
  let node = factor;
  for (let i = minuses.length - 1; i >= 0; i--) {
    node = { kind: "neg", arg: node, span: { start: minuses[i].span.start, end: node.span.end } };
  }
  return { node, factor };
}

/**
 * The relation operator at the cursor, taken, or null (G12): `=`, `<`, `>`, `\le`, `\ge`, and `<`
 * or `>` with an `=` directly after it.
 */
function takeRelop(state: ParserState): { op: RelOp; span: SourceSpan } | null {
  const token = peek(state);
  if (token.t === "command" && (token.name === "le" || token.name === "ge")) {
    take(state);
    return { op: token.name === "le" ? "<=" : ">=", span: token.span };
  }
  if (token.t !== "symbol" || (token.ch !== "=" && token.ch !== "<" && token.ch !== ">")) {
    return null;
  }
  take(state);
  const next = peek(state);
  if (token.ch !== "=" && next.t === "symbol" && next.ch === "=") {
    if (next.span.start === token.span.end) {
      take(state);
      const span = { start: token.span.start, end: next.span.end };
      return { op: token.ch === "<" ? "<=" : ">=", span };
    }
  }
  return { op: token.ch, span: token.span };
}

/** The symbol a relation operator token starts with, as Desmos's messages show it, or null. */
function relopSymbol(token: Token): string | null {
  if (token.t === "command") return token.name === "le" ? "≤" : token.name === "ge" ? "≥" : null;
  return token.t === "symbol" && "=<>".includes(token.ch) ? token.ch : null;
}

/**
 * PR-29 chains (G12): read left to right, the first operator that mixes `=` with an inequality is
 * `relation-chain` at its span, as Desmos refuses to build such a chain anywhere. Chains of `=`
 * and inequalities pointing both ways parse; analysis refuses to graph them (RC-14).
 */
function checkChain(ops: readonly RelOp[], relop: { op: RelOp; span: SourceSpan }): void {
  if (ops.length === 0) return;
  const previous = ops[ops.length - 1];
  if ((relop.op === "=") !== (previous === "=")) {
    fail("relation-chain", relop.span, `"${relop.op}" cannot follow "${previous}" in a chain`);
  }
}

/** Desmos names a typed `~` as written and `\sim` as ∼ (captured 2026-10-20). */
function simSymbol(token: Token): string {
  return token.t === "symbol" ? "~" : "∼";
}

function isSim(token: Token): boolean {
  return (
    (token.t === "symbol" && token.ch === "~") || (token.t === "command" && token.name === "sim")
  );
}

function isSign(token: Token): token is Extract<Token, { t: "symbol" }> & { ch: "+" | "-" } {
  return token.t === "symbol" && (token.ch === "+" || token.ch === "-");
}

function spanning(first: Node, last: Node): SourceSpan {
  return { start: first.span.start, end: last.span.end };
}
