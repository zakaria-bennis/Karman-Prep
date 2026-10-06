import { describe, expect, it } from "vitest";
import { numericDesmosCell, unwrapMath, validatedDesmosMath } from "./desmos-math";

describe("exact numeric table parsing", () => {
  it.each([
    ["$\\frac{3}{4}$", "0.75"],
    ["\\(2.500\\)", "2.5"],
    ["\\[−0.00\\]", "0"],
    ["$$1/8$$", "0.125"],
    ["-2^2", "-4"],
    ["(-2)^2", "4"],
    ["2^{-3}", "0.125"],
    ["1.2 + 3/10", "1.5"],
    ["\\frac{1+2}{2*3}", "0.5"],
    ["3\\cdot 0.2", "0.6"],
    ["1e-3", "0.001"],
    ["9007199254740993", "9007199254740993"],
    ["2.5000/0.5", "5"],
  ])("preserves %s exactly as %s", (raw, expected) =>
    expect(numericDesmosCell(raw)).toEqual({ latex: expected, repeating: false })
  );
  it("does not round repeating decimals", () =>
    expect(numericDesmosCell("2/6")).toEqual({ latex: "\\frac{1}{3}", repeating: true }));
  it.each([
    "$1",
    "1$",
    "$1$$",
    "$5 dollars$",
    "2 cm",
    "5%",
    "1,000",
    "1,5",
    "1/0",
    "\\frac{1}{0}",
    "2(3)",
    "\\sqrt{2}",
    "2^{0.5}",
    "1;alert(1)",
    "NaN",
  ])("holds ambiguous or unsupported %s", (value) => expect(numericDesmosCell(value)).toBeNull());
});
describe("safe explicit math", () => {
  it.each(["$f(x)=2x^2+3$", "\\(y=\\sqrt{x}\\)", "$x^2+2x+1$"])(
    "accepts %s without guessing",
    (value) => expect(validatedDesmosMath(value)).not.toBeNull()
  );
  it.each([
    "$y=\\href{https://example.com}{x}$",
    "$x=\\text{hello}$",
    "$x={2$",
    "$x=2; y=3$",
    "$x=2$$",
  ])("rejects %s", (value) => expect(validatedDesmosMath(value)).toBeNull());
  it("keeps proper delimiters separate from currency", () => {
    expect(unwrapMath("$1/2$")).toBe("1/2");
    expect(unwrapMath("1$2")).toBeNull();
  });
});
