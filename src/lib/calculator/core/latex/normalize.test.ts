import { expect, it } from "vitest";
import { normalizeLatex } from "./normalize";
const N = normalizeLatex;
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
