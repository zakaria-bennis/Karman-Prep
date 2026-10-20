// Statistics and number-theory reducers (FN-2, FN-23 to FN-29, FN-75), as Desmos evaluates them
// (function catalogue, captured live 2026-10-19). A reducer reduces one list, or its arguments when
// all are numbers (`mean(1,2,3)` = 2); with several arguments of which one or more are lists it
// broadcasts, element i reducing the i-th elements, numbers repeated and lists cut to the shortest
// (`mean(L,10)`, `max([1,2],5)` = [5, 5]). quantile and quartile reduce their first argument, a
// list, and broadcast over the second. length takes its arguments whole and never broadcasts. Any
// undefined element makes an arithmetic result undefined; count and length count it. Pure
// TypeScript: no DOM (AR-44).

import { complexValue, numberValue, UNDEFINED, type Complex, type Value } from "../eval/values";

export interface ListFunction {
  kind: "reducer" | "parameterized" | "length";
  /** Takes a list of points: mean and total give a point, count and length count them. */
  points: boolean;
  /** `f()` reads "Function 'f' requires an argument" (min, max, length), else "at least one". */
  oneArgument: boolean;
}

interface Rule extends ListFunction {
  counts?: true; // count and length: the number of elements, undefined ones included
  numbers(xs: readonly number[], p: number): number; // p: quantile's or quartile's parameter
  complex?: (zs: readonly Complex[]) => Complex; // gcd and lcm of Gaussian integers
}

function sum(xs: readonly number[]): number {
  let total = 0;
  for (const x of xs) total += x;
  return total;
}

const mean = (xs: readonly number[]) => sum(xs) / xs.length;

/** Σ(x − mean)², in two passes, so `stdev([10^9+1,10^9+2,10^9+3])` is exactly 1. */
function squaredDeviations(xs: readonly number[]): number {
  const m = mean(xs);
  let total = 0;
  for (const x of xs) total += (x - m) * (x - m);
  return total;
}

const variance = (xs: readonly number[]) =>
  xs.length < 2 ? NaN : squaredDeviations(xs) / (xs.length - 1);
const populationVariance = (xs: readonly number[]) => squaredDeviations(xs) / xs.length;

/** FN-26: mad is the mean absolute deviation from the mean (`mad([1,2,3,10])` = 3). */
function meanAbsoluteDeviation(xs: readonly number[]): number {
  const m = mean(xs);
  let total = 0;
  for (const x of xs) total += Math.abs(x - m);
  return total / xs.length;
}

const sorted = (xs: readonly number[]) => [...xs].sort((a, b) => a - b);

/** The middle of sorted data, or the mean of the two middle values. */
function middle(s: readonly number[]): number {
  const n = s.length,
    half = Math.floor(n / 2);
  if (n === 0) return NaN;
  return n % 2 === 1 ? s[half] : (s[half - 1] + s[half]) / 2;
}

function extreme(xs: readonly number[], pick: (a: number, b: number) => number): number {
  if (xs.length === 0) return NaN;
  let best = xs[0];
  for (const x of xs) best = pick(best, x);
  return best;
}

/** FN-27: type 7, linear interpolation at position (n − 1)·p of the sorted data; p in [0, 1]. */
function quantile(xs: readonly number[], p: number): number {
  if (xs.length === 0 || !(p >= 0 && p <= 1)) return NaN;
  const s = sorted(xs),
    h = (s.length - 1) * p,
    lo = Math.floor(h),
    hi = Math.min(lo + 1, s.length - 1);
  return s[lo] + (h - lo) * (s[hi] - s[lo]);
}

/**
 * FN-27: q in [0, 4], then rounded half up: 0 the minimum, 2 the median, 4 the maximum, and 1 and 3
 * the medians of the lower and upper halves, leaving out the middle value when n is odd
 * (`quartile([1,2,3,4,5],1)` = 1.5); one value is its own halves.
 */
function quartile(xs: readonly number[], q: number): number {
  const n = xs.length;
  if (n === 0 || !(q >= 0 && q <= 4)) return NaN;
  const s = sorted(xs),
    k = Math.floor(q + 0.5);
  if (k === 0 || k === 4) return s[k === 0 ? 0 : n - 1];
  if (k === 2) return middle(s);
  const half = k === 1 ? s.slice(0, Math.floor(n / 2)) : s.slice(Math.ceil(n / 2));
  return middle(half.length === 0 ? s : half);
}

