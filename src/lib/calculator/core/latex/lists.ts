// List brackets (PR-34): literals `[a,b,c]` and `[]`, the ranges `[a...b]` and `[a,b,...,c]` (the
// ellipsis is `...`, `\ldots`, `\dots` or `…`, one token after normalizing), and indexing,
// slicing and filtering `L[…]` (NM-30, NM-31), and comprehensions `[e \operatorname{for} n=L,m=M]`
// (NM-37), which a whole row may also be without brackets (`n\operatorname{for}n=[1,2]`).

import type { Binding, Node, SourceSpan } from "./ast";
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

type OpenToken = Extract<Token, { t: "open" }>;

interface Bracket {
  items: Node[];
  before: number; // items before the ellipsis; -1 without one
  span: SourceSpan;
  comprehension: Extract<Node, { kind: "for" }> | null; // `[e for n=L]`: its body is items[0]
}

/**
 * The `[` at the cursor and its list, one nesting level deeper (G13). Items are sums separated by
 * commas; one ellipsis, with an optional comma on either side, makes a range of the items before
 * it and after it (NM-36 checks they form one arithmetic sequence: `[1,2,3,...,10]`,
 * `[1,...,9,10]`). An ellipsis with no item before it or none after it is `range-bound` at the
 * ellipsis, Desmos's "Range must have an upper and lower bound." (`[1,...]`). An empty item, a
 * second ellipsis or any other shape is `syntax` at the token where it goes wrong.
 */
export function parseList(state: ParserState, open: OpenToken): Node {
  const { items, before, span, comprehension } = parseBracket(state, open, false);
  if (comprehension !== null) return { ...comprehension, brackets: true, span };
  if (before < 0) return { kind: "list", items, span };
  return { kind: "list", items, range: before, span };
}

/**
 * `T[…]` after any atom and its postfix signs, read like a list (NM-30, NM-31), as the reference's
 * parser does: `[` binds tighter than every operator but `(`, so `(L+1)[2]`, `L^{2}[1]` and
 * `\pi[1,2]` index too, and analysis rejects what is not a list (`5[1]`): `L[2]`, `L[[1,3]]` and
 * `L[1,2]` index, `L[2...4]`, `L[2...]`, `L[...3]` and `L[...]` slice, and one condition filters
 * (`L[L>2]`, `L[2<L<6]`). Empty brackets are `empty-brackets`, Desmos's "Square brackets cannot
 * be empty."; a condition beside other items is `syntax` at the condition. Null when the cursor
 * is not a `[`.
 */
export function parseIndex(state: ParserState, target: Node): Node | null {
  const open = peek(state);
  if (open.t !== "open" || open.ch !== "[") return null;
  const { items, before, span } = parseBracket(state, open, true);
  if (items.length === 0 && before < 0) {
    fail("empty-brackets", span, "an index needs something in its brackets");
  }
  const condition = items.find((item) => item.kind === "rel");
  if (condition !== undefined && (items.length > 1 || before >= 0)) {
    // Desmos's "Cannot use an inequality here." (captured 2026-10-20)
    const equation = condition.kind === "rel" && condition.ops.every((op) => op === "=");
    const code = equation ? "equality-here" : "inequality-here";
    fail(code, condition.span, "a condition must be the only item in an index");
  }
  const whole = { start: target.span.start, end: span.end };
  if (before < 0) return { kind: "index", target, items, span: whole };
  return { kind: "index", target, items, range: before, span: whole };
}

/** The items of the bracket at the cursor; an index's items are conditions and may leave a range side empty. */
function parseBracket(state: ParserState, open: OpenToken, index: boolean): Bracket {
  take(state);
  const items: Node[] = [];
  let before = -1;
  let comprehension: Bracket["comprehension"] = null;
  enter(state, open, () => {
    if (isClose(peek(state))) return;
    for (;;) {
      const token = peek(state);
      if (isEllipsis(token)) {
        if (items.length === 0 && !index) failRangeBound(token);
        if (before >= 0) unexpected(state, token);
        take(state);
        before = items.length;
        if (isComma(peek(state))) take(state);
        if (isClose(peek(state))) {
          if (index) return;
          failRangeBound(token);
        }
      }
      items.push(index ? parseCondition(state) : parseSum(state));
      const next = peek(state);
      if (isComma(next)) take(state);
      else if (!index && isFor(next)) {
        if (items.length > 1 || before >= 0) failAmbiguous(next);
        comprehension = takeComprehension(state, items[0]);
        return;
      } else if (!isEllipsis(next)) return;
    }
  });
  const close = peek(state);
  if (!isClose(close)) unexpected(state, close);
  take(state);
  const span = { start: open.span.start, end: close.span.end };
  return { items, before, span, comprehension };
}

/** True for the comprehension operator `\operatorname{for}`. */
export function isFor(token: Token): boolean {
  return token.t === "command" && token.name === "for";
}

/**
 * NM-37: the `for` at the cursor and its definitions `n=L, m=M` after `body`, as Desmos reads them
 * (captured 2026-10-20): nothing after `for` is "You need something on both sides of the 'for'
 * symbol."; a second `for`, or a comma before something that is not a definition, is "Ambiguous use
 * of ',' and 'for'. Add parentheses around the 'for' expression."; a name defined twice is "You
 * can't define 'a' more than once on the right-hand side of 'for'.".
 */
export function takeComprehension(state: ParserState, body: Node): Extract<Node, { kind: "for" }> {
  const keyword = take(state);
  const bindings: Binding[] = [];
  for (;;) {
    const start = peek(state);
    if (start.t === "end" || start.t === "close") {
      fail("operator-side", keyword.span, "nothing after for", "for");
    }
    const part = parseCondition(state);
    const [name, list] = part.kind === "rel" ? part.operands : [];
    const single = part.kind === "rel" && part.ops.length === 1 && part.ops[0] === "=";
    if (!single || name.kind !== "id") return failAmbiguous(keyword);
    if (bindings.some((b) => b.name === name.name)) {
      fail("for-duplicate", name.span, "a name defined twice after for", undefined, [name.name]);
    }
    bindings.push({ name: name.name, list, span: part.span });
    const next = peek(state);
    if (isFor(next)) failAmbiguous(next);
    if (!isComma(next)) break;
    take(state);
  }
  const span = { start: body.span.start, end: bindings[bindings.length - 1].span.end };
  return { kind: "for", body, bindings, brackets: false, span };
}

function failAmbiguous(token: Token): never {
  return fail("for-ambiguous", token.span, "a comma beside a for");
}

function failRangeBound(ellipsis: Token): never {
  return fail("range-bound", ellipsis.span, "a range needs an item on each side of the ellipsis");
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
