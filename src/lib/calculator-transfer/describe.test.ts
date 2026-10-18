import { expect, it } from "vitest";
import { describeChoice, describeMath, describeSystem } from "./describe";

it("TR-50 descriptions are the plain-text form of the math, cut at 60 characters", () => {
  const rows: [string, string][] = [
    ["y=2x+3", "y = 2x + 3"],
    ["y\\le-x+4", "y ≤ -x + 4"],
    ["-2<x\\le5", "-2 < x ≤ 5"],
    ["P(t)=500(1.03)^{t}", "P(t) = 500(1.03)^t"],
    ["(x-2)^2+(y+1)^2=9", "(x - 2)² + (y + 1)² = 9"],
    ["\\frac{1}{2}x", "(1/2)x"],
    ["y=\\frac{x+1}{x-2}", "y = (x + 1)/(x - 2)"],
    ["\\sqrt{50}", "√50"],
    ["\\sqrt{x+4}", "√(x + 4)"],
    ["\\sqrt[3]{x}", "∛x"],
    ["\\left|x-3\\right|", "|x - 3|"],
    ["2\\cdot5\\div x", "2·5÷x"],
    ["A=\\pi r^{2}", "A = πr²"],
    ["x_{1}=2", "x₁ = 2"],
    ["v_{max}", "v_max"],
    ["\\log_{2}x+\\sin x", "log₂ x + sin x"],
    ["\\sin^{-1}x", "sin^(-1) x"],
    ["e^{x}", "e^x"],
    ["2^{10}", "2^10"],
    ["\\alpha+1", "α + 1"],
  ];
  for (const [latex, text] of rows) expect(describeMath(latex), latex).toBe(text);
  expect(describeMath("y=" + "1+".repeat(40) + "1")).toBe(
    ("y = " + "1 + ".repeat(40) + "1").slice(0, 60) + "…"
  );
  expect([
    describeSystem(["equation", "equation"]),
    describeSystem(["inequality", "inequality", "inequality"]),
    describeSystem(["equation", "inequality"]),
    describeChoice("B"),
  ]).toEqual([
    "system of 2 equations",
    "system of 3 inequalities",
    "system of 2 equations and inequalities",
    "choice B",
  ]);
});
