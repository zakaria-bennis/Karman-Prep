import { expect, it } from "vitest";
import { applyBuiltin, BUILTINS } from "./builtins";
import { withinTolerance } from "./tolerance";
import { evaluateLatex } from "../eval/compile";
import { complexValue, numberValue, UNDEFINED, type Complex, type Value } from "../eval/values";

/** Undefined, or ±∞, which Desmos keeps as a value and shows as undefined (2026-10-20). */
const shownUndefined = (v: Value) =>
  v.type === "undefined" || (v.type === "number" && !Number.isFinite(v.value));

const n = numberValue;
const NAMES = ["sinh", "cosh", "tanh", "csch", "sech", "coth"];
const INVERSES = NAMES.map((name) => `arc${name}`);
const real = (name: string, x: number, complex = false) =>
  applyBuiltin(name, [n(x)], "radians", complex);
const cx = (name: string, z: Complex) =>
  applyBuiltin(name, [complexValue(z.re, z.im)], "radians", true);
const near = (v: Value, re: number, im = 0) =>
  (v.type === "number" && im === 0 && withinTolerance(v.value, re, "default")) ||
  (v.type === "complex" &&
    withinTolerance(v.value.re, re, "default") &&
    withinTolerance(v.value.im, im, "default"));

it("FN-68 Desmos values: sinh(1) and arccosh(0.5), which is undefined in real mode", () => {
  expect(evaluateLatex("\\sinh(1)")).toEqual(n(1.1752011936438014));
  expect([
    evaluateLatex("\\operatorname{arccosh}(0.5)"),
    near(
      evaluateLatex("\\operatorname{arccosh}(0.5)", { settings: { complex: true } }),
      0,
      Math.PI / 3
    ),
  ]).toEqual([UNDEFINED, true]);
  expect(evaluateLatex("\\sinh^{-1}(1)")).toEqual(evaluateLatex("\\operatorname{arcsinh}(1)"));
});

it("FN-68 the six functions and their typed inverses on their real domains, independent of the angle unit", () => {
  for (const name of [...NAMES, ...INVERSES]) {
    const fn = BUILTINS.get(name);
    expect([fn?.angle, fn?.arity], name).toEqual(["none", [1]]);
    expect(applyBuiltin(name, [n(0.7)], "degrees", false), name).toEqual(real(name, 0.7));
  }
  expect([real("sinh", 0), real("cosh", 0), real("tanh", 0), real("sech", 0)]).toEqual([
    n(0),
    n(1),
    n(0),
    n(1),
  ]);
  expect(
    [
      near(real("csch", 1), 1 / Math.sinh(1)),
      near(real("coth", 2), 1 / Math.tanh(2)),
      near(real("arccsch", 2), Math.asinh(0.5)),
      near(real("arcsech", 0.5), Math.acosh(2)),
      near(real("arccoth", 2), Math.atanh(0.5)),
      near(real("arccosh", 1), 0),
    ].every(Boolean)
  ).toBe(true);
  const outside: [string, number][] = [
    ["csch", 0],
    ["coth", 0],
    ["arccosh", 0.5],
    ["arctanh", 1],
    ["arctanh", -2],
    ["arccsch", 0],
    ["arcsech", 0],
    ["arcsech", 1.5],
    ["arcsech", -0.5],
    ["arccoth", 0.5],
    ["arccoth", 1],
    ["sinh", 1000],
  ];
  for (const [name, x] of outside)
    expect(shownUndefined(real(name, x)), `${name}(${x})`).toBe(true);
});

it("FN-68, NM-19 arccosh, arctanh, arcsech and arccoth extend to complex values on Desmos's branches", () => {
  expect([
    near(real("arccosh", 0.5, true), 0, Math.PI / 3),
    near(real("arccosh", -2, true), Math.acosh(2), Math.PI),
    near(real("arctanh", 2, true), Math.atanh(0.5), -Math.PI / 2),
    near(real("arctanh", -2, true), -Math.atanh(0.5), Math.PI / 2),
    near(real("arcsech", 2, true), 0, Math.PI / 3),
    near(real("arccoth", 0.5, true), Math.atanh(0.5), Math.PI / 2),
  ]).toEqual([true, true, true, true, true, true]);
  expect([real("arccsch", 0, true), real("csch", 0, true)].map(shownUndefined)).toEqual([
    true,
    true,
  ]);
});

it("FN-68, NM-18 complex arguments: identities hold and each inverse undoes its function", () => {
  const z = { re: 0.3, im: 0.4 };
  expect([
    near(cx("sinh", { re: 0, im: 1 }), 0, Math.sin(1)),
    near(cx("cosh", { re: 0, im: 1 }), Math.cos(1)),
    near(cx("tanh", { re: 0, im: 1 }), 0, Math.tan(1)),
  ]).toEqual([true, true, true]);
  for (const name of NAMES) {
    const w = cx(name, z);
    if (w.type !== "complex") throw new Error(`${name} gave ${w.type}`);
    expect(near(cx(`arc${name}`, w.value), z.re, z.im), name).toBe(true);
  }
});
