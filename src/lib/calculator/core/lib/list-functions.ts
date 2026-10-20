// Two-list statistics (FN-30 to FN-32) and list operations (FN-34 to FN-36, FN-38), as Desmos
// evaluates them (function catalogue, captured live 2026-10-19). cov, covp, corr and spearman take
// exactly two lists, cut to the shorter, and give one number; sort, unique, join and repeat take
// their arguments whole, never element by element, and give a list. Any undefined element makes
// a two-list result undefined. Pure TypeScript: no DOM (AR-44).

import { ListError, MAX_LIST_ELEMENTS } from "../eval/lists";
import { REFUSED_NAMES } from "../latex/operator-names";
import { numberValue, UNDEFINED, type Value } from "../eval/values";

export interface ListOperation {
  kind: "double" | "operation";
  /** The fewest arguments Desmos accepts when the allowlist arity is variadic (join: 2). */
  minArguments?: number;
  apply(args: readonly Value[]): Value;
}

type ListValue = Extract<Value, { type: "list" }>;
const isList = (v: Value): v is ListValue => v.type === "list";
const list = (value: Value[]): Value => ({ type: "list", value });

const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Σ(x − x̄)(y − ȳ), Σ(x − x̄)² and Σ(y − ȳ)² over paired data, in two passes. */
function moments(xs: readonly number[], ys: readonly number[]): [number, number, number] {
  const [mx, my] = [mean(xs), mean(ys)];
  let [sxy, sxx, syy] = [0, 0, 0];
  for (let i = 0; i < xs.length; i++) {
    const [dx, dy] = [xs[i] - mx, ys[i] - my];
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return [sxy, sxx, syy];
}

/** FN-30: population covariance, n; one pair gives 0. */
const covp = (xs: readonly number[], ys: readonly number[]) => moments(xs, ys)[0] / xs.length;
/**
 * FN-30: sample covariance as Desmos rounds it, covp · n / (n − 1) rather than Σ / (n − 1), so
 * whole-number results stay whole; one pair is 0 / 0, undefined.
 */
const cov = (xs: readonly number[], ys: readonly number[]) =>
  (covp(xs, ys) * xs.length) / (xs.length - 1);

/** FN-31: Pearson's r, undefined for fewer than two pairs or a list with no spread. */
function corr(xs: readonly number[], ys: readonly number[]): number {
  const [sxy, sxx, syy] = moments(xs, ys);
  return sxy / Math.sqrt(sxx * syy);
}

/** FN-32: 1-based ranks, tied values sharing the mean of the ranks they span. */
function ranks(xs: readonly number[]): number[] {
  const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]),
    out: number[] = new Array<number>(xs.length);
  for (let start = 0; start < order.length; ) {
    let end = start;
    while (end + 1 < order.length && xs[order[end + 1]] === xs[order[start]]) end += 1;
    for (let k = start; k <= end; k++) out[order[k]] = (start + end) / 2 + 1;
    start = end + 1;
  }
  return out;
}

const spearman = (xs: readonly number[], ys: readonly number[]) => corr(ranks(xs), ranks(ys));

/** A two-list statistic: both arguments lists of numbers, paired by index over the shorter. */
function double(rule: (xs: readonly number[], ys: readonly number[]) => number): ListOperation {
  return {
    kind: "double",
    apply(args) {
      const [a, b] = args;
      if (args.length !== 2 || !isList(a) || !isList(b)) return UNDEFINED;
      const n = Math.min(a.value.length, b.value.length),
        xs: number[] = [],
        ys: number[] = [];
      for (let i = 0; i < n; i++) {
        const [x, y] = [a.value[i], b.value[i]];
        if (x.type !== "number" || y.type !== "number") return UNDEFINED;
        xs.push(x.value);
        ys.push(y.value);
      }
      return n === 0 ? UNDEFINED : numberValue(rule(xs, ys) + 0);
    },
  };
}

/** A sort key: a number, a complex value by real then imaginary part, else undefined (NaN). */
function key(v: Value): [number, number] {
  if (v.type === "number") return [v.value, 0];
  if (v.type === "complex") return [v.value.re, v.value.im];
  return [NaN, NaN];
}

/** Ascending with undefined last, as Desmos compares sort keys; 0 and −0 are equal. */
function ascending(a: number, b: number): number {
  const d = a - b;
  return Number.isNaN(d) ? Number(Number.isNaN(a)) - Number(Number.isNaN(b)) : d;
}

/**
 * FN-36: the stable ascending order of `keys`' first `n` elements, undefined ones last, as 0-based
 * indexes: Desmos's sortPerm (`sortPerm([3,1,2])` = [1, 2, 0]), and complexSortPerm, which orders
 * by real then imaginary part and so agrees with it on real numbers.
 */
function sortOrder(keys: readonly Value[], n = keys.length): number[] {
  const ks = keys.slice(0, n).map(key),
    order = ks.map((_, i) => i);
  order.sort((i, j) => ascending(ks[i][0], ks[j][0]) || ascending(ks[i][1], ks[j][1]));
  return order;
}

/**
 * FN-36: `sort(L)` sorts numbers ascending with undefined elements last; `sort(L, K)` reorders L
 * (numbers or points) by the keys K, cut to the shorter list. Both are stable.
 */
