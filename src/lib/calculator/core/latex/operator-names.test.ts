import { describe, expect, it } from "vitest";
import * as O from "./operator-names";
const names = () => O.OPERATOR_NAMES.map((n) => n.name);
describe("operator-name allowlist", () => {
  it("PR-12 parser names, MathQuill autoOperatorNames and panel entries come from one list; members are separate", () => {
    expect([
      new Set(names()).size,
      O.mathQuillAutoOperatorNames(),
      names().every(O.isBuiltinName),
    ]).toEqual([116, names().join(" "), true]);
    // every panel entry is a shipped name, except notation buttons (FN-61's d/dx)
    for (const e of O.panelCategories().flatMap((c) => c.entries))
      expect(e.name === "ddx" || (O.isBuiltinName(e.name) && O.isShippedBuiltin(e.name))).toBe(
        true
      );
    expect([O.AUTO_COMMANDS.join(" "), O.mathQuillAutoCommands()]).toEqual(
      Array(2).fill("alpha beta rho sqrt cbrt nthroot pi theta tau phi infinity infty sum prod int")
    );
    expect(O.MEMBER_NAMES.join(" ")).toBe(
      "null pleft pright score dof stderr conf lower upper estimate"
    );
    for (const m of O.MEMBER_NAMES)
      expect(O.isBuiltinName(m) || O.mathQuillAutoOperatorNames().split(" ").includes(m)).toBe(
        false
      );
  });
  it("PR-12 built-ins ship by name: the SHIPPED set is trig, inverse trig, statistics with its aliases, length, normaldist, tdist and binomialdist with pdf, cdf and inversecdf, erf, the inference tests, exp, ln, log, hyperbolic trig, number theory, distance and midpoint, and the complex-number functions", () => {
    expect([...O.SHIPPED].every(O.isBuiltinName)).toBe(true);
    const hidden = O.HIDDEN_OPERATOR_NAMES.map((n) => n.name);
    expect([...names(), ...hidden].filter(O.isShippedBuiltin)).toEqual([...O.SHIPPED]);
    expect(
      O.OPERATOR_NAMES.filter((n) => n.category !== null && O.isShippedBuiltin(n.name))
        .map((n) => n.name)
        .join(" ")
    ).toBe(
      "sin cos tan csc sec cot arcsin arccos arctan arccsc arcsec arccot " +
        "mean median min max quartile quantile stdev stddev stdDev stdevp stddevp stdDevP " +
        "var variance varp cov covp mad corr spearman count total repeat join sort unique length " +
        "normaldist tdist binomialdist pdf cdf inversecdf inverseCdf erf " +
        "ztest ttest zproptest chisqtest chisqgof " +
        "exp ln log sinh cosh tanh csch sech coth arcsinh arccosh arctanh arccsch arcsech arccoth " +
        "distance midpoint lcm gcd gcf mcd mcm mod ceil floor round sign nPr nCr abs real imag conj arg"
    );
    expect(
      O.OPERATOR_NAMES.filter((n) => n.category === null)
        .map((n) => n.name)
        .join(" ")
    ).toBe("with for and or of");
    expect([
      O.OPERATOR_NAMES.find((n) => n.name === "arctan")?.arity,
      ["mean", "sinh", "nope", "length", "abs", "shuffle"].map(O.isShippedBuiltin),
    ]).toEqual([
      [1, 2],
      [true, true, false, true, true, false],
    ]);
  });
  it("FN-23 FN-36 FN-38 FN-47 hidden built-ins are pasted latex only, never typed or on the panel", () => {
    expect(O.HIDDEN_OPERATOR_NAMES.map((n) => [n.name, n.category, n.arity])).toEqual([
      ["argmin", 3, "variadic"],
      ["argmax", 3, "variadic"],
      ["sortPerm", 3, [1]],
      ["complexSortPerm", 3, [1]],
      ["uniquePerm", 3, [1]],
      ["repeatAssert", 3, [2]],
      ["frequencyList", 3, [2]],
      ["frequencyListAssert", 3, [2]],
      ["sortedLastLessIndex", 3, [2]],
      ["sortedLastLessEqualIndex", 3, [2]],
      ["normalcdf", 6, [2, 3, 4]],
      ["normalpdf", 6, [1, 2, 3]],
      ["binomcdf", 6, [3, 4]],
      ["binompdf", 6, [2, 3]],
      ["invNorm", 6, [1]],
      ["tpdf", 6, [2]],
      ["tcdf", 6, [5]],
      ["invT", 6, [2]],
      ["invBinom", 6, [3]],
      ["ittest", 7, [2]],
    ]);
    const hidden = O.HIDDEN_OPERATOR_NAMES.map((n) => n.name);
    expect(hidden.every((n) => O.isBuiltinName(n) && O.isShippedBuiltin(n))).toBe(true);
    expect(O.REFUSED_NAMES.every((n) => hidden.includes(n))).toBe(true);
    const typed = O.mathQuillAutoOperatorNames().split(" ");
    expect([
      typed.includes("arg"),
      hidden.some((n) => typed.includes(n) || names().includes(n)),
    ]).toEqual([true, false]);
    expect(O.panelCategories().some((c) => c.entries.some((e) => hidden.includes(e.name)))).toBe(
      false
    );
  });
  it("PR-12 abs and length are Desmos built-in names (appendix F decision 2)", () => {
    const byName = new Map(O.OPERATOR_NAMES.map((n) => [n.name, n]));
    expect([byName.get("abs"), byName.get("length")]).toEqual([
      { name: "abs", category: 12, phase: 2, arity: [1] },
      { name: "length", category: 4, phase: 2, arity: "variadic" },
    ]);
    expect(O.mathQuillAutoOperatorNames().split(" ")).toEqual(
      expect.arrayContaining(["abs", "length"])
    );
  });
  it("PR-12 panelCategories gives categories 1, 2 and 8 with K-5 actions", () => {
    expect(O.CATEGORY_HEADINGS.join("|")).toBe(
      "Trig|Inverse trig|Statistics|List operations|Visualizations|Probability distributions|" +
        "Inference|Calculus|Hyperbolic trig|Geometry|Custom colors|Number theory|Matrices|Complex|Advanced"
    );
    const cats = O.panelCategories(),
      [trig, inverse, calculus] = cats;
    expect(
      cats.map((c) => `${c.id} ${c.heading}: ${c.entries.map((e) => e.label).join(" ")}`)
    ).toEqual([
      "1 Trig: sin cos tan csc sec cot",
      "2 Inverse trig: sin⁻¹ cos⁻¹ tan⁻¹ csc⁻¹ sec⁻¹ cot⁻¹",
      "8 Calculus: exp ln log logₐ d/dx",
    ]);
    expect(calculus.entries.map((e) => e.name).join(" ")).toBe("exp ln log log ddx");
    expect(calculus.entries[4].actions).toEqual([{ op: "write", arg: "\\frac{d}{dx}" }]);
    expect(trig.entries[0]).toEqual({
      name: "sin",
      label: "sin",
      spoken: "sine",
      actions: [
        { op: "write", arg: "\\sin\\left(\\right)" },
        { op: "keystroke", arg: "Left" },
      ],
    });
    expect([inverse.entries[0].actions[0], calculus.entries[3].actions]).toEqual([
      { op: "write", arg: "\\sin^{-1}\\left(\\right)" },
      [
        { op: "cmd", arg: "\\log" },
        { op: "cmd", arg: "_" },
      ],
    ]);
  });
});
