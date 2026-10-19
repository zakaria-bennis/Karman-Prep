// Circular trig and its inverses with exact angles (NM-4, NM-26, NM-28; FN-18 to FN-22).
// Number-level functions: NaN means undefined (a pole, a value outside the domain or a
// non-finite result). Every result is returned as `v + 0`, so -0 never leaves this file. Pure
// TypeScript: no DOM (AR-44).

import { ulp } from "../eval/real-pow";

export type CircularName = "sin" | "cos" | "tan" | "csc" | "sec" | "cot";
export type InverseName = "arcsin" | "arccos" | "arctan" | "arccsc" | "arcsec" | "arccot";

/** sin of 0°, 15°, …, 90°, each the double nearest the exact value. */
export const SIN_15: readonly number[] = Object.freeze([
  0, 0.25881904510252074, 0.5, 0.7071067811865476, 0.8660254037844386, 0.9659258262890683, 1,
]);
/** tan of 0°, 15°, …, 75°, each the double nearest the exact value (tan 90° has none). */
export const TAN_15: readonly number[] = Object.freeze([
  0, 0.2679491924311227, 0.5773502691896257, 1, 1.7320508075688772, 3.732050807568877,
]);

/** NM-4: radian arguments snap to whole multiples of π/12 with |k| up to this. */
const MAX_SNAP_K = 2 ** 20;
/** NM-4: a radian argument snaps when it is within this many ulp of k·π/12. */
const SNAP_ULPS = 4;
/** NM-28: a degree result snaps to a multiple of 15 within this many ulp of it. */
const DEGREE_RESULT_ULPS = 8;
const HALF_PI = Math.PI / 2;

/** A finite result with -0 turned into 0; anything else is NaN (undefined). */
function result(v: number): number {
  return Number.isFinite(v) ? v + 0 : NaN;
}

/**
 * NM-4: the exact degree value 15k of a radian argument within 4 ulp of k·π/12, where
 * k = round(12x/π) and |k| ≤ 2^20; null when x is not that close to such a multiple.
 */
export function snapRadians(x: number): number | null {
  const k = Math.round((12 * x) / Math.PI);
  if (!(Math.abs(k) <= MAX_SNAP_K)) return null;
  const multiple = (k * Math.PI) / 12;
  return Math.abs(x - multiple) <= SNAP_ULPS * ulp(multiple) ? 15 * k + 0 : null;
}

/**
 * sin, cos, tan, csc, sec or cot of an angle in the given unit (FN-18, FN-19). A radian argument
 * that snapRadians places on a multiple of 15° takes the exact degree path (NM-4); csc, sec and
 * cot are undefined where their denominator is exactly 0.
 */
export function circular(name: CircularName, x: number, angleMode: "radians" | "degrees"): number {
  if (angleMode === "degrees") return circularDegrees(name, x);
  const degrees = snapRadians(x);
  if (degrees !== null) return circularDegrees(name, degrees);
  switch (name) {
    case "sin":
      return result(Math.sin(x));
    case "cos":
      return result(Math.cos(x));
    case "tan":
      return result(Math.tan(x));
    case "csc":
      return reciprocal(1, Math.sin(x));
    case "sec":
      return reciprocal(1, Math.cos(x));
    case "cot":
      return reciprocal(Math.cos(x), Math.sin(x));
  }
}

/** top / bottom, undefined when the denominator is exactly 0 (FN-19). */
function reciprocal(top: number, bottom: number): number {
  return bottom === 0 ? NaN : result(top / bottom);
}

/**
 * NM-26: the argument is reduced exactly modulo 360 into (−180, 180], then written 90q + s with
 * s in [−45, 45] (both steps exact for doubles). A multiple of 15 reads S = sin s, C = cos s and
 * tan s from the tables, so multiples of 90 give exactly 0 or ±1, of 30 exactly ±0.5 and of 45
 * exactly ±1 for tan and cot; other angles use Math on s·π/180. The quadrant q mod 4 rotates
 * them: sin = [S, C, −S, −C], cos = [C, −S, −C, S], tan = T(s) for even q and −1/T(s) for odd q.
 */
