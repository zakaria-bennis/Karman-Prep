// Recursive-descent parser, precedence levels 5 to 8 (grammar contract G2 of the 02-parser plan):
// rows, sums, terms with implicit multiplication and unary signs. Factors and atoms (levels 9 to
// 11) are in atoms.ts. Every failure throws ParseFailure, which parseLatex turns into a result.

import type { Node, SourceSpan } from "./ast";
import { parseFactor } from "./atoms";
import type { ParseError, ParseErrorCode } from "./errors";
import type { ParseOptions } from "./index";
import type { Token } from "./tokens";

export interface ParserState {
  tokens: Token[];
  pos: number;
  depth: number;
  bars: ("raw" | "lvert")[];
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

export function createParserState(
  tokens: Token[],
  normalized: string,
  options: ParseOptions
): ParserState {
  return { tokens, pos: 0, depth: 0, bars: [], normalized, options };
}

export function fail(code: ParseErrorCode, span: SourceSpan, detail: string): never {
  throw new ParseFailure({ code, span: { start: span.start, end: span.end }, detail });
}

/** A `syntax` failure at `token` (G14): the end token reports the end of the input. */
export function unexpected(state: ParserState, token: Token): never {
  if (token.t === "end") return fail("syntax", token.span, "unexpected end of input");
  const text = state.normalized.slice(token.span.start, token.span.end);
  return fail("syntax", token.span, `unexpected "${text}"`);
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

/** Runs `body` one nesting level deeper (G13); `opener` is the token that opened the level. */
export function enter<T>(state: ParserState, opener: Token, body: () => T): T {
  state.depth += 1;
  try {
    return body();
  } finally {
    state.depth -= 1;
  }
}

/** `row := sum end` (G2; relations join in Task 8). */
export function parseRow(state: ParserState): Node {
  const tree = parseSum(state);
  const next = peek(state);
  if (next.t !== "end") unexpected(state, next);
  return tree;
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

/** True when the cursor can start an implicitly multiplied factor (G3 so far: Task 8 completes it). */
export function startsFactor(state: ParserState): boolean {
  const t = peek(state).t;
  return t === "digits" || t === "letter" || t === "command";
}

/** `term := unary factor*`: implicit multiplication, grouping left to right. */
function parseTerm(state: ParserState): Node {
  let left = parseUnary(state);
  while (startsFactor(state)) {
    const right = parseFactor(state);
    left = { kind: "mul", left, right, span: spanning(left, right) };
  }
  return left;
}

/** `unary := ("-" | "+")* factor`, read in a loop: each `-` wraps `neg`, a `+` adds nothing. */
function parseUnary(state: ParserState): Node {
  const minuses: Token[] = [];
  for (let sign = peek(state); isSign(sign); sign = peek(state)) {
    take(state);
    if (sign.ch === "-") minuses.push(sign);
  }
  let node = parseFactor(state);
  for (let i = minuses.length - 1; i >= 0; i--) {
    node = { kind: "neg", arg: node, span: { start: minuses[i].span.start, end: node.span.end } };
  }
  return node;
}

function isSign(token: Token): token is Extract<Token, { t: "symbol" }> & { ch: "+" | "-" } {
  return token.t === "symbol" && (token.ch === "+" || token.ch === "-");
}

function spanning(first: Node, last: Node): SourceSpan {
  return { start: first.span.start, end: last.span.end };
}
