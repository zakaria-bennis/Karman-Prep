// Circular trig and its inverses as Desmos evaluates them (NM-4, NM-26, NM-28; FN-18 to FN-22).
// Number-level functions: NaN means undefined (a pole, a value outside the domain or a
// non-finite result). Every result is returned as `v + 0`, so -0 never leaves this file. Pure
// TypeScript: no DOM (AR-44).

export type CircularName = "sin" | "cos" | "tan" | "csc" | "sec" | "cot";
export type InverseName = "arcsin" | "arccos" | "arctan" | "arccsc" | "arcsec" | "arccot";

/** NM-26: a degree argument is multiplied by this, and an inverse's result divided by it. */
const DEGREE = Math.PI / 180;
const INV_PI = 1 / Math.PI;
/** NM-4: no argument larger than this is a quarter turn. */
const MAX_QUARTER_TURN = 1e12;
const HALF_PI = Math.PI / 2;

/** A finite result with -0 turned into 0; anything else is NaN (undefined). */
function result(v: number): number {
  return Number.isFinite(v) ? v + 0 : NaN;
}

/** NM-4: whether |r| is the double k·π for a whole k, computed in doubles. */
function onWholeTurn(a: number): boolean {
  return a <= MAX_QUARTER_TURN && Math.round(INV_PI * a) * Math.PI === a;
}

/** NM-4: whether |r| is the double k·π/2 for an odd k, as 2|r| = k·π in doubles. */
function onOddQuarter(a: number): boolean {
  if (a > MAX_QUARTER_TURN) return false;
  const k = Math.round(2 * INV_PI * a);
  return k % 2 === 1 && k * Math.PI === 2 * a;
}

/** NM-4: sin of a radian argument, exactly 0 where the argument is a double k·π (Desmos's sin). */
export function exactSin(r: number): number {
  return onWholeTurn(Math.abs(r)) ? 0 : Math.sin(r);
}

/** NM-4: cos of a radian argument, exactly 0 where it is a double (2k + 1)·π/2 (Desmos's cos). */
export function exactCos(r: number): number {
  return onOddQuarter(Math.abs(r)) ? 0 : Math.cos(r);
}

/**
 * NM-4: tan of a radian argument as Desmos computes it: exactly 0 at a double k·π and +Infinity
 * at a double (2k + 1)·π/2, the pole the complex rules divide by.
 */
export function exactTan(r: number): number {
  const a = Math.abs(r);
  return onWholeTurn(a) ? 0 : onOddQuarter(a) ? Infinity : Math.tan(r);
}

/**
 * sin, cos, tan, csc, sec or cot of an angle in the given unit (FN-18, FN-19), as Desmos computes
 * them: a degree argument is first multiplied by π/180 (NM-26), and only quarter turns are exact
 * (NM-4, exactSin, exactCos and exactTan); csc, sec and cot are their reciprocals, so csc and cot
 * are undefined at a whole turn, tan and sec at an odd quarter turn, and cot there is 0.
 * Everything else is the library's value, so `\sin(\frac{\pi}{6})` is 0.49999999999999994 and
 * `\tan(45)` in degrees is 0.9999999999999999, as in Desmos.
 */
export function circular(name: CircularName, x: number, angleMode: "radians" | "degrees"): number {
  const r = angleMode === "degrees" ? x * DEGREE : x;
  switch (name) {
    case "sin":
      return result(exactSin(r));
    case "cos":
      return result(exactCos(r));
    case "tan":
      return result(exactTan(r));
    case "csc":
      return result(1 / exactSin(r));
    case "sec":
      return result(1 / exactCos(r));
    case "cot":
      return result(1 / exactTan(r));
  }
}

/**
 * An inverse circular function, its result in the given unit (FN-20, FN-21, NM-28): the radian
 * result divided by π/180 in degrees, with no rounding, so arcsin 0.5 is 30.000000000000004 degrees
 * as in Desmos. arcsin and arccos are undefined outside [−1, 1]; arccsc(x) = arcsin(1/x) and
 * arcsec(x) = arccos(1/x); arccot is arctan(1/x) for x > 0 and π/2 − arctan(x) otherwise, range
 * (0, π).
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
      return x > 0 ? Math.atan(1 / x) : HALF_PI - Math.atan(x);
  }
}

/**
 * FN-22: arctan(y, x), the angle of the point (x, y) in [−π, π], as Desmos gives it: 0 at the
 * origin, and −π for y = −0 and x < 0.
 */
export function arctan2(y: number, x: number, angleMode: "radians" | "degrees"): number {
  return angleResult(Math.atan2(y, x), angleMode);
}

/** A radian angle in the output unit: divided by π/180 in degrees (NM-28). */
function angleResult(r: number, angleMode: "radians" | "degrees"): number {
  return result(angleMode === "radians" ? r : r / DEGREE);
}
