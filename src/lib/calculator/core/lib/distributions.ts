// Distribution objects (FN-45 to FN-49, FN-51) on plain numbers: the constructors' defaults and
// what pdf, cdf, inversecdf and the summary statistics give for normaldist, tdist and
// binomialdist, as Desmos computes them (function catalogue, distributions, captured live
// 2026-10-19). Bad parameters give NaN (undefined), not an error, as in Desmos. Pure TypeScript:
// no DOM (AR-44).

import type { Distribution, DistributionName } from "../eval/values";
import {
  binomialBetween,
  binomialPdf,
  binomialQuantile,
  normalCdfBetween,
  normalDensity,
  normalQuantile,
  tBetween,
  tDensity,
  tQuantile,
} from "./probability";

/**
 * FN-45: each constructor's defaults, filling the trailing parameters left out: normaldist(μ = 0,
 * σ = 1), tdist(ν, location = 0, scale = 1) and binomialdist(n, p = ½). The allowlist's arity
 * (operator-names.ts) holds the counts each accepts.
 */
const DEFAULTS: Readonly<Record<DistributionName, readonly number[]>> = {
  normaldist: [0, 1],
  tdist: [NaN, 0, 1],
  binomialdist: [NaN, 0.5],
};

export const DISTRIBUTION_NAMES: readonly DistributionName[] = Object.freeze(
  Object.keys(DEFAULTS) as DistributionName[]
);

/** The built-ins whose only rule is a distribution's: the constructors, pdf and cdf. */
export const DISTRIBUTION_FUNCTION_NAMES: readonly string[] = Object.freeze([
  ...DISTRIBUTION_NAMES,
  "pdf",
  "cdf",
]);

export function isDistributionName(name: string): name is DistributionName {
  return Object.prototype.hasOwnProperty.call(DEFAULTS, name);
}

/** FN-45: the distribution `name` with `params` written and the rest defaulted. */
export function distribution(name: DistributionName, params: readonly number[]): Distribution {
  const filled = DEFAULTS[name].map((d, k) => (k < params.length ? params[k] : d));
  return Object.freeze({ name, params: Object.freeze(filled) });
}

/** The statistics FN-51 reads from a distribution, aliases included. */
export type DistributionStatistic = "mean" | "median" | "stdev" | "var";
const STATISTIC_ALIASES: ReadonlyMap<string, DistributionStatistic> = new Map([
  ["mean", "mean"],
  ["median", "median"],
  ["stdev", "stdev"],
  ["stddev", "stdev"],
  ["stdDev", "stdev"],
  ["var", "var"],
  ["variance", "var"],
]);

/** The FN-51 statistic a name reads from a distribution, or undefined. */
export function distributionStatistic(name: string): DistributionStatistic | undefined {
  return STATISTIC_ALIASES.get(name);
}

/**
 * FN-47 to FN-51: the names that read a distribution given first, in a call (`pdf(D, x)`,
 * `mean(D)`) or after a dot (`D.pdf(x)`, `D.mean`); quantile is inversecdf, and the statistics'
 * aliases read it too.
 */
const READERS: ReadonlySet<string> = new Set([
  "pdf",
  "cdf",
  "inversecdf",
  "inverseCdf",
  "quantile",
  ...STATISTIC_ALIASES.keys(),
]);

/** True for a name that reads a distribution given as its first argument. */
export function readsDistribution(name: string): boolean {
  return READERS.has(name);
}

/**
 * FN-47: the density, or for binomialdist P(X = x) with x rounded half up: Desmos's normalpdf,
 * tpdf over |scale| and binompdf on the parameters.
 */
export function pdf(d: Distribution, x: number): number {
  const [a, b, c] = d.params;
  switch (d.name) {
    case "normaldist":
      return normalDensity(x, a, b);
    case "tdist":
      return tDensity(x, a, b, c);
    case "binomialdist":
      return binomialPdf(x, a, b);
  }
}

/**
 * FN-48: P(X ≤ x) with one bound, P(lo ≤ X ≤ hi) with two in either order, by Desmos's
 * normalcdf, tcdf and binomcdf; a binomial counts the whole numbers from ⌈lo⌉ to ⌊hi⌋, and σ = 0
 * or scale 0 is a point mass.
 */
export function cdf(d: Distribution, bounds: readonly number[]): number {
  const [a, b, c] = d.params;
  const [lo, hi] = bounds.length === 1 ? [-Infinity, bounds[0]] : bounds;
  switch (d.name) {
    case "normaldist":
      return normalCdfBetween(lo, hi, a, b);
    case "tdist":
      return tBetween(lo, hi, a, b, c);
    case "binomialdist":
      return binomialBetween(lo, hi, a, b);
  }
}

/**
 * FN-49: the x whose cdf is p, as Desmos composes it: invNorm(p)·|σ| + μ and invT(p, ν)·|scale| +
 * location, so σ = 0 gives μ; ±∞ at p = 0 and 1 (shown as undefined). For a binomial, invBinom:
 * the smallest whole k whose cdf reaches p.
 */
export function inverseCdf(d: Distribution, p: number): number {
  const [a, b, c] = d.params;
  switch (d.name) {
    case "normaldist":
      return normalQuantile(p) * Math.abs(b) + a;
    case "tdist":
      return tQuantile(p, a) * Math.abs(c) + b;
    case "binomialdist":
      return binomialQuantile(p, a, b);
  }
}

/**
 * FN-51: the theoretical statistic, by Desmos's formulas with no check on the parameters. normaldist:
 * μ, μ, |σ| and σ². tdist: the location for mean and median whatever ν (`tdist(0).mean` = 0), a
 * variance ν/(ν − 2)·scale² for ν > 2, ∞ for 1 < ν ≤ 2 and undefined below. binomialdist: a mean
 * round(n)·p and a variance round(n)·p·(1 − p) (`binomialdist(10,1.5).var` = −7.5), with invBinom's
 * median.
 */
export function statistic(d: Distribution, which: DistributionStatistic): number {
  const [a, b] = d.params;
  if (which === "stdev") return d.name === "normaldist" ? Math.abs(b) : Math.sqrt(variance(d));
  if (which === "var") return variance(d);
  switch (d.name) {
    case "normaldist":
      return a;
    case "tdist":
      return b;
    case "binomialdist":
      return which === "median" ? binomialQuantile(0.5, a, b) : Math.round(a) * b;
  }
}

function variance(d: Distribution): number {
  const [a, b, c] = d.params;
  switch (d.name) {
    case "normaldist":
      return b * b;
    case "tdist":
      return a > 1 ? (a > 2 ? (a / (a - 2)) * (c * c) : Infinity) : NaN;
    case "binomialdist":
      return Math.round(a) * (b * (1 - b));
  }
}
