import { expect, it } from "vitest";
import { normalizeLatex } from "./normalize";
import { tokenize, type Token } from "./tokens";
const N = normalizeLatex;
/** Normalize then tokenize, showing digits and symbols by their text and other tokens by kind. */
const ellipsis = (s: string) =>
  (tokenize(N(s)) as Token[]).map((k) =>
    k.t === "digits" ? k.text : k.t === "symbol" ? k.ch : k.t
  );
const CASES: [string, string][] = [
  ["\\dfrac{1}{2}+\\tfrac{3}{4}", "\\frac{1}{2}+\\frac{3}{4}"],
  ["\\left(x\\right)\\cdot\\left[y\\right]+\\left\\{z\\right.", "(x)\\cdot[y]+\\{z"],
  ["\\left|x\\right|", "\\lvert x\\rvert "],
  ["\\displaystyle2\\,x\\;y\\:z\\!w\\ v\\quad u", "2xyzwv u"],
  ["2\\times3\\div4", "2\\cdot3/4"],
  [
    "a\\le b\\leq c\\leqslant d\\ge e\\geq f\\geqslant g\\lt h\\gt i",
    "a\\le b\\le c\\le d\\ge e\\ge f\\ge g< h> i",
  ],
  [
    "\\operatorname{sin}x+\\mathrm{ln}y+\\text{of}+\\text{hello}",
    "\\operatorname{sin}x+\\operatorname{ln}y+\\operatorname{of}+\\text{hello}",
  ],
  ["\\leftarrow\\timesx", "\\leftarrow\\timesx"],
];
it("PR-3 normalizeLatex rewrites fractions, delimiters, spacing, operators and operator names, idempotently", () => {
  for (const [input, out] of CASES) expect([N(input), N(out)]).toEqual([out, out]);
});
it("PR-4 normalizeLatex maps the Unicode math characters, including all ten subscript digits, to LaTeX", () => {
  expect([N("x₁₂+y²³−3–2×4·5÷6"), N("2π+θ+τ"), N("x≤1≥0"), N("a₀₁₂₃₄₅₆₇₈₉")]).toEqual([
    "x_{12}+y^{23}-3-2\\cdot 4\\cdot 5/6",
    "2\\pi +\\theta +\\tau ",
    "x\\le 1\\ge 0",
    "a_{0123456789}",
  ]);
});
it("normalizeLatex escapes raw percent and writes every degree sign as ^{\\circ}", () => {
  expect([N("44%+5\\%"), N("30°+40\\degree+50^\\circ")]).toEqual([
    "44\\%+5\\%",
    "30^{\\circ}+40^{\\circ}+50^{\\circ}",
  ]);
});
it("MATHS-CORE-10 normalizeLatex rewrites \\ldots, \\dots and … to a spaced ellipsis, idempotently", () => {
  expect([N("[1\\ldots3]"), N("1,3,\\dots,9"), N("1\\ldots3\\dotsb"), N("[1…3]")]).toEqual([
    "[1 ... 3]",
    "1,3, ... ,9",
    "1 ... 3\\dotsb",
    "[1 ... 3]",
  ]);
  expect([N("[1 ... 3]"), N("[1...3]")]).toEqual(["[1 ... 3]", "[1...3]"]);
});
it("MATHS-CORE-10 normalized \\ldots tokenizes as the same ellipsis with or without spaces", () => {
  expect([ellipsis("[1\\ldots3]"), ellipsis("1 \\ldots 3"), ellipsis("1\\dots 3")]).toEqual([
    ["open", "1", "...", "3", "close", "end"],
    ["1", "...", "3", "end"],
    ["1", "...", "3", "end"],
  ]);
});
it("MATHS-CORE-10 a dot before \\ldots stays a decimal point instead of fusing into four dots", () => {
  expect([ellipsis("[1.\\ldots3]"), ellipsis("1.\\dots3"), ellipsis("[1.…3]")]).toEqual([
    ["open", "1.", "...", "3", "close", "end"],
    ["1.", "...", "3", "end"],
    ["open", "1.", "...", "3", "close", "end"],
  ]);
});
