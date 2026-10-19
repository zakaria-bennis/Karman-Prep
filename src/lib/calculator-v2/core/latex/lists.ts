// List brackets (PR-34): literals `[a,b,c]` and `[]`, the ranges `[a...b]` and `[a,b,...,c]` (the
// ellipsis is `...`, `\ldots`, `\dots` or `…`, one token after normalizing), and the notations
// whose meaning has not shipped: indexing, slicing and filtering `L[…]` and comprehensions
// (NM-30, NM-31, NM-37), each `unsupported` naming its DEFERRED_FEATURES entry.

import type { Node } from "./ast";
import { DEFERRED_FEATURES } from "./errors";
import { enter, fail, parseSum, peek, take, unexpected, type ParserState } from "./parser";
import type { Token } from "./tokens";

type OpenToken = Extract<Token, { t: "open" }>;

/** Atoms a `[` directly after reads as indexing, as the reference does (`L[2]`, `[1,2][1]`). */
const INDEXED_KINDS: ReadonlySet<Node["kind"]> = new Set(["id", "call", "list"]);
const RELATION_SYMBOLS: ReadonlySet<string> = new Set(["=", "<", ">"]);

/**
 * The `[` at the cursor and its list, one nesting level deeper (G13). Items are sums separated by
 * commas; one ellipsis, with an optional comma on either side, makes a range: one item before it
 * steps by ±1 and two items step by their difference, with exactly one item after it. An empty
 * item or any other shape is `syntax` at the token where it goes wrong.
 */
export function parseList(state: ParserState, open: OpenToken): Node {
  take(state);
  const items: Node[] = [];
  let before = -1; // items before the ellipsis; -1 without one
  enter(state, open, () => {
    if (isClose(peek(state))) return;
    for (;;) {
      const token = peek(state);
      if (isEllipsis(token)) {
        if (before >= 0 || items.length === 0 || items.length > 2) unexpected(state, token);
        take(state);
        before = items.length;
        if (isComma(peek(state))) take(state);
      }
      items.push(parseSum(state));
      const next = peek(state);
      if (isComma(next)) take(state);
      else if (!isEllipsis(next)) return;
    }
  });
  const close = peek(state);
  if (!isClose(close)) unexpected(state, close);
  take(state);
  const span = { start: open.span.start, end: close.span.end };
  if (before < 0) return { kind: "list", items, span };
  if (items.length !== before + 1) {
    return fail("syntax", span, "a range has one item after the ellipsis");
  }
  return { kind: "list", items, range: true, span };
}

/**
 * PR-34's `L[…]` after an indexable atom: `unsupported` naming slicing when an ellipsis is inside
 * the brackets at their own level, filtering when a relation is, and indexing otherwise.
 */
export function failIfIndexed(state: ParserState, node: Node): void {
  const open = peek(state);
  if (open.t !== "open" || open.ch !== "[" || !INDEXED_KINDS.has(node.kind)) return;
  const feature = indexFeature(state);
  fail("unsupported", open.span, `${feature} is not supported`, feature);
}

/** `unsupported` at `\operatorname{for}`, the comprehension operator (PR-34, NM-37). */
export function failIfComprehension(command: Token): void {
  if (command.t !== "command" || command.name !== "for") return;
  const feature = DEFERRED_FEATURES.comprehension;
  fail("unsupported", command.span, `${feature} is not supported`, feature);
}

/** Which notation the bracket at the cursor writes, read from its tokens at depth 1. */
function indexFeature(state: ParserState): string {
  let depth = 0;
  for (let k = state.pos; k < state.tokens.length; k++) {
    const token = state.tokens[k];
    if (token.t === "open") depth += 1;
    else if (token.t === "close") depth -= 1;
    if (depth === 0) break;
    if (depth !== 1) continue;
    if (isEllipsis(token)) return DEFERRED_FEATURES.slice;
    if (token.t === "symbol" && RELATION_SYMBOLS.has(token.ch)) return DEFERRED_FEATURES.filter;
    if (token.t === "command" && (token.name === "le" || token.name === "ge")) {
      return DEFERRED_FEATURES.filter;
    }
  }
  return DEFERRED_FEATURES.index;
}

function isEllipsis(token: Token): boolean {
  return token.t === "command" && token.name === "ldots";
}

function isComma(token: Token): boolean {
  return token.t === "symbol" && token.ch === ",";
}

function isClose(token: Token): boolean {
  return token.t === "close" && token.ch === "]";
}