function sort(args: readonly Value[]): Value {
  const [items, keys = items] = args;
  if (!isList(items) || !isList(keys)) return UNDEFINED;
  if (keys.value.some((k) => k.type === "point")) return UNDEFINED;
  const order = sortOrder(keys.value, Math.min(items.value.length, keys.value.length));
  return list(order.map((i) => items.value[i]));
}

/** sortPerm and complexSortPerm of one list of numbers: its sort order (sortOrder). */
function sortPerm(args: readonly Value[]): Value {
  const [keys] = args;
  if (args.length !== 1 || !isList(keys) || keys.value.some((k) => k.type === "point"))
    return UNDEFINED;
  return list(sortOrder(keys.value).map(numberValue));
}

/** FN-38: the text Desmos keys a value by, so 0 and −0 match, as do two undefined elements. */
function identity(v: Value): string {
  switch (v.type) {
    case "number":
      return String(v.value);
    case "complex":
      return `${v.value.re},${v.value.im}i`;
    case "point":
      return `[${v.value.map(String).join(",")}]`;
    default:
      return "NaN";
  }
}

/** FN-38: the 0-based index of each value's first occurrence, in order: Desmos's uniquePerm. */
function firstOccurrences(items: readonly Value[]): number[] {
  const seen = new Set<string>(),
    kept: number[] = [];
  items.forEach((v, i) => {
    const id = identity(v);
    if (seen.has(id)) return;
    seen.add(id);
    kept.push(i);
  });
  return kept;
}

/** FN-38: `unique(L)` keeps each value's first occurrence; `uniquePerm(L)` gives their indexes. */
const uniqueBy =
  (pick: (items: readonly Value[], i: number) => Value) =>
  (args: readonly Value[]): Value => {
    const [items] = args;
    if (args.length !== 1 || !isList(items)) return UNDEFINED;
    return list(firstOccurrences(items.value).map((i) => pick(items.value, i)));
  };

/**
 * FN-35: numbers and lists of numbers, or points and lists of points, end to end; points beside
 * numbers are undefined (analysis gives Desmos's error).
 */
function join(args: readonly Value[]): Value {
  if (args.length < 2) return UNDEFINED;
  const items = args.flatMap((arg) => (isList(arg) ? arg.value : [arg]));
  const points = items.some((v) => v.type === "point"),
    numbers = items.some((v) => v.type === "number" || v.type === "complex");
  if (points && numbers) return UNDEFINED;
  if (items.length > MAX_LIST_ELEMENTS) throw new ListError("list-too-long");
  return list(items);
}

/**
 * FN-34: a repeat count must be a whole number, 0 or more; Desmos words a bad count in a list of
 * counts (`repeat-counts`) apart from a single bad count (`repeat-count`).
 */
function count(v: Value, code: "repeat-count" | "repeat-counts"): number {
  const n = v.type === "number" ? v.value : NaN;
  if (!Number.isInteger(n) || n < 0) throw new ListError(code);
  return n;
}

/**
 * FN-34: `repeat(v, n)` is n copies of a number or point v; `repeat(L, N)` repeats L's element i
 * N[i] times, the lists of the same length. A count that is not a whole number 0 or more is
 * `repeat-count` (`repeat-counts` in a list of counts), lists of different lengths
 * `repeat-lengths`, checked before the counts, and a result over 10,000 elements
 * `list-too-long`, Desmos's errors; a list beside a single value is undefined.
 */
function repeat(args: readonly Value[]): Value {
  const [v, n] = args;
  if (args.length !== 2 || isList(v) !== isList(n)) return UNDEFINED;
  const values = isList(v) ? v.value : [v],
    counts = isList(n) ? n.value : [n];
  if (values.length !== counts.length) throw new ListError("repeat-lengths");
  const code = isList(n) ? "repeat-counts" : "repeat-count",
    times = counts.map((c) => count(c, code));
  if (times.reduce((s, t) => s + t, 0) > MAX_LIST_ELEMENTS) throw new ListError("list-too-long");
  return list(values.flatMap((value, i) => Array.from({ length: times[i] }, () => value)));
}

/** Every two-list statistic and list operation by name. */
export const LIST_OPERATIONS: ReadonlyMap<string, ListOperation> = new Map<string, ListOperation>([
  ["cov", double(cov)],
  ["covp", double(covp)],
  ["corr", double(corr)],
  ["spearman", double(spearman)],
  ["sort", { kind: "operation", apply: sort }],
  ["unique", { kind: "operation", apply: uniqueBy((items, i) => items[i]) }],
  ["join", { kind: "operation", minArguments: 2, apply: join }],
  ["repeat", { kind: "operation", apply: repeat }],
  // hidden names, which only pasted latex reaches (HIDDEN_OPERATOR_NAMES)
  ["sortPerm", { kind: "operation", apply: sortPerm }],
  ["complexSortPerm", { kind: "operation", apply: sortPerm }],
  ["uniquePerm", { kind: "operation", apply: uniqueBy((_, i) => numberValue(i)) }],
  // Desmos built-ins its calculator refuses after checking their arguments (analysis gives the
  // refusal, so they never evaluate)
  ...REFUSED_NAMES.map((name): [string, ListOperation] => [
    name,
    { kind: "operation", apply: () => UNDEFINED },
  ]),
]);
