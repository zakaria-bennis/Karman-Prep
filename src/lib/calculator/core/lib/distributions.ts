// Distribution objects (FN-45 to FN-49, FN-51) on plain numbers: the constructors' defaults and
// what pdf, cdf, inversecdf and the summary statistics give for normaldist, tdist and
// binomialdist, as Desmos computes them (function catalogue, distributions, captured live
// 2026-10-19). Bad parameters give NaN (undefined), not an error, as in Desmos. Pure TypeScript:
// no DOM (AR-44).

import type { Distribution, DistributionName } from "../eval/values";
import {
  binomialBetween,
  binomialCdf,
  binomialPdf,
  binomialQuantile,
  binomialTrials,
  normalBetween,
  normalCdf,
  normalPdf,
  normalQuantile,
  normalSpread,
  tCdf,
  tPdf,
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

/** A location and scale family's spread: |scale|, NaN at 0 (σ = 0 is undefined, FN-45). */
const spread = normalSpread;

/** FN-47: the density, or for binomialdist P(X = x) with x rounded half up. */
export function pdf(d: Distribution, x: number): number {
  const [a, b, c] = d.params;
  switch (d.name) {
    case "normaldist": {
      const s = spread(b);
      return normalPdf((x - a) / s) / s;
    }
    case "tdist": {
      const s = spread(c);
      return tPdf((x - b) / s, a) / s;
    }
    case "binomialdist":
      return binomialPdf(x, a, b);
  }
}

/**
 * FN-48: P(X ≤ x) with one bound, P(lo ≤ X ≤ hi) with two in either order; a binomial counts
 * the whole numbers from ⌈lo⌉ to ⌊hi⌋.
 */
export function cdf(d: Distribution, bounds: readonly number[]): number {
  const [a, b, c] = d.params;
  const [lo, hi] = bounds.length === 1 ? [-Infinity, bounds[0]] : bounds;
  switch (d.name) {
    case "normaldist": {
      const s = spread(b);
      if (bounds.length === 1) return normalCdf((hi - a) / s);
      return normalBetween((lo - a) / s, (hi - a) / s);
    }
    case "tdist": {
      const s = spread(c);
      const [low, high] = [(Math.min(lo, hi) - b) / s, (Math.max(lo, hi) - b) / s];
      if (bounds.length === 1) return tCdf((hi - b) / s, a);
      return low > 0 ? tCdf(-low, a) - tCdf(-high, a) : tCdf(high, a) - tCdf(low, a);
    }
    case "binomialdist":
      return bounds.length === 1 ? binomialCdf(hi, a, b) : binomialBetween(lo, hi, a, b);
  }
}

/**
 * FN-49: the x whose cdf is p, ±∞ at p = 0 and 1 for the continuous ones (shown as undefined);
 * for a binomial the smallest whole k whose cdf reaches p.
 */
export function inverseCdf(d: Distribution, p: number): number {
  const [a, b, c] = d.params;
  switch (d.name) {
    case "normaldist":
      return a + spread(b) * normalQuantile(p);
    case "tdist":
      return b + spread(c) * tQuantile(p, a);
    case "binomialdist":
      return binomialQuantile(p, a, b);
  }
}

/**
 * FN-51: the theoretical statistic. tdist's mean and median are its location for every ν > 0
 * (`tdist(1).mean` = 0, as in Desmos), and its stdev is infinite for 1 < ν ≤ 2 and undefined below.
 */
export function statistic(d: Distribution, which: DistributionStatistic): number {
  if (which === "median") return d.name === "binomialdist" ? inverseCdf(d, 0.5) : center(d);
  if (which === "mean") return center(d);
  const v = variance(d);
  return which === "var" ? v : Math.sqrt(v);
}

function center(d: Distribution): number {
  const [a, b] = d.params;
  switch (d.name) {
    case "normaldist":
      return a;
    case "tdist":
      return a > 0 ? b : NaN;
    case "binomialdist":
      return b >= 0 && b <= 1 ? binomialTrials(a) * b : NaN;
  }
}

function variance(d: Distribution): number {
  const [a, b, c] = d.params;
  switch (d.name) {
    case "normaldist":
      return b * b;
    case "tdist": {
      if (!(a > 1)) return NaN;
      const s = spread(c);
      return a > 2 ? (s * s * a) / (a - 2) : Infinity;
    }
    case "binomialdist":
      return b >= 0 && b <= 1 ? binomialTrials(a) * b * (1 - b) : NaN;
  }
}
