// MATHS-CORE-1: exact fractions through names, calls and the rational built-ins, each expectation
// what live Desmos showed for the same rows (2026-10-25).
import { expect, it } from "vitest";
import { evaluateLatex } from "./compile";

const value = (latex: string, rows: string[] = []) => {
  const v = evaluateLatex(latex, { rows });
  return v.type === "number" ? v.value : NaN;
};

it("MATHS-CORE-1 exact through user functions, names and lists", () => {
  expect(value("f(0.1)", ["f(x)=x+0.2-0.3"])).toBe(0);
  expect(value("a+0.2-0.3", ["a=0.1"])).toBe(0);
  expect(value("f(0.1,0.2)", ["f(x,y)=x+y-0.3"])).toBe(0);
  expect(value("g(-\\frac{11}{5})", ["g(p)=25p^{15}-121p^{13}"])).toBe(0);
  expect(value("180000f(2)-180000\\cdot1.023^2", ["f(x)=1.023^x"])).toBe(0);
  expect(
    value("f\\left(\\frac{5}{3}\\right)", ["f(x)=\\frac{x}{(x-1)(x+1)}-\\frac{25}{16x}"])
  ).toBe(0);
  expect(value("\\operatorname{mean}\\left(\\left[0.1,0.2\\right]\\right)+0.15-0.3")).toBe(0);
  expect(value("30\\%\\operatorname{of}0.1+0.27-0.3")).toBe(0);
});

it("MATHS-CORE-1 rational roots, whole-number doubles and decimal literals are exact", () => {
  expect(value("\\sqrt{0.01}+0.2-0.3")).toBe(0);
  expect(value("\\sin(0)+0.1+0.2-0.3")).toBe(0);
  expect(value("\\sqrt{2}\\cdot0+0.1+0.2-0.3")).toBe(0);
  expect(value("1+10^{-15}-1")).toBe(1e-15);
  expect(value("\\frac{1}{3}-0.333333333333333")).toBe(1 / 3e15);
});

it("MATHS-CORE-1 anything else stays a double: no cancellation is rounded away", () => {
  expect(value("\\sqrt{2}+2^{-52}-\\sqrt{2}")).toBe(2 ** -52);
  expect(value("\\sqrt{3}\\cdot\\sqrt{3}-3")).toBe(Math.sqrt(3) * Math.sqrt(3) - 3);
  expect(value("\\max(0.1,0.05)+0.2-0.3")).toBe(0.1 + 0.2 - 0.3);
  expect(value("10^{-16}")).toBe(1e-16);
  // parts past 2^53 − 1 fall back to doubles
  expect(value("2.5\\cdot10^{-30}+0.1+0.2-0.3")).toBe(2.5e-30 + 0.1 + 0.2 - 0.3);
});
