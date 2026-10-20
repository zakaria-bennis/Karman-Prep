// Distribution values (FN-45 to FN-49, FN-51): the constructors and the methods and statistics
// that read a distribution, on one set of scalar arguments; the callers broadcast lists over them
// (NM-32), so a list argument gives a list of distributions and a list of distributions a list
// of values. Pure TypeScript: no DOM (AR-44).

import {
  cdf,
  distribution,
  distributionStatistic,
  inverseCdf,
  isDistributionName,
  pdf,
  statistic,
} from "../lib/distributions";
import { numberValue, UNDEFINED, type Value } from "./values";

const QUANTILE_NAMES: ReadonlySet<string> = new Set(["inversecdf", "inverseCdf", "quantile"]);

/** True for a distribution, or a list holding one: the first argument a reader takes. */
export function holdsDistribution(v: Value): boolean {
  return (
    v.type === "distribution" ||
    (v.type === "list" && v.value.some((item) => item.type === "distribution"))
  );
}

/** A scalar argument as a number: NaN for an undefined value, null for any other kind. */
function numberOf(v: Value): number | null {
  if (v.type === "number") return v.value;
  return v.type === "undefined" ? NaN : null;
}

/** FN-45: the distribution `name` of scalar parameters; a non-number parameter is undefined. */
export function makeDistribution(name: string, args: readonly Value[]): Value {
  if (!isDistributionName(name)) return UNDEFINED;
  const params = args.map(numberOf);
  if (params.includes(null)) return UNDEFINED;
  return { type: "distribution", value: distribution(name, params as number[]) };
}

/**
 * FN-47 to FN-49, FN-51: `name` read from the distribution `args[0]` with the scalar numbers
 * after it: pdf(x), cdf(x) or cdf(lo, hi), inversecdf(p) (also inverseCdf and quantile), and mean,
 * median, stdev and var with no more arguments. Any other shape is undefined; analysis reports
 * the counts and types Desmos refuses.
 */
export function readDistribution(name: string, args: readonly Value[]): Value {
  const [d, ...rest] = args;
  if (d === undefined || d.type !== "distribution") return UNDEFINED;
  const numbers = rest.map(numberOf);
  if (numbers.includes(null)) return UNDEFINED;
  const xs = numbers as number[];
  const which = distributionStatistic(name);
  if (which !== undefined)
    return xs.length === 0 ? numberValue(statistic(d.value, which)) : UNDEFINED;
  if (name === "pdf" && xs.length === 1) return numberValue(pdf(d.value, xs[0]));
  if (name === "cdf" && (xs.length === 1 || xs.length === 2)) return numberValue(cdf(d.value, xs));
  if (QUANTILE_NAMES.has(name) && xs.length === 1) {
    return numberValue(inverseCdf(d.value, xs[0]));
  }
  return UNDEFINED;
}
