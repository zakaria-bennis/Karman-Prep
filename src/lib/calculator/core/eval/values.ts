// Evaluator values. "Undefined" is the single non-value state
// (NM-6): every non-finite number or complex part becomes UNDEFINED here. Pure TypeScript: no DOM
// (AR-44).

export interface Complex {
  re: number;
  im: number;
}

/**
 * The run-time list errors (NM-34 to NM-36, FN-34's repeat counts) an undefined value can carry to
 * its row (R-2).
 */
export type ListErrorCode =
  | "nested-list"
  | "list-too-long"
  | "range-step"
  | "list-mixed"
  | "repeat-count"
  | "repeat-counts"
  | "repeat-lengths";

/** FN-45: the distributions that have shipped, by constructor name. */
export type DistributionName = "normaldist" | "tdist" | "binomialdist";

/**
 * FN-45: a distribution with every parameter filled, defaults included, as written: normaldist
 * [μ, σ], tdist [ν, location, scale], binomialdist [n, p]. NaN marks an undefined parameter.
 */
export interface Distribution {
  name: DistributionName;
  params: readonly number[];
}

export type Value =
  | { type: "number"; value: number }
  | { type: "complex"; value: Complex }
  | { type: "point"; value: [number, number] }
  | { type: "list"; value: Value[] } // PR-34: numbers, complex values, points or distributions; never lists
  | { type: "distribution"; value: Distribution } // FN-45
  | { type: "undefined"; error?: ListErrorCode }; // `error`: the row's value failed with that error

export const UNDEFINED: Value = Object.freeze({ type: "undefined" as const });

/** A real value: non-finite → UNDEFINED; -0 stays -0 (only formatNumber shows it as 0). */
export function numberValue(v: number): Value {
  return Number.isFinite(v) ? { type: "number", value: v } : UNDEFINED;
}

/** A complex value: a non-finite part → UNDEFINED; a zero imaginary part gives a number (decision 7). */
export function complexValue(re: number, im: number): Value {
  if (!Number.isFinite(re) || !Number.isFinite(im)) return UNDEFINED;
  return im === 0 ? { type: "number", value: re } : { type: "complex", value: { re, im } };
}
