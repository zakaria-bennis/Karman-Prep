import { expect, it } from "vitest";
import {
  arctan2,
  circular,
  inverseCircular,
  snapRadians,
  type CircularName,
  type InverseName,
} from "./trig";

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
it("NM-4, FN-18 radian arguments within 4 ulp of kπ/12 are exact degrees, and tan has no value where cos is 0", () => {
  expect([
    snapRadians(P),
    snapRadians(P / 2),
    snapRadians(P + 1e-10),
    snapRadians(2 ** 21 * P),
  ]).toEqual([180, 90, null, null]);
  check([
    ["sin", P, R, 0],
    ["cos", P / 2, R, 0],
    ["tan", P / 4, R, 1],
    ["tan", P / 2, R, NaN],
    ["tan", -P / 2, R, NaN],
    ["tan", (3 * P) / 2, R, NaN],
    ["sin", P + 1e-10, R, Math.sin(P + 1e-10)],
    ["sin", 30, R, Math.sin(30)],
  ]);
});
it("NM-26, FN-18, FN-19 degree arguments reduce exactly modulo 360", () =>
  check([
    ["sin", 30, D, 0.5],
    ["cos", 90, D, 0],
    ["sin", 180, D, 0],
    ["tan", 45, D, 1],
    ["cos", 60, D, 0.5],
    ["sin", 3630, D, 0.5],
    ["tan", 90, D, NaN],
    ["tan", 270, D, NaN],
    ["tan", -90, D, NaN],
    ["tan", -45, D, -1],
    ["tan", 135, D, -1],
    ["sin", -150, D, -0.5],
    ["sin", 60, D, 0.8660254037844386],
    ["tan", 120, D, -1.7320508075688772],
    ["cot", 45, D, 1],
    ["cot", 180, D, NaN],
    ["sec", 90, D, NaN],
    ["csc", -180, D, NaN],
    ["csc", 30, D, 2],
    ["sec", 60, D, 2],
    ["cot", P / 2, R, 0],
    ["cot", 0, R, NaN],
    ["csc", P, R, NaN],
    ["tan", 37, D, Math.tan((37 * P) / 180)],
    ["tan", 127, D, -1 / Math.tan((37 * P) / 180)],
  ]));
it("NM-28, FN-20, FN-21 inverse trig domains, ranges and exact degree multiples of 15", () =>
  check([
    ["arcsin", 0.5, D, 30],
    ["arctan", 1, D, 45],
    ["arccos", -1, D, 180],
    ["arccot", -1, D, 135],
    ["arcsin", 1, D, 90],
    ["arcsec", 2, D, 60],
    ["arcsin", 1, R, P / 2],
    ["arccos", 1, R, 0],
    ["arccos", -1, R, P],
    ["arccot", -1, R, 2.356194490192345],
    ["arccot", 0, R, P / 2],
    ["arcsec", -1, R, P],
    ["arccsc", -1, R, -P / 2],
    ["arccsc", 2, R, Math.asin(0.5)],
    ["arcsec", 2, R, Math.acos(0.5)],
    ["arcsin", 1e-17, D, (1e-17 * 180) / P],
    ["arcsin", 1.0000000000000002, R, NaN],
    ["arccos", -1.5, R, NaN],
    ["arccsc", 0.5, R, NaN],
    ["arcsec", 0, R, NaN],
    ["arccot", 1e300, R, 1 / 1e300],
  ]));
it("FN-22 two-argument arctan returns the angle of (x, y) in (−π, π]", () =>
  expect([
    arctan2(1, -1, R),
    arctan2(1, -1, D),
    arctan2(-0, -1, R),
    arctan2(-1, 0, R),
    arctan2(0, 0, R),
  ]).toEqual([2.356194490192345, 135, P, -P / 2, NaN]));
