import { expect, it } from "vitest";
import { applyBuiltin, BUILTINS } from "./builtins";
import { numberValue, UNDEFINED } from "../eval/values";
import { formatValue } from "../eval/format";
import { OPERATOR_NAMES, SHIPPED } from "../latex/operator-names";
import { LIST_FUNCTION_NAMES } from "./statistics";

const P = Math.PI;
const n = numberValue;

const f = (name: string, args: number[], u: "radians" | "degrees" = "radians", cx = false) =>
  applyBuiltin(name, args.map(n), u, cx);
it("FN-60 exp, ln, log and log base b on their domains", () => {
  expect([f("exp", [1]), f("ln", [Math.E]), f("log", [1000]), f("log", [8, 2])]).toEqual([
    n(Math.E),
    n(1),
    n(3),
    n(3),
  ]);
  for (const a of [[0], [-2], [8, 1], [8, 0], [8, -2], [-8, 2]])
    expect(f("log", a), String(a)).toEqual(UNDEFINED);
  expect(f("ln", [-1], "radians", true)).toEqual({ type: "complex", value: { re: 0, im: P } });
});
it("FN-6, NM-25 only circular-trig inputs and inverse-trig outputs depend on the angle unit", () => {
  const circular = ["sin", "cos", "tan", "csc", "sec", "cot"];
  for (const [name, fn] of BUILTINS) {
    const x = [name === "arcsec" || name === "arccsc" ? 2 : 0.5];
    expect(fn.angle, name).toBe(
      circular.includes(name)
        ? "input"
        : circular.map((c) => `arc${c}`).includes(name)
          ? "output"
          : "none"
    );
    expect(JSON.stringify(f(name, x)) === JSON.stringify(f(name, x, "degrees")), name).toBe(
      fn.angle === "none"
    );
  }
  expect([
    f("sin", [30], "degrees"),
    f("arctan", [1, -1], "degrees"),
    f("exp", [P], "degrees"),
  ]).toEqual([n(0.5), n(135), n(Math.exp(P))]);
  expect(
    applyBuiltin("sin", [{ type: "complex", value: { re: 0, im: 1 } }], "degrees", true)
  ).toEqual({
    type: "complex",
    value: { re: 0, im: Math.sinh(1) },
  });
});
it("FN-4 every built-in returns undefined outside its domain, shows undefined and never throws", () => {
  const outside: [string, number[]][] = [
    ["tan", [P / 2]],
    ["csc", [0]],
    ["sec", [P / 2]],
    ["cot", [0]],
    ["arcsin", [2]],
    ["arccos", [-2]],
    ["arccsc", [0.5]],
    ["arcsec", [0.5]],
    ["arctan", [0, 0]],
    ["exp", [1000]],
    ["ln", [0]],
    ["log", [-1]],
    ["log", [5, 1]],
    ["sin", [1, 2]],
  ];
  for (const [name, args] of outside)
    expect([f(name, args), formatValue(f(name, args))], name).toEqual([UNDEFINED, "undefined"]);
  for (const name of BUILTINS.keys())
    expect(applyBuiltin(name, [UNDEFINED], "radians", false), name).toEqual(UNDEFINED);
  expect(applyBuiltin("sin", [{ type: "point", value: [1, 2] }], "radians", false)).toEqual(
    UNDEFINED
  );
});
it("FN-1 every shipped built-in function has a rule, and no unshipped one does", () => {
  const functions = OPERATOR_NAMES.filter((o) => o.category !== null).map((o) => o.name);
  for (const name of functions) {
    // a scalar rule in BUILTINS or a list rule in statistics.ts, never both
    const rules = Number(BUILTINS.has(name)) + Number(LIST_FUNCTION_NAMES.includes(name));
    expect(rules, name).toBe(SHIPPED.has(name) ? 1 : 0);
  }
  expect(LIST_FUNCTION_NAMES.every((name) => SHIPPED.has(name))).toBe(true);
});
