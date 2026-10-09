import { describe, expect, it } from "vitest";
import { parseSerializedFunctionLines } from "./serialized-function-math";

describe("reviewed Next22 radical and rational notation", () => {
  it("retains the exact US Q06 radical scope without evaluating its square", () => {
    expect(
      parseSerializedFunctionLines("√(x²) = 24 − 5x\nWhat is the solution to the given equation?")
    ).toEqual([
      { kind: "inline", sourceFunction: true, latex: String.raw`\sqrt{x^{2}} = 24 - 5x` },
      { kind: "text", value: "\nWhat is the solution to the given equation?" },
    ]);
  });
  it("stacks the exact Asia Q05 coefficient and retains all prose and sum scope", () => {
    const before = "5. The function f is defined by ";
    const after = ". What is the value of f(3)?";
    expect(parseSerializedFunctionLines(before + "f(x) = (1/2)(x + 11)" + after)).toEqual([
      { kind: "text", value: before },
      { kind: "inline", sourceFunction: true, latex: String.raw`f(x) = \dfrac{1}{2}(x + 11)` },
      { kind: "text", value: after },
    ]);
  });
  it.each([
    "√(x²) = 24 − 5y",
    "√(x² + 1) = 24 − 5x",
    "√(x²) = 24 − 5x + 1",
    "Explain √(x²) = 24 − 5x.",
    "√(x²) = 24 − 5x²",
    "f(x) = (1/2)(x + 11)",
    "The function g is defined by f(x) = (1/2)(x + 11).",
    "The function f is defined by f(x) = (1/2)(y + 11).",
    "The function f is defined by f(x) = (1/0)(x + 11).",
    "The function f is defined by f(x) = (1/2)(x + 11) + 1.",
    "The function f is defined by f(x) = (1/2)(x + 11),",
    "The function f is defined by f(x) = (1/2)(x + 11).5",
  ])("does not infer unsupported or incomplete notation: %s", (text) => {
    expect(parseSerializedFunctionLines(text)).toEqual([{ kind: "text", value: text }]);
  });
  it.each([{ atLineStart: false }, { atLineEnd: false }])(
    "does not reinterpret a radical line split by source formatting: %j",
    (boundaries) => {
      const text = "√(x²) = 24 − 5x";
      expect(parseSerializedFunctionLines(text, boundaries)).toEqual([
        { kind: "text", value: text },
      ]);
    }
  );
});

describe("supported serialized exponential function lines", () => {
  it("renders the exact December Q13 inline equation while preserving its prose", () => {
    const before =
      "The table shows three values of x and their corresponding values of y for the equation ";
    const after = ". In the table, a is a constant. What is the value of a?";
    expect(parseSerializedFunctionLines(before + "y = 5(2)^x + 9" + after)).toEqual([
      { kind: "text", value: before },
      { kind: "inline", sourceFunction: true, latex: "y = 5(2)^{x} + 9" },
      { kind: "text", value: after },
    ]);
  });
  it.each([
    "y = 5(2)^x + 9",
    "equation y = 5(2)^x + 9,",
    "equation y = 5(2)^(x+1) + 9.",
    "equation y = 5(2)^xy + 9.",
    "equation y = 5(2)^x + 9 + 1.",
    "equation y = 5(-2)^x + 9.",
    "equation y = 5(0)^x + 9.",
    "equation y = 5(2)^x + 9.5x.",
  ])("does not guess unsupported inline equation syntax: %s", (text) => {
    expect(parseSerializedFunctionLines(text)).toEqual([{ kind: "text", value: text }]);
  });
  it("preserves the Unicode-negative coefficient and fractional exponent from March Q14", () => {
    expect(parseSerializedFunctionLines("f(x) = −26(2)^(x/6)\n\nWhich table?")).toEqual([
      { kind: "inline", sourceFunction: true, latex: String.raw`f(x) = -26(2)^{\frac{x}{6}}` },
      { kind: "text", value: "\n\nWhich table?" },
    ]);
  });
  it("preserves symbolic exponent scope and all surrounding March Q18 prose", () => {
    expect(
      parseSerializedFunctionLines(
        "The graph is shown, where f(x) = ab^x + c, and a, b, and c are constants."
      )
    ).toEqual([
      { kind: "text", value: "The graph is shown, where " },
      { kind: "inline", sourceFunction: true, latex: "f(x) = ab^{x} + c" },
      { kind: "text", value: ", and a, b, and c are constants." },
    ]);
  });
  it.each([1, 3, 4, 5])("preserves unary-minus precedence and choice constant %s", (constant) => {
    expect(parseSerializedFunctionLines(`f(x) = −3^x + ${constant}`)).toEqual([
      { kind: "inline", sourceFunction: true, latex: `f(x) = -3^{x} + ${constant}` },
    ]);
  });
  it.each([
    "f(x) = (-3)^x + 1",
    "f(x) = −3^(x+1) + 1",
    "f(x) = −3^y + 1",
    "f(x) = −0^x + 1",
    "f(x) = −3^x + 1 + 2",
    "Explain f(x) = −3^x + 1.",
    "where f(x) = ab^x + c",
    "where f(x) = ab^(x+c),",
    "where f(x) = ab^x + c + d,",
  ])("keeps ambiguous or unsupported exponent syntax literal: %s", (text) => {
    expect(parseSerializedFunctionLines(text)).toEqual([{ kind: "text", value: text }]);
  });
  it.each(["f(x) = −26(2)^(x/6)", "f(x) = −3^x + 1"])(
    "rejects partial function chunks: %s",
    (text) => {
      expect(parseSerializedFunctionLines(text, { atLineStart: false })).toEqual([
        { kind: "text", value: text },
      ]);
      expect(parseSerializedFunctionLines(text, { atLineEnd: false })).toEqual([
        { kind: "text", value: text },
      ]);
    }
  );
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
