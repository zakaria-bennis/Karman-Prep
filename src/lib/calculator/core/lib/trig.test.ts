import { expect, it } from "vitest";
import { arctan2, circular, inverseCircular, type CircularName, type InverseName } from "./trig";

const P = Math.PI;

type Row = [CircularName | InverseName, number, "radians" | "degrees", number];
const R = "radians",
  D = "degrees";
const check = (rows: Row[]) => {
  for (const [f, x, u, v] of rows)
    expect(
      f.startsWith("arc")
        ? inverseCircular(f as InverseName, x, u)
        : circular(f as CircularName, x, u),
      `${f}(${x}) ${u}`
    ).toBe(v);
};
// Desmos values, captured live 2026-10-19 (desmos-trig.fixture.json).
it("NM-4, FN-18 only quarter turns are exact in radians, as in Desmos", () =>
  check([
    ["sin", P, R, 0],
    ["sin", 2 * P, R, 0],
    ["sin", -P, R, 0],
    ["cos", P / 2, R, 0],
    ["cos", (3 * P) / 2, R, 0],
    ["tan", P, R, 0],
    ["tan", P / 2, R, NaN],
    ["tan", -P / 2, R, NaN],
    ["tan", (3 * P) / 2, R, NaN],
    ["csc", P, R, NaN],
    ["sec", P / 2, R, NaN],
    ["cot", P / 2, R, 0],
    ["cot", 0, R, NaN],
    ["cot", 1e-320, R, NaN],
    ["sin", P / 6, R, 0.49999999999999994],
    ["tan", P / 4, R, 0.9999999999999999],
    ["cos", P / 3, R, 0.5000000000000001],
    ["csc", P / 6, R, 2.0000000000000004],
    ["cot", P / 4, R, 1.0000000000000002],
    ["sin", P + 1e-10, R, Math.sin(P + 1e-10)],
    ["sin", 1e20, R, -0.6452512852657808],
    ["cot", 1e20, R, -1.1839889697035577],
  ]));
it("NM-26, FN-18, FN-19 degree arguments are multiplied by π/180, as in Desmos", () =>
  check([
    ["sin", 30, D, 0.49999999999999994],
    ["cos", 60, D, 0.5000000000000001],
    ["tan", 45, D, 0.9999999999999999],
    ["sin", 90, D, 1],
    ["sin", -90, D, -1],
    ["cos", 90, D, 0],
    ["cos", 270, D, 0],
    ["sin", 180, D, 0],
    ["sin", 360, D, 0],
    ["tan", 90, D, NaN],
    ["tan", 270, D, NaN],
    ["cot", 270, D, 0],
    ["sec", 270, D, NaN],
    ["csc", 360, D, NaN],
    ["sin", 3630, D, 0.5000000000000004],
    ["sin", 1e20, D, 0.3061086320328143],
    ["sec", 60, D, 1.9999999999999996],
  ]));
it("NM-28, FN-20, FN-21 inverse trig domains and ranges, degree results unrounded", () =>
  check([
    ["arcsin", 0.5, D, 30.000000000000004],
    ["arccos", 0.5, D, 60.00000000000001],
    ["arctan", 1, D, 45],
    ["arccos", -1, D, 180],
    ["arccot", -1, D, 135],
    ["arcsin", 1, D, 90],
    ["arcsec", 2, D, 60.00000000000001],
    ["arcsin", 1, R, P / 2],
    ["arccos", 1, R, 0],
    ["arccos", -1, R, P],
    ["arccot", -1, R, 2.356194490192345],
    ["arccot", -2, R, 2.677945044588987],
    ["arccot", 0, R, P / 2],
    ["arccot", -0, R, P / 2],
    ["arcsec", -1, R, P],
    ["arccsc", -1, R, -P / 2],
    ["arccsc", 2, R, Math.asin(0.5)],
    ["arcsec", 2, R, Math.acos(0.5)],
    ["arcsin", 1.0000000000000002, R, NaN],
    ["arccos", -1.5, R, NaN],
    ["arccsc", 0.5, R, NaN],
    ["arcsec", 0, R, NaN],
    ["arccot", 1e300, R, 1 / 1e300],
  ]));
it("FN-22 two-argument arctan returns the angle of (x, y) in [−π, π], as in Desmos", () =>
  expect([
    arctan2(1, -1, R),
    arctan2(1, -1, D),
    arctan2(-0, -1, R),
    arctan2(-1, 0, R),
    arctan2(0, 0, R),
    arctan2(-1, -1, D),
  ]).toEqual([2.356194490192345, 135, -P, -P / 2, 0, -135]));
