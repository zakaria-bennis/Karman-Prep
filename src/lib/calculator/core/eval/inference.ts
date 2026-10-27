// Inference values (FN-53 to FN-58): the test functions and the members that read a test, on
// evaluated arguments. A data list is taken whole; every other argument is a scalar the callers
// broadcast over lists (NM-32), so `ztest([1,2,3],[2,3])` is two tests and `T.null([1,2]).p` two
// p-values, as in Desmos (captured 2026-10-26). Analysis reports the argument counts and types
// Desmos refuses (analysis/inference.ts); what only the values show (a t sample of fewer than 2,
// chi-square lists of different lengths) is a list error the row shows. Pure TypeScript: no DOM
// (AR-44).

import {
  defaultNull,
  intervalResult,
  sampleOf,
  stderrOf,
  estimateOf,
  testResult,
  type Inference,
  type InferenceData,
} from "../lib/inference";
import { ListError, mapN } from "./lists";
import { numberValue, UNDEFINED, type Value } from "./values";

/** The test functions; `ittest` is the reference's name for a two-sample t test of two lists. */
export const INFERENCE_FUNCTIONS: ReadonlySet<string> = new Set([
  "ztest",
  "ttest",
  "ittest",
  "zproptest",
  "chisqtest",
  "chisqgof",
]);

/** The members a test, its null test or its interval can have (operator-names' MEMBER_NAMES, p). */
export const INFERENCE_MEMBERS: ReadonlySet<string> = new Set([
  "p",
  "pleft",
  "pright",
  "score",
  "dof",
  "stderr",
  "estimate",
  "conf",
  "null",
  "lower",
  "upper",
]);

const isList = (v: Value): v is Extract<Value, { type: "list" }> => v.type === "list";

/** A list's elements as numbers (NaN for undefined), or null when `v` is not a list of numbers. */
function numbers(v: Value): number[] | null {
  if (!isList(v)) return null;
  const out: number[] = [];
  for (const item of v.value) {
    if (item.type === "number") out.push(item.value);
    else if (item.type === "undefined") out.push(NaN);
    else return null;
  }
  return out;
}

/** A scalar argument: a number, NaN for undefined, null for anything else. */
function scalar(v: Value): number | null {
  if (v.type === "number") return v.value;
  return v.type === "undefined" ? NaN : null;
}

const wrap = (data: InferenceData): Value => ({
  type: "inference",
  value: Object.freeze({ data, stage: "object" }),
});

/** A t test sample needs 2 values or more (Desmos's "must have at least 2 observations"). */
function tSample(n: number): void {
  if (n < 2) throw new ListError("inference-sample");
}

/** A data sample of a list: z tests take σ as given, t tests the list's own stdev. */
function dataSample(list: readonly number[], sd: number | null) {
  const { n, mean, s } = sampleOf(list);
  return { n, mean, sd: sd ?? s };
}

/** The stats forms, `(n, mean, sd)` once or twice, scalars broadcast over lists. */
function statsForm(name: "ztest" | "ttest", args: readonly Value[]): Value {
  return mapN(args, (vs) => {
    const xs = vs.map(scalar);
    if (xs.includes(null)) return UNDEFINED;
    const [n1, m1, s1, n2, m2, s2] = xs as number[];
    if (name === "ttest") {
      tSample(n1);
      if (xs.length === 6) tSample(n2);
    }
    // a t test's stdev below 0 is undefined (`ttest(10,2,-3)`); a z test's σ is used as written
    const bad = (s: number) => name === "ttest" && s < 0;
    if (bad(s1) || (xs.length === 6 && bad(s2))) return UNDEFINED;
    const a = { n: n1, mean: m1, sd: s1 };
    if (xs.length === 3) return wrap({ family: name === "ztest" ? "z1" : "t1", a });
    return wrap({ family: name === "ztest" ? "z2" : "t2", a, b: { n: n2, mean: m2, sd: s2 } });
  });
}

/** The columns of a chi-square table or the observed and expected lists, all of one length ≥ 2. */
function chiLists(args: readonly Value[]): number[][] | null {
  const lists = args.map(numbers);
  if (lists.includes(null)) return null;
  const ls = lists as number[][];
  if (ls.some((l) => l.length !== ls[0].length)) throw new ListError("inference-lengths");
  if (ls[0].length < 2) throw new ListError("inference-short");
  return ls;
}

/**
 * FN-53 to FN-56: the test `name` makes of `args`, or UNDEFINED for arguments of the wrong kind
 * (analysis names those). ztest(L, σ), ztest(n, x̄, σ), ztest(L1, σ1, L2, σ2) and ztest(n1, x̄1,
 * σ1, n2, x̄2, σ2); ttest(L), ttest(L1, L2) (also `ittest`), ttest(n, x̄, s) and the six-number
 * form; zproptest(x, n) and zproptest(x1, n1, x2, n2); chisqtest(C1, C2, …) of a table's columns;
 * chisqgof(O) against equal counts and chisqgof(O, E) with E rescaled to O's total.
 */
