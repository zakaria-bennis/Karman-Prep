import { describe, expect, it } from "vitest";
import { parseSerializedFunctionLines } from "./serialized-function-math";

describe("supported serialized exponential function lines", () => {
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