/** FN-75: Euclid's gcd of whole numbers, each argument rounded first (`gcd(2.4,4)` = 2). */
function gcd(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  let g = 0;
  for (const x of xs) {
    if (!Number.isFinite(x)) return NaN;
    let [a, b] = [Math.abs(Math.round(x)), g];
    while (b !== 0) [a, b] = [b, a % b];
    g = a;
  }
  return g;
}

/** FN-75: lcm, rounded like gcd; any 0 gives 0 (`lcm(0,5)` = 0). */
function lcm(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  let l = 1;
  for (const x of xs) {
    const a = Math.abs(Math.round(x));
    if (!Number.isFinite(a)) return NaN;
    l = a === 0 || l === 0 ? 0 : (l / gcd([l, a])) * a;
  }
  return l;
}

const ZERO: Complex = Object.freeze({ re: 0, im: 0 });
const isZero = (z: Complex) => z.re === 0 && z.im === 0;
const roundC = (z: Complex): Complex => ({ re: Math.round(z.re), im: Math.round(z.im) });
const mulC = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

/** The quotient a/b of Gaussian integers rounded to the nearest one. */
function nearestQuotient(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  return roundC({ re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d });
}

/** The associate of z with re > 0 and im ≥ 0 (z times a power of i), as Desmos shows a gcd. */
function firstQuadrant(z: Complex): Complex {
  let w = { re: z.re + 0, im: z.im + 0 };
  for (let k = 0; k < 4 && !isZero(w) && !(w.re > 0 && w.im >= 0); k++) {
    w = { re: -w.im + 0, im: w.re + 0 };
  }
  return w;
}

function gaussianGcd(a: Complex, b: Complex): Complex {
  for (let k = 0; k < 2000 && !isZero(b); k++) {
    const q = nearestQuotient(a, b),
      qb = mulC(q, b);
    [a, b] = [b, { re: a.re - qb.re, im: a.im - qb.im }];
  }
  return isZero(b) ? firstQuadrant(a) : { re: NaN, im: NaN };
}

/** FN-75 in complex mode: Gaussian integers, each part rounded first (`gcd(3+i,1+i)` = 1+i). */
function complexGcd(zs: readonly Complex[]): Complex {
  if (zs.length === 0) return { re: NaN, im: NaN };
  return zs.map(roundC).reduce(gaussianGcd, ZERO);
}

function complexLcm(zs: readonly Complex[]): Complex {
  if (zs.length === 0) return { re: NaN, im: NaN };
  return zs.map(roundC).reduce((l, z) => {
    if (isZero(l) || isZero(z)) return ZERO;
    return firstQuadrant(mulC(nearestQuotient(l, gaussianGcd(l, z)), z));
  });
}

const reducer = (numbers: (xs: readonly number[]) => number, points = false): Rule => ({
  kind: "reducer",
  points,
  oneArgument: false,
  numbers,
});
const extremeRule = (pick: (a: number, b: number) => number): Rule => ({
  ...reducer((xs) => extreme(xs, pick)),
  oneArgument: true,
});
const parameterized = (numbers: (xs: readonly number[], p: number) => number): Rule => ({
  kind: "parameterized",
  points: false,
  oneArgument: false,
  numbers,
});
const gcdRule: Rule = { ...reducer(gcd), complex: complexGcd };
const lcmRule: Rule = { ...reducer(lcm), complex: complexLcm };

/** Every list function by name, gcf and mcd being gcd and mcm lcm, as in Desmos. */
const RULES: ReadonlyMap<string, Rule> = new Map<string, Rule>([
  ["mean", reducer(mean, true)],
  ["median", reducer((xs) => middle(sorted(xs)))],
  ["min", extremeRule(Math.min)],
  ["max", extremeRule(Math.max)],
  ["total", reducer(sum, true)],
  ["count", { ...reducer((xs) => xs.length, true), counts: true }],
  [
    "length",
    { kind: "length", points: true, oneArgument: true, counts: true, numbers: (xs) => xs.length },
  ],
  ["var", reducer(variance)],
  ["varp", reducer(populationVariance)],
  ["stdev", reducer((xs) => Math.sqrt(variance(xs)))],
  ["stdevp", reducer((xs) => Math.sqrt(populationVariance(xs)))],
  ["mad", reducer(meanAbsoluteDeviation)],
  ["quantile", parameterized(quantile)],
  ["quartile", parameterized(quartile)],
  ["gcd", gcdRule],
  ["gcf", gcdRule],
  ["mcd", gcdRule],
  ["lcm", lcmRule],
  ["mcm", lcmRule],
]);