export function makeInference(name: string, args: readonly Value[]): Value {
  const k = args.length;
  switch (name) {
    case "ztest":
    case "ttest":
    case "ittest": {
      const test = name === "ztest" ? "ztest" : "ttest";
      if (k === 3 || k === 6) return statsForm(test, args);
      if (test === "ttest") {
        const lists = args.map(numbers);
        if (lists.includes(null) || (k !== 1 && k !== 2)) return UNDEFINED;
        const [a, b] = lists as number[][];
        tSample(a.length);
        if (b === undefined) return wrap({ family: "t1", a: dataSample(a, null) });
        tSample(b.length);
        return wrap({ family: "t2", a: dataSample(a, null), b: dataSample(b, null) });
      }
      const first = numbers(args[0]),
        second = k === 4 ? numbers(args[2]) : [];
      if (first === null || second === null || (k !== 2 && k !== 4)) return UNDEFINED;
      const sigmas = k === 2 ? [args[1]] : [args[1], args[3]];
      return mapN(sigmas, (vs) => {
        const [s1, s2] = vs.map(scalar);
        if (s1 === null || s2 === null) return UNDEFINED;
        if (k === 2) return wrap({ family: "z1", a: dataSample(first, s1) });
        return wrap({ family: "z2", a: dataSample(first, s1), b: dataSample(second, s2) });
      });
    }
    case "zproptest":
      if (k !== 2 && k !== 4) return UNDEFINED;
      return mapN(args, (vs) => {
        const xs = vs.map(scalar);
        if (xs.includes(null)) return UNDEFINED;
        const [x1, n1, x2, n2] = xs as number[];
        return wrap(k === 2 ? { family: "zp1", x: x1, n: n1 } : { family: "zp2", x1, n1, x2, n2 });
      });
    case "chisqtest": {
      if (k < 2) return UNDEFINED;
      const columns = chiLists(args);
      return columns === null ? UNDEFINED : wrap({ family: "chiind", observed: columns });
    }
    case "chisqgof": {
      if (k !== 1 && k !== 2) return UNDEFINED;
      const lists = chiLists(args);
      if (lists === null) return UNDEFINED;
      const [observed, weights] = lists;
      const total = observed.reduce((s, v) => s + v, 0);
      const w = weights ?? observed.map(() => 1);
      const wTotal = w.reduce((s, v) => s + v, 0);
      return wrap({
        family: "chigof",
        observed,
        expected: w.map((v) => (v * total) / wTotal),
        totalsDiffer: weights !== undefined && Math.abs(wTotal - total) > 1e-9 * Math.abs(total),
      });
    }
    default:
      return UNDEFINED;
  }
}

/** True for an inference value or a list holding one. */
export function holdsInference(v: Value): boolean {
  return v.type === "inference" || (isList(v) && v.value.some((i) => i.type === "inference"));
}

/**
 * FN-57, FN-58: `member` of the inference value `args[0]`, with a number after it for `null` and
 * `conf`; one inference value and scalars (the callers broadcast). Members the value does not
 * have are undefined here; analysis reports them with Desmos's type names.
 */
export function readInference(member: string, args: readonly Value[]): Value {
  const [target, ...rest] = args;
  if (target === undefined || target.type !== "inference") return UNDEFINED;
  const inf = target.value,
    d = inf.data;
  const arg = rest.length === 1 ? scalar(rest[0]) : null;
  if (member === "null" || member === "conf") {
    if (inf.stage !== "object" || arg === null) return UNDEFINED;
    const next: Inference =
      member === "null"
        ? { data: d, stage: "test", nullValue: arg }
        : { data: d, stage: "interval", level: arg };
    return { type: "inference", value: Object.freeze(next) };
  }
  if (rest.length > 0) return UNDEFINED;
  if (inf.stage === "interval") {
    const r = intervalResult(d, inf.level ?? NaN);
    if (member === "lower") return numberValue(r.lower);
    if (member === "upper") return numberValue(r.upper);
    return UNDEFINED;
  }
  if (inf.stage === "object" && member === "estimate") return numberValue(estimateOf(d));
  if (inf.stage === "object" && member === "stderr") return numberValue(stderrOf(d));
  const t = testResult(d, inf.nullValue ?? defaultNull(d.family));
  switch (member) {
    case "score":
      return numberValue(t.score);
    case "p":
      return numberValue(t.p);
    case "pleft":
      return numberValue(t.pleft);
    case "pright":
      return numberValue(t.pright);
    case "dof":
      return numberValue(t.dof);
    default:
      return UNDEFINED;
  }
}
