import { expect, it } from "vitest";
import { toMathFieldLatex } from "./load-latex";

it("toMathFieldLatex rewrites the PR-3 spellings MathQuill cannot read", () => {
  expect(toMathFieldLatex("\\displaystyle\\tfrac{1}{2}")).toBe("\\frac{1}{2}");
  expect(toMathFieldLatex("x\\leqslant3")).toBe("x\\le3");
  expect(toMathFieldLatex("x\\geqslant 3")).toBe("x\\ge 3");
  expect(toMathFieldLatex("2\\,3\\;4\\:5\\!6")).toBe("23456");
  expect(toMathFieldLatex("\\lvert x\\rvert")).toBe("\\left| x\\right|");
});
it("toMathFieldLatex leaves every other command alone", () => {
  for (const s of [
    "\\leq3",
    "\\le x",
    "\\geq",
    "\\frac{1}{2}",
    "\\left|x\\right|",
    "a\\ b",
    "\\text{sin}x",
    "\\operatorname{arcsec}x",
    "x^{\\circ}",
  ])
    expect(toMathFieldLatex(s), s).toBe(s);
});
