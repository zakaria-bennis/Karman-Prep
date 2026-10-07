import { describe, expect, it } from "vitest";
import { parseSerializedFunctionLines } from "./serialized-function-math";

describe("supported serialized exponential function lines", () => {
  it("preserves the approved Q16 coefficient, base and fractional exponent", () => {
    expect(parseSerializedFunctionLines("f(x) = 24(2)^(x/6)\n\nWhich table?")).toEqual([
      { kind: "inline", sourceFunction: true, latex: String.raw`f(x) = 24(2)^{\frac{x}{6}}` },
      { kind: "text", value: "\n\nWhich table?" },
    ]);
  });
  it("retains decimal coefficients and a different matching variable without evaluating", () => {
    expect(parseSerializedFunctionLines("g(t)=1.5(3)^(t/10)")).toEqual([
      { kind: "inline", sourceFunction: true, latex: String.raw`g(t) = 1.5(3)^{\frac{t}{10}}` },
    ]);
  });
  it.each([
    "Explain f(x) = 24(2)^(x/6).",
    "f(x) = 24(2)^(y/6)",
    "f(x) = 24(2)^(x/0)",
    "f(x) = 24(2)^(x/(1+5))",
    "f(x) = 24(0)^(x/6)",
    "x^2",
    "bare \\frac{x}{6}",
  ])("leaves unsupported notation and prose literal: %s", (text) => {
    expect(parseSerializedFunctionLines(text)).toEqual([{ kind: "text", value: text }]);
  });
});
