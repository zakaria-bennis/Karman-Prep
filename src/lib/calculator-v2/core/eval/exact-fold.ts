// The exact constant path of value evaluation (MATHS-CORE-1, 2 and 61; NM-3 amendment, appendix F
// decision 2). A real `Value` may carry an exact rational beside its double, kept in a WeakMap so
// the Value shape is unchanged. A decimal literal brings its parsed rational, and an integer-valued
// double re-enters as x/1 (MATHS-CORE-1 rule ii). +, −, ×, ÷, powers, %, sqrt, mod, abs and
// round(x, n) on exact operands compute through rational.ts; a result that is not exact, and any
// non-real operand, takes the double operation of ops.ts or applyBuiltin unchanged. Every other
// built-in receives the double. Definitions and user-function arguments pass the same Value
// objects, so they stay exact (MATHS-CORE-2). Graphing folds its constant sub-trees through this
// path once and uses doubles for the rest (constant-subtrees.ts). Pure TypeScript: no DOM (AR-44).

import type { RelOp } from "../latex/ast";
import { roundTo } from "../lib/number-theory";
import { linkHolds } from "./ops";
import * as Q from "./rational";
import { type ExactNumber, type ExactRational } from "./rational";
import { numberValue, type Value } from "./values";

const EXACT = new WeakMap<Value, ExactRational>();

type DoubleBinary = (a: Value, b: Value) => Value;
type DoubleUnary = (a: Value) => Value;

/** The exact rational of a real value: its carried rational, or an integer double as x/1. */
export function exactOf(v: Value): ExactRational | null {
  if (v.type !== "number") return null;
  const carried = EXACT.get(v);
  if (carried !== undefined) return carried;
  const promoted = Q.fromDouble(v.value);
  return Q.isExactRational(promoted) ? promoted : null;
}

/** A real value holding `r` exactly; -0 from the double path survives an exact zero. */
function exactValue(r: ExactRational, double?: Value): Value {
  const zero = double !== undefined && double.type === "number" && double.value === 0;
  const v = numberValue(r.n === 0 && zero ? double.value : Q.toNumber(r));
  EXACT.set(v, r);
  return v;
}

/** A literal's value, carrying its exact rational when the parser found one. */
export function literalValue(value: number, exact: ExactRational | undefined): Value {
  const v = numberValue(value);
  if (exact !== undefined) EXACT.set(v, exact);
  return Object.freeze(v);
}

/**
 * `exact` on two exact operands, else `double`. A non-exact result keeps the rational module's
 * double when `keepFallback` (its +, −, × and ÷ fall back like the reference), else `double`.
 */
export function exactBinary(
  exact: (a: ExactRational, b: ExactRational) => ExactNumber,
  double: DoubleBinary,
  keepFallback: boolean
): DoubleBinary {
  return (a, b) => {
    const x = exactOf(a);
    const y = x === null ? null : exactOf(b);
    if (x === null || y === null) return double(a, b);
    const r = exact(x, y);
    if (Q.isExactRational(r)) return exactValue(r, double(a, b));
    return keepFallback ? numberValue(r) : double(a, b);
  };
}

/** `exact` on an exact operand, else `double` (also when the result is not exact). */
export function exactUnary(
  exact: (a: ExactRational) => ExactNumber,
  double: DoubleUnary
): DoubleUnary {
  return (a) => {
    const x = exactOf(a);
    const r = x === null ? null : exact(x);
    return r !== null && Q.isExactRational(r) ? exactValue(r, double(a)) : double(a);
  };
}

const HUNDRED: ExactRational = { n: 100, d: 1 };
const TEN: ExactRational = { n: 10, d: 1 };

/** x% as x/100. */
export const exactPercent = (x: ExactRational) => Q.div(x, HUNDRED);

/**
 * MATHS-CORE-61: round(x, n) is round(x·10^r)/10^r with r = Math.round(n), the product and the
 * quotient exact; only the whole-number rounding sees a double. Null when x·10^r is not exact.
 */
export function exactRound(x: ExactRational, n: number): ExactNumber | null {
  const scale = Q.pow(TEN, Q.fromDouble(Math.round(n)));
  if (!Q.isExactRational(scale)) return null;
  const scaled = Q.mul(x, scale);
  if (!Q.isExactRational(scaled)) return null;
  return Q.div(Q.fromDouble(roundTo(Q.toNumber(scaled))), scale);
}

/** The exact versions of built-ins (MATHS-CORE-1 rule i, MATHS-CORE-61), or null for the rest. */
export function exactBuiltin(name: string, args: readonly Value[]): Value | null {
  const x = args.length > 0 ? exactOf(args[0]) : null;
  if (x === null) return null;
  let r: ExactNumber | null = null;
  if (name === "abs" && args.length === 1) r = Q.abs(x);
  else if (name === "mod" && args.length === 2) {
    const y = exactOf(args[1]);
    r = y === null ? null : Q.mod(x, y);
  } else if (name === "round" && args.length === 2 && args[1].type === "number") {
    r = exactRound(x, args[1].value);
  }
  return r !== null && Q.isExactRational(r) ? exactValue(r) : null;
}

/**
 * The order of two exact rationals: negative, zero or positive. Distinct rationals can share a
 * double, such as (2^53−2)/(2^53−1) and (2^53−3)/(2^53−2), so the doubles decide only when they
 * differ (rounding keeps order); otherwise the cross-products decide, as big integers.
 */
function compareExact(a: ExactRational, b: ExactRational): number {
  const x = Q.toNumber(a),
    y = Q.toNumber(b);
  if (x !== y) return x < y ? -1 : 1;
  if (a.n === b.n && a.d === b.d) return 0;
  const left = BigInt(a.n) * BigInt(b.d),
    right = BigInt(b.n) * BigInt(a.d);
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * relationHolds on exact values (MATHS-CORE-54, NM-41 amendment): a link between two operands
 * that both carry an exact rational compares the rationals; any other link compares the doubles,
 * and a non-real or non-finite operand fails, as in relationHolds.
 */
export function exactRelationHolds(values: readonly Value[], ops: readonly RelOp[]): boolean {
  if (values.length !== ops.length + 1) return false;
  for (let k = 0; k < ops.length; k++) {
    const a = values[k],
      b = values[k + 1];
    if (a.type !== "number" || b.type !== "number") return false;
    if (!Number.isFinite(a.value) || !Number.isFinite(b.value)) return false;
    const x = exactOf(a),
      y = exactOf(b);
    if (x === null || y === null) {
      if (!linkHolds(a.value, ops[k], b.value)) return false;
      continue;
    }
    if (!linkHolds(compareExact(x, y), ops[k], 0)) return false;
  }
  return true;
}
