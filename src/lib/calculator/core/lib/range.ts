// The range rule (NM-35, NM-36), shared by analysis, which checks ranges of number literals before
// anything runs, and evaluation, which builds every range. Pure TypeScript: no DOM (AR-44).

import { divFractions, fractionOf, subFractions, type Fraction } from "./rational";

/** NM-35: the most elements a list holds. */
export const MAX_LIST_ELEMENTS = 10_000;

/** The element count of a range and its k-th element (k from 0), or why it has none. */
export type RangeShape =
  | { count: number; element: (k: number) => number }
  | "range-step"
  | "list-too-long";

/**
 * NM-36, as Desmos builds a range from the values written before the ellipsis (`starts`) and
 * after it (`ends`). The step s is starts[1] − starts[0], or 1 (−1 when the last end is below
 * starts[0]) for one start. The count is 1 + round((last end − starts[0])/s), rounding halves up,
 * so the last element can pass the bound by up to half a step (`[1...3.5]` is [1, 2, 3, 4]); the
 * elements are starts[0] + k·s. Every other written value must sit on the sequence: starts[i]
 * at k = i and ends[i] at its place counted back from the last element, each within 10 bits
 * (`[1,2,3,...,10]`, `[1,...,9,10]`), or the range is `range-step`, Desmos's "Ranges must be
 * arithmetic sequences." (`[1,2,4,...,10]`). So is a count that is not finite (a bound that is
 * not a finite number, a step of 0) or below the number of starts or of ends (`[1,3,...,1]`); a
 * count over MAX_LIST_ELEMENTS is `list-too-long`. As in Desmos, the arithmetic is exact on
 * fractions (rational.ts) wherever they fit, so `[0,0.1,...,1]` holds 0.3 and `[1,1.1,...,1.25]`
 * counts 2.5 steps, rounded to 3; anything else is done in doubles.
 */
export function rangeShape(starts: readonly number[], ends: readonly number[]): RangeShape {
  const first = starts[0],
    last = ends[ends.length - 1];
  const step = starts.length > 1 ? difference(starts[1], first) : unitStep(last, first);
  const offset = (x: number) => quotient(difference(x, first), step);
  const count = 1 + Math.round(offset(last));
  const onSequence =
    starts.every((x, i) => i < 2 || sameWithin10Bits(offset(x), i)) &&
    ends.every(
      (x, i) => i === ends.length - 1 || sameWithin10Bits(offset(x), count - ends.length + i)
    );
  if (!onSequence || !Number.isFinite(count) || count < starts.length || count < ends.length) {
    return "range-step";
  }
  if (count > MAX_LIST_ELEMENTS) return "list-too-long";
  return { count, element: elements(first, step, count) };
}

/** A number as a double and, when it has one that fits, an exact fraction. */
interface Exact {
  value: number;
  exact: Fraction | null;
}

function difference(x: number, y: number): Exact {
  const [fx, fy] = [fractionOf(x), fractionOf(y)];
  const exact = fx === null || fy === null ? null : subFractions(fx, fy);
  return { value: exact === null ? x - y : exact.n / exact.d, exact };
}

/** 1, or −1 when x is below y, for a range written with one start. */
function unitStep(x: number, y: number): Exact {
  const value = difference(x, y).value >= 0 ? 1 : -1;
  return { value, exact: { n: value, d: 1 } };
}

function quotient(x: Exact, y: Exact): number {
  const exact = x.exact === null || y.exact === null ? null : divFractions(x.exact, y.exact);
  return exact === null ? x.value / y.value : exact.n / exact.d;
}

/**
 * Desmos's test that a written value sits on the sequence: equal, or both finite and so close
 * that 2^-10 of their difference vanishes beside the larger magnitude (at least 1).
 */
function sameWithin10Bits(a: number, b: number): boolean {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return scale + Math.abs(b - a) * 2 ** -10 === scale;
}

/**
 * first + k·step: with first = A/D and step = S/D over a common denominator, A + k·S stays an
 * exact integer when |A| + (count − 1)·|S| fits, and one division then rounds it correctly;
 * otherwise in doubles.
 */
function elements(first: number, step: Exact, count: number): (k: number) => number {
  const f = fractionOf(first),
    s = step.exact;
  const inDoubles = (k: number) => first + step.value * k + 0;
  if (f === null || s === null) return inDoubles;
  const [fn, fd, sn, sd] = [f.n, f.d, s.n, s.d].map(BigInt);
  const d = (fd / gcd(fd, sd)) * sd;
  const [a, b] = [fn * (d / fd), sn * (d / sd)];
  const reach = abs(a) + BigInt(count - 1) * abs(b);
  if (reach > BigInt(Number.MAX_SAFE_INTEGER) || d > BigInt(Number.MAX_SAFE_INTEGER)) {
    return inDoubles;
  }
  const [na, nb, nd] = [Number(a), Number(b), Number(d)];
  return (k) => (na + k * nb) / nd + 0;
}

function abs(x: bigint): bigint {
  return x < BigInt(0) ? -x : x;
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a;
}
