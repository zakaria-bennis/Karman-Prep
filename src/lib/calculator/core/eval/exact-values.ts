// Exact rational values (MATHS-CORE-1), as live Desmos computes them (captured 2026-10-25): a
// number built from literals by + − · ÷, whole powers, roots that come out rational, |x|, x%,
// total and mean, and carried through names and user-function arguments, is held as an exact
// fraction beside its double, so `f(x)=x+0.2-0.3` gives f(0.1) = 0, `g(p)=25p^{15}-121p^{13}`
// gives g(−11/5) = 0 and `\sqrt{0.01}+0.2-0.3` is 0. Any whole-number double is that integer
// exactly (`\sin(0)+0.1+0.2-0.3` and `\sqrt{2}\cdot0+0.1+0.2-0.3` are 0). Anything else is a plain double: no
// cancellation is rounded away (`\sqrt{2}+2^{-52}-\sqrt{2}` stays 2.22×10^-16, and so does
// `\max(0.1,0.05)+0.2-0.3`'s 5.55×10^-17), and a fraction whose parts pass 2^53 − 1 falls back to
// doubles (g(−11/5) with p^{25} is −1.9×10^-6 there too). The fraction lives in a side table keyed
// by the value object, so values keep their shape. Pure TypeScript: no DOM.

import {
  addFractions,
  divFractions,
  fractionOf,
  literalFraction,
  mulFractions,
  subFractions,
  type Fraction,
} from "../lib/rational";
import type { Value } from "./values";

const FRACTIONS = new WeakMap<Value, Fraction>();
const MAX_POWER = 64;
const ONE: Fraction = { n: 1, d: 1 };

/** The exact fraction a number value holds, or null; a whole-number double is that integer. */
export function exactOf(v: Value): Fraction | null {
  if (v.type !== "number") return null;
  const f = FRACTIONS.get(v);
  if (f !== undefined) return f;
  // −0 stays a double, so `\arctan(-0,-1)` keeps its sign (−π)
  return Number.isSafeInteger(v.value) && !Object.is(v.value, -0) ? { n: v.value, d: 1 } : null;
}

/** A number value holding `f` exactly. */
export function exactValue(f: Fraction): Value {
  const v: Value = { type: "number", value: f.n / f.d };
  FRACTIONS.set(v, f);
  return v;
}

/** A typed number literal: exact as the decimal it is written as (0.1 is 1/10). */
export function literalValue(x: number): Value {
  const f = literalFraction(x);
  return f === null ? { type: "number", value: x } : exactValue(f);
}

type FractionOp = (a: Fraction, b: Fraction) => Fraction | null;
const OPS: Record<"add" | "sub" | "mul" | "div", FractionOp> = {
  add: addFractions,
  sub: subFractions,
  mul: mulFractions,
  div: divFractions,
};

/** a op b exactly, or null when either is not exact or the result does not fit. */
export function exactBinary(kind: keyof typeof OPS, a: Value, b: Value): Value | null {
  const x = exactOf(a);
  if (x === null) return null;
  const y = exactOf(b);
  if (y === null) return null;
  const f = OPS[kind](x, y);
  return f === null ? null : exactValue(f);
}

/** −a, |a| or a% exactly; −0 stays a double (`\arctan(-0,-1)` keeps its sign). */
export function exactUnary(kind: "neg" | "abs" | "pct", a: Value): Value | null {
  const x = exactOf(a);
  if (x === null || (kind === "neg" && x.n === 0)) return null;
  if (kind === "pct") {
    const f = divFractions(x, { n: 100, d: 1 });
    return f === null ? null : exactValue(f);
  }
  return exactValue({ n: kind === "neg" || x.n < 0 ? -x.n : x.n, d: x.d });
}

/** a^b exactly for a whole exponent b up to 64 in size, or null. */
export function exactPower(a: Value, b: Value): Value | null {
  const base = exactOf(a),
    k = exactOf(b);
  if (base === null || k === null || k.d !== 1 || Math.abs(k.n) > MAX_POWER) return null;
  const f = power(base, k.n);
  return f === null ? null : exactValue(f);
}

function power(base: Fraction, k: number): Fraction | null {
  if (base.n === 0 && k <= 0) return null;
  let result: Fraction | null = ONE;
  for (let i = 0; i < Math.abs(k) && result !== null; i++) result = mulFractions(result, base);
  return result === null || k >= 0 ? result : divFractions(ONE, result);
}

/** The k-th root (k a whole number from 2) of an exact radicand when it is rational, or null. */
export function exactRoot(x: Value, index: Value | null, root: Value): Value | null {
  const radicand = exactOf(x),
    k = index === null ? { n: 2, d: 1 } : exactOf(index);
  if (radicand === null || k === null || k.d !== 1 || k.n < 2 || k.n > MAX_POWER) return null;
  if (root.type !== "number") return null;
  const f = fractionOf(root.value),
    back = f === null ? null : power(f, k.n);
  return back !== null && back.n === radicand.n && back.d === radicand.d ? exactValue(f!) : null;
}

/** total or mean of a list whose elements are all exact, exactly; null otherwise. */
export function exactReduction(name: string, args: readonly Value[]): Value | null {
  if ((name !== "total" && name !== "mean") || args.length !== 1) return null;
  const [list] = args;
  if (list.type !== "list" || list.value.length === 0) return null;
  let sum: Fraction | null = { n: 0, d: 1 };
  for (const item of list.value) {
    const f = exactOf(item);
    if (f === null) return null;
    sum = addFractions(sum, f);
    if (sum === null) return null;
  }
  const result = name === "total" ? sum : divFractions(sum, { n: list.value.length, d: 1 });
  return result === null ? null : exactValue(result);
}
