// Test tolerance classes (FN-11). Tests compare a computed number with its committed reference
// value through one of these classes; Phase 2 adds classes (NM-44's Γ and factorial). Pure
// TypeScript: no DOM (AR-44).

/**
 * elementary: the operators and elementary functions of NM-43, relative error 1e-13;
 * snapped: the exact values of NM-4, NM-26 and NM-28, exact equality;
 * default: any other function class, relative error 1e-12 (absolute 1e-12 when the reference is 0).
 */
export type ToleranceClass = "elementary" | "snapped" | "default";

const ELEMENTARY_RELATIVE = 1e-13;
const DEFAULT_RELATIVE = 1e-12;
const DEFAULT_ABSOLUTE = 1e-12;

/**
 * Whether `actual` matches the reference `expected` within the class's tolerance (FN-11):
 * elementary |a − e| ≤ 1e-13·|e| (so e = 0 needs a = 0); snapped a === e; default
 * |a − e| ≤ 1e-12·|e|, or |a| ≤ 1e-12 when e = 0. A NaN on either side never matches.
 */
export function withinTolerance(actual: number, expected: number, cls: ToleranceClass): boolean {
  const error = Math.abs(actual - expected);
  switch (cls) {
    case "elementary":
      return error <= ELEMENTARY_RELATIVE * Math.abs(expected);
    case "snapped":
      return actual === expected;
    case "default":
      return expected === 0
        ? error <= DEFAULT_ABSOLUTE
        : error <= DEFAULT_RELATIVE * Math.abs(expected);
  }
}
