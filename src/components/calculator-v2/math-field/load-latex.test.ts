import { expect, it } from "vitest";
import { CORPUS } from "@/lib/calculator-v2/core/corpus";
import { inputKind } from "@/lib/calculator-v2/core/corpus/types";
import { functionDefinitionHead, parseLatex, treesEqual } from "@/lib/calculator-v2/core/latex";
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
it("toMathFieldLatex puts \\cdot between a letter and digits written apart, which MathQuill would join into a subscript", () => {
  expect(toMathFieldLatex("x 1")).toBe("x\\cdot1");
  expect(toMathFieldLatex("2x 15+y")).toBe("2x\\cdot15+y");
  expect(toMathFieldLatex("x1 2")).toBe("x\\cdot1 2");
  expect(toMathFieldLatex("y^{x 1}")).toBe("y^{x\\cdot1}");
  for (const s of [
    "x1",
    "x 1.5",
    "e 1",
    "\\pi 2",
    "\\sin 2",
    "sin 2",
    "x_{a 1}",
    "\\text{a 1}",
    "2 3",
  ])
    expect(toMathFieldLatex(s), s).toBe(s);
});
it("toMathFieldLatex writes a brace group in atom position as parentheses, which MathQuill would drop", () => {
  expect(toMathFieldLatex("{x+1}2")).toBe("\\left(x+1\\right)2");
  expect(toMathFieldLatex("2^{{x+1}y}")).toBe("2^{\\left(x+1\\right)y}");
  expect(toMathFieldLatex("\\frac{1}{2}{3}")).toBe("\\frac{1}{2}\\left(3\\right)");
  expect(toMathFieldLatex("\\log_{2}{x+1}")).toBe("\\log_{2}\\left(x+1\\right)");
  // after a Latin identifier the group multiplies; bare parentheses would call a user function
  expect(toMathFieldLatex("f{x+1}")).toBe("f\\cdot\\left(x+1\\right)");
  expect(toMathFieldLatex("a_{1} {x}")).toBe("a_{1} \\cdot\\left(x\\right)");
  for (const s of [
    "\\frac{1}{2}",
    "\\frac12",
    "x^{2}",
    "a_{12}",
    "\\sqrt[3]{x}",
    "\\operatorname{sin}x",
    "\\text{a}",
    "\\mathbf{x}",
    "\\textcolor{red}{x}",
    "{}",
    "{1,2}",
    "\\left\\{x\\right\\}",
  ])
    expect(toMathFieldLatex(s), s).toBe(s);
});
it("toMathFieldLatex writes a degree sign after a superscript as \\degree, which MathQuill would merge into it", () => {
  expect(toMathFieldLatex("x^{2}^{\\circ}")).toBe("x^{2}\\degree");
  expect(toMathFieldLatex("x^2^\\circ+1")).toBe("x^2\\degree+1");
  expect(toMathFieldLatex("x^{2} ^{ \\circ }y")).toBe("x^{2} \\degree y");
  for (const s of ["x^{\\circ}", "x_{1}^{\\circ}", "x^{2}\\%", "x^{2}\\degree"])
    expect(toMathFieldLatex(s), s).toBe(s);
});
it("toMathFieldLatex gives \\sqrt a parenthesised radicand as its braced argument", () => {
  expect(toMathFieldLatex("\\sqrt(x+1)")).toBe("\\sqrt{x+1}");
  expect(toMathFieldLatex("\\sqrt[3] (2(x+1))")).toBe("\\sqrt[3] {2(x+1)}");
  for (const s of ["\\sqrt{x}", "\\sqrt2x", "\\sqrt\\left(x\\right)", "\\sqrt(x"])
    expect(toMathFieldLatex(s), s).toBe(s);
});
it("toMathFieldLatex leaves a built-in's run argument as MathQuill reads it, except a sum in braces right after the name", () => {
  expect(toMathFieldLatex("\\sin{x+1}")).toBe("\\sin\\left(x+1\\right)");
  expect(toMathFieldLatex("\\sin^{2}{-x+1}")).toBe("\\sin^{2}\\left(-x+1\\right)");
  expect(toMathFieldLatex("\\sin x+{y+1}2")).toBe("\\sin x+\\left(y+1\\right)2");
  expect(toMathFieldLatex("\\sin(x){y+1}")).toBe("\\sin(x)\\left(y+1\\right)");
  expect(toMathFieldLatex("cos x\\cdot y 2")).toBe("cos x\\cdot y\\cdot2");
  // braces around one factor, and the factors after it, stay in the run (PR-24)
  for (const s of ["\\sin{x}^{2}", "\\sin{x}y", "\\sin{-x}", "\\sin x{y}", "\\sin x 2", "sinx 2"])
    expect(toMathFieldLatex(s), s).toBe(s);
});
it("toMathFieldLatex keeps the parse tree of every latex corpus case", () => {
  for (const c of CORPUS) {
    if (inputKind(c.input) !== "latex") continue;
    const latex = (c.input as { latex: string }).latex;
    const names = [...(c.rows ?? []), latex].flatMap((r) => functionDefinitionHead(r)?.name ?? []);
    const options = { userFunctions: new Set(names) };
    const before = parseLatex(latex, options);
    const after = parseLatex(toMathFieldLatex(latex), options);
    expect(after.ok, c.id).toBe(before.ok);
    if (before.ok && after.ok) expect(treesEqual(before.tree, after.tree), c.id).toBe(true);
  }
});