function circularDegrees(name: CircularName, d: number): number {
  if (!Number.isFinite(d)) return NaN;
  let r = d % 360; // fmod is exact
  if (r > 180) r -= 360;
  else if (r <= -180) r += 360;
  const q = Math.round(r / 90);
  const s = r - 90 * q; // exact, in [−45, 45]
  const quadrant = ((q % 4) + 4) % 4;
  const tableIndex = s % 15 === 0 ? Math.abs(s) / 15 : -1;
  if (name === "tan") return result(tanDegrees(s, quadrant % 2 === 1, tableIndex));
  const radians = (s * Math.PI) / 180;
  const sinS = tableIndex >= 0 ? Math.sign(s) * SIN_15[tableIndex] : Math.sin(radians);
  const cosS = tableIndex >= 0 ? SIN_15[6 - tableIndex] : Math.cos(radians);
  const sin = quadrant === 0 ? sinS : quadrant === 1 ? cosS : quadrant === 2 ? -sinS : -cosS;
  const cos = quadrant === 0 ? cosS : quadrant === 1 ? -sinS : quadrant === 2 ? -cosS : sinS;
  switch (name) {
    case "sin":
      return result(sin);
    case "cos":
      return result(cos);
    case "csc":
      return reciprocal(1, sin);
    case "sec":
      return reciprocal(1, cos);
    case "cot":
      return reciprocal(cos, sin);
  }
}

/**
 * tan(90q + s): T(s) for even q, and −1/T(s) for odd q, undefined at s = 0 (where cos is exactly
 * 0). For a multiple of 15, T(s) = sign(s)·TAN_15[j] and −1/T(s) = −sign(s)·TAN_15[6 − j].
 */
function tanDegrees(s: number, oddQuadrant: boolean, tableIndex: number): number {
  if (oddQuadrant && s === 0) return NaN;
  if (tableIndex >= 0) {
    return oddQuadrant ? -Math.sign(s) * TAN_15[6 - tableIndex] : Math.sign(s) * TAN_15[tableIndex];
  }
  const t = Math.tan((s * Math.PI) / 180);
  return oddQuadrant ? -1 / t : t;
}

/**
 * An inverse circular function, its result in the given unit (FN-20, FN-21, NM-28). arcsin and
 * arccos are undefined outside [−1, 1]; arccsc(x) = arcsin(1/x) and arcsec(x) = arccos(1/x);
 * arccot = π/2 − arctan with range (0, π), computed through arctan(1/x) so it stays accurate for
 * large |x|.
 */
export function inverseCircular(
  name: InverseName,
  x: number,
  angleMode: "radians" | "degrees"
): number {
  return angleResult(inverseRadians(name, x), angleMode);
}

function inverseRadians(name: InverseName, x: number): number {
  switch (name) {
    case "arcsin":
      return Math.asin(x);
    case "arccos":
      return Math.acos(x);
    case "arctan":
      return Math.atan(x);
    case "arccsc":
      return Math.asin(1 / x);
    case "arcsec":
      return Math.acos(1 / x);
    case "arccot":
      if (x === 0) return HALF_PI;
      return x > 0 ? Math.atan(1 / x) : Math.PI + Math.atan(1 / x);
  }
}

/**
 * FN-22: arctan(y, x), the angle of the point (x, y) in (−π, π] (an Arg of −π, from y = −0 and
 * x < 0, is π); undefined at the origin.
 */
export function arctan2(y: number, x: number, angleMode: "radians" | "degrees"): number {
  if (y === 0 && x === 0) return NaN;
  const angle = Math.atan2(y, x);
  return angleResult(angle === -Math.PI ? Math.PI : angle, angleMode);
}

/**
 * A radian angle in the output unit. In degrees, v = r·180/π snaps to the nearest multiple of 15
 * when it is within 8 ulp of it (NM-28), so arcsin 0.5 is exactly 30.
 */
function angleResult(r: number, angleMode: "radians" | "degrees"): number {
  if (angleMode === "radians") return result(r);
  const v = (r * 180) / Math.PI;
  const m = 15 * Math.round(v / 15);
  return result(Math.abs(v - m) <= DEGREE_RESULT_ULPS * ulp(m) ? m : v);
}
