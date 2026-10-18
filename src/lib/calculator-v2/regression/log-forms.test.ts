import { expect, it } from "vitest";
import { parseLatex } from "../core/latex/index";
import { matchLogForm } from "./log-forms";

const match = (latex: string, params: string[], predictor = "x_{1}") => {
  const parsed = parseLatex(latex);
  if (!parsed.ok) throw new Error(`${latex}: ${parsed.error.code}`);
  return matchLogForm(parsed.tree, params, predictor);
};

it("D-27 each log form is matched structurally, in any factor order", () => {
  expect(match("ab^{x_{1}}", ["a", "b"])).toEqual({ kind: "exponential-base", a: 0, b: 1 });
  expect(match("a\\cdot b^{x_{1}}", ["a", "b"])).toEqual({ kind: "exponential-base", a: 0, b: 1 });
  expect(match("b^{x_{1}}a", ["b", "a"])).toEqual({ kind: "exponential-base", a: 1, b: 0 });
  expect(match("ae^{bx_{1}}", ["a", "b"])).toEqual({ kind: "exponential-e", a: 0, b: 1 });
  expect(match("a\\exp\\left(bx_{1}\\right)", ["a", "b"])).toEqual({
    kind: "exponential-e",
    a: 0,
    b: 1,
  });
  expect(match("a\\cdot2^{bx_{1}}", ["a", "b"])).toEqual({
    kind: "exponential-ac",
    c: 2,
    a: 0,
    b: 1,
  });
  expect(match("3^{mx_{1}+k}", ["m", "k"])).toEqual({ kind: "exponential-c", c: 3, m: 0, k: 1 });
  expect(match("ax_{1}^{b}", ["a", "b"])).toEqual({ kind: "power", a: 0, b: 1 });
  expect(match("a+b\\ln x_{1}", ["a", "b"])).toEqual({ kind: "logarithmic", a: 0, b: 1 });
  expect(match("b\\ln\\left(x_{1}\\right)+a", ["b", "a"])).toEqual({
    kind: "logarithmic",
    a: 1,
    b: 0,
  });
});

it("D-27 other models have no log form", () => {
  expect(match("ab^{x_{1}}+c", ["a", "b", "c"])).toBeNull();
  expect(match("a+bx_{1}", ["a", "b"])).toBeNull();
  expect(match("ab^{x_{2}}", ["a", "b"])).toBeNull(); // not the predictor
  expect(match("a\\cdot1^{bx_{1}}", ["a", "b"])).toBeNull(); // base 1
  expect(match("aa^{x_{1}}", ["a"])).toBeNull();
});
