import { expect, it } from "vitest";
import { applyBuiltin } from "./builtins";
import { factorialOf, gamma, reciprocalGamma } from "./gamma";
import { mod, nCr, nPr, roundTo } from "./number-theory";
import { withinTolerance } from "./tolerance";
import { evaluateLatex } from "../eval/compile";
import { complexValue, numberValue, UNDEFINED } from "../eval/values";

const n = numberValue;
const f = (name: string, args: number[]) => applyBuiltin(name, args.map(n), "radians", false);

it("FN-77 floor, ceil and sign are the usual integer functions, with no -0", () => {
  expect([f("floor", [-2.5]), f("floor", [2.999]), f("ceil", [2.1]), f("ceil", [-2.9])]).toEqual([
    n(-3),
    n(2),
    n(3),
    n(-2),
  ]);
  expect([f("sign", [-3]), f("sign", [0]), f("sign", [0.001])]).toEqual([n(-1), n(0), n(1)]);
  expect(Object.is(roundTo(-0.4), 0)).toBe(true);
  expect(
    [f("ceil", [-0.5]), f("sign", [-0])].map((v) => v.type === "number" && Object.is(v.value, -0))
  ).toEqual([false, false]);
});

it("FN-77 round uses Math.round (halves toward +∞) and rounds n to whole digits, negative allowed", () => {
  expect([roundTo(2.5), roundTo(-2.5), roundTo(-3.5), roundTo(0.49999999999999994)]).toEqual([
    3, -2, -3, 0,
  ]);
  expect([
    roundTo(3.14159, 2),
    roundTo(-3.14159, 2),
    roundTo(1234, -2),
    roundTo(2.5, -1),
    roundTo(2.5, 1.5),
    roundTo(1.005, 2), // Math.round(100.49999…) / 100, as in Desmos
    roundTo(0.1, 400),
    roundTo(1e300, -400),
    roundTo(1e20, 5),
  ]).toEqual([3.14, -3.14, 1200, 0, 2.5, 1, 0.1, 0, 1e20]);
  expect([f("round", [2.5]), f("round", [2.567, 1]), f("round", [1, 2, 3])]).toEqual([
    n(3),
    n(2.6),
    UNDEFINED,
  ]);
});

it("FN-76 mod takes the sign of the divisor and mod(a, 0) is undefined", () => {
  expect([mod(-7, 3), mod(7, -3), mod(5.5, 2), mod(-1, 3), mod(6, 3), mod(-6, 3)]).toEqual([
    2, -2, 1.5, 2, 0, 0,
  ]);
  expect(Object.is(mod(-6, 3), 0)).toBe(true);
  expect([f("mod", [5, 0]), f("mod", [5])]).toEqual([UNDEFINED, UNDEFINED]);
});

it("FN-78 nCr and nPr are exact for whole arguments and follow Γ elsewhere", () => {
  expect([nCr(52, 5), nCr(5, 2), nCr(5, 0), nCr(5, 5), nCr(2, 5), nCr(5, -1)]).toEqual([
    2598960, 10, 1, 1, 0, 0,
  ]);
  expect([nCr(-1, 2), nCr(-2, 3), nCr(1000, 1), nCr(50, 25)]).toEqual([
    1, -4, 1000, 126410606437752,
  ]);
  expect([nPr(5, 2), nPr(5, 6), nPr(10, 0), nPr(-1, 3)]).toEqual([20, 0, 1, -6]);
  const close = (a: number, e: number) => withinTolerance(a, e, "default");
  expect([
    close(nCr(5.5, 2), 12.375),
    close(nCr(5, 2.5), 10.864977448406723),
    close(nCr(0.5, 0.5), 1),
    close(nPr(5, -1), 1 / 6),
    close(nPr(4.5, 1.5), gamma(5.5) / gamma(4)),
  ]).toEqual([true, true, true, true, true]);
  expect([nCr(-1, 0.5), f("nCr", [1e6, 5e5])]).toEqual([NaN, UNDEFINED]);
});

it("FN-79 Γ reads correctly rounded factorials at whole numbers and is undefined at its poles", () => {
  expect([factorialOf(0), factorialOf(5), factorialOf(22), factorialOf(170)]).toEqual([
    1, 120, 1124000727777607680000, 7.257415615307999e306,
  ]);
  expect([gamma(0), gamma(-1), gamma(-2), gamma(172), gamma(180.5)]).toEqual([
    NaN,
    NaN,
    NaN,
    NaN,
    NaN,
  ]);
  expect([reciprocalGamma(0), reciprocalGamma(-3), reciprocalGamma(1)]).toEqual([0, 0, 1]);
  const halfIntegers: [number, number][] = [
    [0.5, Math.sqrt(Math.PI)],
    [1.5, Math.sqrt(Math.PI) / 2],
    [3.5, (15 / 8) * Math.sqrt(Math.PI)],
    [-0.5, -2 * Math.sqrt(Math.PI)],
    [-1.5, (4 / 3) * Math.sqrt(Math.PI)],
  ];
  for (const [x, e] of halfIntegers)
    expect(withinTolerance(gamma(x), e, "gamma"), String(x)).toBe(true);
});

it("FN-4 abs is the absolute value, and the modulus of a complex number", () => {
  expect([f("abs", [-3]), f("abs", [0])]).toEqual([n(3), n(0)]);
  expect(applyBuiltin("abs", [complexValue(3, 4)], "radians", true)).toEqual(n(5));
  for (const name of ["floor", "ceil", "round", "sign"])
    expect(applyBuiltin(name, [complexValue(1, 1)], "radians", true), name).toEqual(UNDEFINED);
  expect(evaluateLatex("\\operatorname{abs}(-2)+\\operatorname{floor}(2.5)")).toEqual(n(4));
});