/** The list function `name`, or undefined for any other name. */
export function listFunction(name: string): ListFunction | undefined {
  return RULES.get(name);
}

/** The names of every list function. */
export const LIST_FUNCTION_NAMES: readonly string[] = Object.freeze([...RULES.keys()]);

/**
 * Whether a call of the list function `name` gives a list, from whether each argument is one: a
 * reducer broadcasts when it has two or more arguments and a list among them, quantile and
 * quartile when the parameter is a list, and length never.
 */
export function givesList(name: string, argIsList: readonly boolean[]): boolean {
  const rule = RULES.get(name);
  if (rule === undefined || rule.kind === "length") return false;
  if (rule.kind === "parameterized") return argIsList[1] === true;
  return argIsList.length > 1 && argIsList.includes(true);
}

/**
 * The real result of a list function over plain numbers, `p` its parameter for quantile and
 * quartile: count and length count, and any NaN element makes every other result NaN.
 */
export function reduceNumbers(name: string, xs: readonly number[], p = NaN): number {
  const rule = RULES.get(name);
  if (rule === undefined) return NaN;
  if (rule.counts) return xs.length;
  if (xs.some(Number.isNaN)) return NaN;
  const r = rule.numbers(xs, p);
  return Number.isFinite(r) ? r + 0 : NaN;
}

type ListValue = Extract<Value, { type: "list" }>;
const isList = (v: Value): v is ListValue => v.type === "list";

/**
 * A list function applied to evaluated arguments, by the rules at the top of this file. An unknown
 * name, no arguments, a parameterized call whose data is not a list or that does not have two
 * arguments, or length with a list beside another argument, gives UNDEFINED.
 */
export function applyListFunction(name: string, args: readonly Value[]): Value {
  const rule = RULES.get(name);
  if (rule === undefined || args.length === 0) return UNDEFINED;
  if (rule.kind === "length") {
    if (args.length === 1) return numberValue(isList(args[0]) ? args[0].value.length : 1);
    return args.some(isList) ? UNDEFINED : numberValue(args.length);
  }
  if (rule.kind === "parameterized") {
    const [data, p] = args;
    if (args.length !== 2 || !isList(data)) return UNDEFINED;
    const reduce = (q: Value) =>
      q.type === "number" ? reduced(name, rule, data.value, q.value) : UNDEFINED;
    return isList(p) ? { type: "list", value: p.value.map(reduce) } : reduce(p);
  }
  if (args.length === 1) return reduced(name, rule, isList(args[0]) ? args[0].value : args);
  if (!args.some(isList)) return reduced(name, rule, args);
  let n = Infinity;
  for (const arg of args) if (isList(arg)) n = Math.min(n, arg.value.length);
  const value: Value[] = [];
  for (let i = 0; i < n; i++) {
    value.push(
      reduced(
        name,
        rule,
        args.map((arg) => (isList(arg) ? arg.value[i] : arg))
      )
    );
  }
  return { type: "list", value };
}

/** One reduction of `items`: numbers, points for mean and total, Gaussian integers for gcd and lcm. */
function reduced(name: string, rule: Rule, items: readonly Value[], p = NaN): Value {
  if (rule.counts) return numberValue(items.length);
  if (rule.points && items.length > 0 && items.every((v) => v.type === "point")) {
    const coordinate = (k: 0 | 1) =>
      reduceNumbers(
        name,
        items.map((v) => (v.type === "point" ? v.value[k] : NaN))
      );
    const [x, y] = [coordinate(0), coordinate(1)];
    return Number.isFinite(x) && Number.isFinite(y) ? { type: "point", value: [x, y] } : UNDEFINED;
  }
  if (rule.complex !== undefined && items.some((v) => v.type === "complex")) {
    const zs: Complex[] = [];
    for (const v of items) {
      if (v.type === "number") zs.push({ re: v.value, im: 0 });
      else if (v.type === "complex") zs.push(v.value);
      else return UNDEFINED;
    }
    const z = rule.complex(zs);
    return complexValue(z.re, z.im);
  }
  const xs: number[] = [];
  for (const v of items) {
    if (v.type !== "number") return UNDEFINED;
    xs.push(v.value);
  }
  return numberValue(reduceNumbers(name, xs, p));
}
