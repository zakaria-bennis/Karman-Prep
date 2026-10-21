// Piecewise braces (PR-31, PR-32): `\{c_1:v_1, c_2, …, v\}` after normalizing (`\left\{` and
// `\right\}` lose `\left` and `\right`). A restriction is not a node of its own: braces directly
// after an expression multiply it, as in Desmos (`y=x\{x>0\}`, `\{0<x<2\}\{y>1\}`). The errors are
// Desmos's, captured 2026-10-19.

import type { Branch, Node, SourceSpan } from "./ast";
import {
  enter,
  fail,
  parseCondition,
  parseSum,
  peek,
  take,
  unexpected,
  type ParserState,
} from "./parser";
import type { Token } from "./tokens";

/** One comma-separated part: a condition with a value, a bare condition or a bare value. */
type Part = { cond: Node | null; value: Node | null; span: SourceSpan };

/**
 * The `\{` at the cursor and its piecewise, one nesting level deeper (G13). Parts are separated
 * by commas; a part is a condition (a sum with a relation chain, `0<x<2`), optionally followed by
 * `:` and its value, or a bare value, allowed only last as the otherwise case. A bare condition's
 * value is 1, so `\{1>0,2<1:4\}` is two parts. `\{\}` has no part and is 1. An empty part beside
 * a comma is `comma-side` and an empty side of `:` is `colon-side`; a `:` after a value is
 * `colon-condition` at the value; then, over the braces, no condition at all is
 * `piecewise-condition` (`\{5,6\}`, `\{x\}`) and a bare value before the last part is
 * `piecewise-part` at that value (`\{1>0:5,6,7\}`).
 */
export function parsePiecewise(state: ParserState, open: Token): Node {
  take(state);
  const parts = enter(state, open, () => readParts(state));
  const close = peek(state);
  if (!isClose(close)) unexpected(state, close);
  take(state);
  const span = { start: open.span.start, end: close.span.end };
  if (parts.length > 0 && parts.every((part) => part.cond === null)) {
    fail("piecewise-condition", span, "a piecewise needs at least one condition");
  }
  const early = parts.slice(0, -1).find((part) => part.cond === null);
  if (early !== undefined) {
    fail("piecewise-part", early.span, "only the last part of a piecewise may omit its condition");
  }
  const last = parts[parts.length - 1];
  const otherwise = last !== undefined && last.cond === null ? last.value : null;
  const branches: Branch[] = parts.flatMap(({ cond, value }) =>
    cond?.kind === "rel" ? [{ cond, value }] : []
  );
  return { kind: "piecewise", branches, otherwise, span };
}

function readParts(state: ParserState): Part[] {
  const parts: Part[] = [];
  if (isClose(peek(state))) return parts;
  for (;;) {
    const start = peek(state);
    if (isSymbol(start, ",")) fail("comma-side", start.span, "an empty piecewise part");
    if (isSymbol(start, ":")) fail("colon-side", start.span, "nothing before ':'");
    parts.push(readPart(state));
    const comma = peek(state);
    if (!isSymbol(comma, ",")) return parts;
    take(state);
    if (isClose(peek(state))) fail("comma-side", comma.span, "an empty piecewise part");
  }
}

function readPart(state: ParserState): Part {
  const left = parseCondition(state);
  const colon = peek(state);
  if (!isSymbol(colon, ":")) {
    const bare = left.kind === "rel" ? { cond: left, value: null } : { cond: null, value: left };
    return { ...bare, span: left.span };
  }
  take(state);
  const next = peek(state);
  if (isSymbol(next, ",") || isClose(next) || next.t === "end") {
    fail("colon-side", colon.span, "nothing after ':'");
  }
  if (left.kind !== "rel") fail("colon-condition", left.span, "the left of ':' is not a condition");
  const value = parseSum(state);
  // Desmos: a second `:` in one part, `\{x>0:1:2\}` (captured 2026-10-20)
  const extra = peek(state);
  if (isSymbol(extra, ":")) fail("unexpected-symbol", extra.span, "a second ':'", ":");
  return { cond: left, value, span: { start: left.span.start, end: value.span.end } };
}

/** The opening brace command `\{`, which atoms.ts routes here. */
export function isPiecewiseOpen(token: Token): boolean {
  return token.t === "command" && token.name === "{";
}

function isClose(token: Token): boolean {
  return token.t === "command" && token.name === "}";
}

function isSymbol(token: Token, ch: "," | ":"): boolean {
  return token.t === "symbol" && token.ch === ch;
}
