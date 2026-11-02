// FN-61: the derivative operator `\frac{d}{dx}` against live Desmos (College Board version,
// captured 2026-10-26): each expression as the body of g(x), with f(x)=x³ and a=3, read at 1 and 2.

import { describe, expect, it } from "vitest";
import { analyzeRows } from "../analysis/index";
import { evaluateLatex } from "./compile";
import type { Value } from "./values";

const CASES: [string, number, number][] = [
  ["\\frac{d}{dx}x^{2}+x^{2}", 3, 8], // the rest of the term only: 2x + x²
  ["\\frac{d}{dx}x^{2}\\cdot x", 3, 12],
  ["\\frac{d}{dx}xx", 2, 4],
  ["\\frac{d}{dx}x^{2}x", 3, 12],
  ["\\frac{d}{dx}2x^{3}", 6, 24],
  ["3\\frac{d}{dx}x^{2}", 6, 12],
  ["\\frac{d}{dx}\\sin x", 0.5403023058681398, -0.4161468365471424],
  ["\\frac{d}{dx}\\frac{x}{2}", 0.5, 0.5],
  ["\\frac{d}{dx}x^{2}-x^{3}", 1, -4],
  ["\\frac{d}{dx}\\frac{d}{dx}x^{3}", 6, 12],
  ["\\frac{d}{dx}f(x)", 3, 12],
  ["\\frac{d}{dx}f(x^{2})", 6, 192],
  ["\\frac{d}{dx}(x^{2}+x^{2})", 4, 8],
  ["\\frac{d}{dx}\\sqrt{x}", 0.5, 0.35355339059327373],
  ["\\frac{d}{dx}\\ln x", 1, 0.5],
  ["\\frac{d}{dx}e^{x}", 2.718281828459045, 7.38905609893065],
  ["\\frac{d}{dx}ax^{2}", 6, 12],
  ["\\frac{d}{dx}f'(x)", 6, 12], // prime notation inside d/dx
];

const numberOf = (v: Value) => (v.type === "number" ? v.value : NaN);

describe("the derivative operator against live Desmos (FN-61)", () => {
  for (const [body, at1, at2] of CASES) {
    it(`g(x)=${body}`, () => {
      const rows = ["f(x)=x^{3}", "a=3", `g(x)=${body}`];
      expect(numberOf(evaluateLatex("g(1)", { rows }))).toBeCloseTo(at1, 12);
      expect(numberOf(evaluateLatex("g(2)", { rows }))).toBeCloseTo(at2, 12);
    });
  }

  it("d/dt differentiates in t, so a row of it is a function of t (Desmos asks for y=)", () => {
    const rows = ["h(t)=\\frac{d}{dt}t^{3}"];
    expect(numberOf(evaluateLatex("h(2)", { rows }))).toBeCloseTo(12, 12);
    const a = analyzeRows([{ id: "r", latex: "\\frac{d}{dt}t^{3}", hidden: false }], {
      angleMode: "radians",
      complex: false,
    });
    expect(a.rows[0].chips).toEqual(["t"]);
  });

  it("d/dx of a constant is 0, `\\frac{d}{dx}f(3)` as on Desmos", () => {
    expect(numberOf(evaluateLatex("\\frac{d}{dx}f(3)", { rows: ["f(x)=x^{3}"] }))).toBe(0);
  });

  it("a row `\\frac{d}{dx}x^{2}` graphs y = 2x, and so does `y=\\frac{d}{dx}x^{2}`", () => {
    const a = analyzeRows(
      [
        { id: "1", latex: "\\frac{d}{dx}x^{2}", hidden: false },
        { id: "2", latex: "y=\\frac{d}{dx}x^{2}", hidden: false },
      ],
      { angleMode: "radians", complex: false }
    );
    expect(a.rows.map((r) => [r.error, r.isGraphable])).toEqual([
      [null, true],
      [null, true],
    ]);
  });

  it("`\\frac{d}{dx}` with nothing after it asks what to differentiate", () => {
    for (const latex of ["\\frac{d}{dx}", "\\frac{d}{dx}+1", "(\\frac{d}{dx})"]) {
      const a = analyzeRows([{ id: "r", latex, hidden: false }], {
        angleMode: "radians",
        complex: false,
      });
      expect(a.rows[0].error?.code).toBe("derivative-operand");
    }
  });

  it("degree mode differentiates trig in degrees, as prime notation does", () => {
    const rows = ["g(x)=\\frac{d}{dx}\\sin x"];
    const v = evaluateLatex("g(0)", { rows, settings: { angleMode: "degrees" } });
    expect(numberOf(v)).toBeCloseTo(Math.PI / 180, 14);
  });
});
