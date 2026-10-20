import { describe, expect, it } from "vitest";
import { createTestEngine } from "./__fixtures__/test-engine";

/**
 * Every row's outcome as Desmos's `Calc.expressionAnalysis` reports it: the error message, else
 * "VALUE" for a shown value, "GRAPH" for a graphable row and "ok" otherwise.
 */
async function outcomes(rows: string[]): Promise<string[]> {
  const t = createTestEngine(undefined, { backend: "main-thread" });
  t.engine.setExpressions(rows.map((latex, i) => ({ id: `r${i}`, latex })));
  await t.settled();
  const analysis = t.engine.expressionAnalysis;
  return rows.map((_, i) => {
    const a = analysis[`r${i}`];
    if (a.isError) return a.errorMessage ?? "";
    if (a.evaluationDisplayed) return "VALUE";
    return a.isGraphable ? "GRAPH" : "ok";
  });
}

const both = (s: string) => `You need something on both sides of the '${s}' symbol.`;
const after = (s: string) => `You need something after the '${s}' symbol.`;
const PARSE = "Sorry, I don't understand this.";
const expected = (open: string, close: string) => `Expected '${open}' to match '${close}'.`;
const subscript = (s: string) =>
  `Subscripts may only contain letters and digits. '${s}' is not allowed.`;

// Each case is one row and the exact text live Desmos gave for it (captured 2026-10-20).
const ROWS: [string, string][] = [
  ["1+", both("+")],
  ["\\frac{1}{0}+", both("+")],
  ["x=", both("=")],
  ["=2", both("=")],
  ["+", after("+")],
  ["-", after("-")],
  ["1-", both("-")],
  ["(1+)", both("+")],
  ["\\left(1+\\right)", both("+")],
  ["1*", both("*")],
  ["1/", both("/")],
  ["/2", both("/")],
  ["<1", both("<")],
  ["1<", both("<")],
  ["[1,]", both(",")],
  ["1,", both(",")],
  [",1", both(",")],
  ["x\\cdot", both("⋅")],
  ["\\cdot", both("⋅")],
  ["\\le1", both("≤")],
  ["1\\le", both("≤")],
  ["!", "You need something before the '!' symbol."],
  ["!2", "You need something before the '!' symbol."],
  ["1+*2", both("*")],
  ["-=2", both("=")],
  ["+=2", both("=")],
  ["1+=2", both("=")],
  ["(+)", after("+")],
  ["(-)", after("-")],
  ["1,+", after("+")],
  ["\\sqrt{1+}", both("+")],
  ["\\frac{1+}{2}", both("+")],
  ["\\frac{1}{2+}", both("+")],
  ["2^{1+}", both("+")],
  ["[1+]", both("+")],
  ["1=2=", both("=")],
  ["\\operatorname{with}a=2", both("with")],
  ["1^", PARSE],
  ["\\sqrt", PARSE],
  ["x_", PARSE],
  ["2^{3}^{4}", PARSE],
  ["x_{1}_{2}", PARSE],
  ["{", PARSE],
  ["}", PARSE],
  ["1^{}", "Superscripts cannot be empty."],
  ["x^{}", "Superscripts cannot be empty."],
  ["x_{}", "Subscripts cannot be empty."],
  ["\\left|\\right|", "Absolute value symbol cannot be empty."],
  ["\\left(\\right)", "Parentheses cannot be empty."],
  ["\\frac{}{}", "You need a numerator and denominator for your fraction."],
  ["\\frac{1}{}", "You need a denominator for the bottom of your fraction."],
  ["\\frac{}{2}", "You need a numerator for the top of your fraction."],
  ["|", "Sorry, I don't understand the '|' symbol."],
  ["|-5|", "Sorry, I don't understand the '|' symbol."],
  ["|x", "Sorry, I don't understand the '|' symbol."],
  ["x|", "Sorry, I don't understand the '|' symbol."],
  ["x_{1^{2}}", subscript("^{2}")],
  ["x_{a+b}", subscript("+")],
  ["x_{1.5}", subscript(".")],
  ["x_{\\alpha}", subscript("α")],
  ["a_{1,3}", subscript(",")],
  ["1_2", "Only functions and variables may have subscripts."],
  ["(1)_2", "Only functions and variables may have subscripts."],
  ["(1", expected("(", ")")],
  ["1)", expected("(", ")")],
  ["(1]", expected("(", ")")],
  ["2(", expected("(", ")")],
  ["\\sin(", expected("(", ")")],
  ["[1", expected("[", "]")],
  ["1]", expected("[", "]")],
  ["\\{1", expected("{", "}")],
  ["1\\}", expected("{", "}")],
  [
    "1.2.3",
    "Sorry, I don't know what to do with adjacent numbers '1.2' and '.3'. Try using parentheses or a '*' symbol.",
  ],
  ["1..5", "Sorry, I don't understand this use of '.' after a constant number."],
  [".", both(".")],
  ["a.b", "Sorry, I don't understand the way that '.' is used here."],
  ["1...5", "Sorry, I don't understand the way that '...' is used here."],
  ["y\\sim mx\\sim b", "Sorry, I don't understand the way that '~' is used here."],
  ["(1,2,3)", "This calculator cannot plot a 3d point."],
  ["(1,2,3,4)", "Points may only have 2 coordinates."],
];

describe("Desmos's row error texts (live Desmos, 2026-10-20)", () => {
  it.each(ROWS)("%s", async (latex, message) => {
    expect(await outcomes([latex])).toEqual([message]);
  });
});
