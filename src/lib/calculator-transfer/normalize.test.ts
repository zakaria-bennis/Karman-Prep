import { expect, it } from "vitest";
import { parseLatex, toSExpr } from "../calculator-v2/core/latex/index";
import { isPlainMathText, normalizeQuestionMath } from "./normalize";

const N = (s: string, c: "math" | "cell" | "coordinate" = "math") => normalizeQuestionMath(s, c);

it("TR-7 table 4.1 rewrites each listed source form", () => {
  const rows: [string, string][] = [
    ["−3x+2", "-3x+2"],
    ["5–x", "5-x"],
    ["3\\times4", "3\\cdot4"],
    ["2×5", "2\\cdot5"],
    ["4·x", "4\\cdot x"],
    ["8÷2", "8\\div2"],
    ["\\dfrac{1}{2}x", "\\frac{1}{2}x"],
    ["\\tfrac{3}{4}", "\\frac{3}{4}"],
    ["x\\leq5", "x\\le5"],
    ["y\\geq x", "y\\ge x"],
    ["x≤3", "x\\le3"],
    ["y≥x", "y\\ge x"],
    ["\\displaystyle\\frac{1}{2}", "\\frac{1}{2}"],
    ["\\big(x+1\\big)", "(x+1)"],
    ["\\Bigl(x\\Bigr)", "(x)"],
    ["2\\,x\\;+\\:1\\!", "2x+1"],
    ["2\\quad x", "2x"],
    ["x\\text{ }=\\text{  }5", "x=5"],
    ["30{,}000", "30000"],
    ["x²+y³", "x^{2}+y^{3}"],
    ["2πr", "2\\pi r"],
    ["θ+1", "\\theta+1"],
    ["√(x+1)", "\\sqrt{x+1}"],
    ["√(√(x)+1)", "\\sqrt{\\sqrt{x}+1}"],
    ["3/4", "\\frac{3}{4}"],
    ["2 1/2", "\\left(2+\\frac{1}{2}\\right)"],
    ["0.\\overline{3}", "\\frac{1}{3}"],
    ["0.1\\overline{6}", "\\frac{1}{6}"],
    ["1.\\overline{3}", "\\frac{4}{3}"],
    ["0.\\overline{9}", "1"],
    ["|x-3|", "\\left|x-3\\right|"],
    ["2|x|+1", "2\\left|x\\right|+1"],
    ["|x||y|", "\\left|x\\right|\\left|y\\right|"],
    ["||x|-1|", "\\left|\\left|x\\right|-1\\right|"],
    ["y=2x+3.", "y=2x+3"],
    ["x=5,", "x=5"],
    ["x>4;", "x>4"],
    ["y<1:", "y<1"],
    ["  y=x  ", "y=x"],
  ];
  for (const [input, output] of rows) expect(N(input), input).toBe(output);
});
it("TR-7 notation outside table 4.1 is left as written", () => {
  for (const s of [
    "y = 2x + 3",
    "\\frac{x}{4}",
    "x/4",
    "x^2/3",
    "\\sqrt[3]{x}",
    "a_1+b_{2}",
    "25\\%",
    "\\sin(30)",
    "\\left|x\\right|",
    "x\\ne3",
    "\\$12.50",
    "1,250",
    "12\\text{ cm}",
    "\\{1\\}",
    "\\tau",
    "\\sin x",
    "x|y",
    "\\left\\{\\begin{array}{l}y=x\\end{array}\\right.", // the system wrapper's \right. is not trailing punctuation
  ])
    expect(N(s), s).toBe(s);
  expect(N("\\sin 30^{\\circ}")).toBe("\\sin30^{\\circ}"); // decision 3
  expect([
    isPlainMathText("2 1/2"),
    isPlainMathText("x²+1"),
    isPlainMathText("x^2"),
    isPlainMathText("\\frac{1}{2}"),
  ]).toEqual([true, true, false, false]);
});
it("PR-1 each question-dialect form and its typed twin parse to the same tree after TR-7", () => {
  const twins: [string, string][] = [
    ["−3x+2", "-3x+2"],
    ["\\dfrac{1}{2}x", "\\frac{1}{2}x"],
    ["x≤3", "x\\le3"],
    ["2 1/2", "\\left(2+\\frac{1}{2}\\right)"],
    ["0.\\overline{3}", "\\frac{1}{3}"],
    ["|x-3|", "\\left|x-3\\right|"],
    ["30{,}000", "30000"],
    ["4·x", "4\\cdot x"],
    ["3/4", "3/4"],
  ];
  for (const [question, typed] of twins) {
    const a = parseLatex(N(question)),
      b = parseLatex(typed);
    expect(a.ok && b.ok && toSExpr(a.tree) === toSExpr(b.tree), question).toBe(true);
  }
});
it("PR-5 {,} between digit groups is removed and a bare comma stays a separator", () => {
  expect([N("1{,}250"), N("2{,}000{,}000"), N("(1,250)"), N("1,250"), N("x{,}y")]).toEqual([
    "1250",
    "2000000",
    "(1,250)",
    "1,250",
    "x{,}y",
  ]);
});
it("PR-6, TR-28 a question mixed number is a parenthesised sum in math and an improper fraction in cells and coordinates", () => {
  const rows: [string, "math" | "cell" | "coordinate", string][] = [
    ["2\\frac{1}{2}", "math", "\\left(2+\\frac{1}{2}\\right)"],
    ["-2\\frac{1}{2}", "math", "-\\left(2+\\frac{1}{2}\\right)"],
    ["x+3\\frac{1}{4}", "math", "x+\\left(3+\\frac{1}{4}\\right)"],
    ["y=2 \\frac{1}{3}x", "math", "y=\\left(2+\\frac{1}{3}\\right)x"], // D1
    ["2\\frac{1}{2}", "cell", "\\frac{5}{2}"],
    ["-2\\frac{1}{2}", "coordinate", "-\\frac{5}{2}"],
    ["12\\frac{3}{4}", "cell", "\\frac{51}{4}"],
    ["2 1/2", "cell", "\\frac{5}{2}"],
    ["2\\frac{3}{2}", "math", "2\\frac{3}{2}"],
    ["2.5\\frac{1}{2}", "math", "2.5\\frac{1}{2}"],
    ["2\\frac{0}{2}", "math", "2\\frac{0}{2}"],
    ["x2\\frac{1}{2}", "math", "x2\\frac{1}{2}"],
    ["2\\frac{x}{2}", "math", "2\\frac{x}{2}"],
    // decision 12: after a comma or an opening bracket the integer starts a mixed number
    ["f(1,2\\frac{1}{2})", "math", "f(1,\\left(2+\\frac{1}{2}\\right))"],
    ["y=(2\\frac{1}{2})x", "math", "y=(\\left(2+\\frac{1}{2}\\right))x"],
    ["x^{2\\frac{1}{2}}", "math", "x^{\\left(2+\\frac{1}{2}\\right)}"],
    // spaces between the operator and the integer are ignored, as TeX ignores them
    ["y = 2\\frac{1}{2}x", "math", "y = \\left(2+\\frac{1}{2}\\right)x"],
    ["x 2\\frac{1}{2}", "math", "x 2\\frac{1}{2}"],
    // decision 12: a digit run right after ^ or _ is the exponent or subscript, never the integer a
    ["x^2\\frac{1}{2}", "math", "x^2\\frac{1}{2}"],
    ["a_2\\frac{1}{2}", "math", "a_2\\frac{1}{2}"],
  ];
  for (const [input, context, output] of rows)
    expect(N(input, context), `${input} ${context}`).toBe(output);
});
