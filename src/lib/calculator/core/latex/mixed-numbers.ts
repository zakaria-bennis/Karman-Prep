// Mixed numbers, as Desmos reads them (captured 2026-10-20): a whole number written directly
// before a fraction of two whole numbers is one number, `2\frac{1}{2}` = 2.5 and
// `-2\frac{1}{2}` = -2.5, and a power applies to all of it (`2\frac{1}{2}^{2}` = 6.25). Written
// after another factor without a sign it is "Sorry, I don't know what to do with mixed number
// '2 1/2'. Try using a '*' symbol around it." (`x 2\frac{1}{2}`, `\pi2\frac{1}{2}`), as it is
// before a fraction, root or power (`2\frac{1}{2}\sqrt{2}`, `2\frac{1}{2}x^{2}`); a number after
// it is "adjacent numbers '2 1/2' and '3'". It is a literal: a row of one shows no value.

import type { Node } from "./ast";
import { fail, peek, take, type ParserState } from "./parser";
import type { Token } from "./tokens";

type Digits = Extract<Token, { t: "digits" }>;

const whole = (token: Token): token is Digits => token.t === "digits" && /^\d+$/.test(token.text);

/** The `{digits}` group `offset` tokens on, as its digits, or null. */
function braced(state: ParserState, offset: number): Digits | null {
  const [open, digits, close] = [0, 1, 2].map((k) => peek(state, offset + k));
  const group =
    open.t === "open" &&
    open.ch === "{" &&
    whole(digits) &&
    close.t === "close" &&
    close.ch === "}";
  return group ? (digits as Digits) : null;
}

/**
 * The mixed number starting at the whole number `token`, which has been taken, when a
 * `\frac{digits}{digits}` follows it; null otherwise, taking nothing more.
 */
export function takeMixedNumber(state: ParserState, token: Digits): Node | null {
  const frac = peek(state);
  if (!whole(token) || frac.t !== "command" || frac.name !== "frac") return null;
  const numerator = braced(state, 1);
  const denominator = braced(state, 4);
  if (numerator === null || denominator === null) return null;
  for (let k = 0; k < 7; k++) take(state);
  const value = Number(token.text) + Number(numerator.text) / Number(denominator.text);
  const mixed = { whole: token.text, numerator: numerator.text, denominator: denominator.text };
  const span = { start: token.span.start, end: peek(state, -1).span.end };
  return { kind: "num", value, mixed, span };
}

/** Desmos's name for a mixed number, `2 1/2`. */
function written(node: Extract<Node, { kind: "num" }>): string {
  const m = node.mixed!;
  return `${m.whole} ${m.numerator}/${m.denominator}`;
}

const isMixed = (node: Node): node is Extract<Node, { kind: "num" }> =>
  node.kind === "num" && node.mixed !== undefined;

/** The mixed number at the bottom of a power chain, `2\frac{1}{2}^{2}`, or null. */
function mixedBase(node: Node): Extract<Node, { kind: "num" }> | null {
  if (isMixed(node)) return node.grouped ? null : node;
  if (node.kind === "pow") return mixedBase(node.left);
  return node.kind === "fact" ? mixedBase(node.arg) : null;
}

/**
 * Checks an implicit product of `left` (the factor before) by `right`: a mixed number may not be
 * the right factor, nor the left one of a number, fraction, root or power.
 */
export function checkMixedProduct(state: ParserState, left: Node, right: Node): void {
  const after = mixedBase(right);
  if (after !== null) failMixed(after, "a mixed number after a factor");
  const before = mixedBase(left);
  if (before === null) return;
  if (right.kind === "num" && right.grouped === undefined) {
    const text = state.normalized.slice(right.span.start, right.span.end).replace(/\s/g, "");
    const names = [written(before), right.mixed ? written(right) : text];
    fail("adjacent-numbers", right.span, "a number after a mixed number", undefined, names);
  }
  if (right.kind === "div" || right.kind === "root" || right.kind === "pow") {
    failMixed(before, "a mixed number before a fraction, root or power");
  }
}

function failMixed(node: Extract<Node, { kind: "num" }>, detail: string): never {
  return fail("mixed-number", node.span, detail, undefined, [written(node)]);
}
