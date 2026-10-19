import { describe, expect, it } from "vitest";
import * as O from "./operator-names";
const names = () => O.OPERATOR_NAMES.map((n) => n.name);
describe("operator-name allowlist", () => {
  it("PR-12 parser names, MathQuill autoOperatorNames and panel entries come from one list; members are separate", () => {
    expect([
      new Set(names()).size,
      O.mathQuillAutoOperatorNames(),
      names().every(O.isBuiltinName),
    ]).toEqual([106, names().join(" "), true]);
    for (const e of O.panelCategories().flatMap((c) => c.entries))
      expect(O.isBuiltinName(e.name) && O.isShippedBuiltin(e.name)).toBe(true);
    expect([O.AUTO_COMMANDS.join(" "), O.mathQuillAutoCommands()]).toEqual(
      Array(2).fill("sqrt cbrt nthroot pi theta tau phi infinity infty sum prod int")
    );
    expect(O.MEMBER_NAMES.join(" ")).toBe(
      "null p pleft pright score dof stderr conf lower upper estimate"
    );
    for (const m of O.MEMBER_NAMES)
      expect(O.isBuiltinName(m) || O.mathQuillAutoOperatorNames().split(" ").includes(m)).toBe(
        false
      );
  });
  it("PR-12 built-ins ship by name: the SHIPPED set is the trig, inverse trig, exp, ln and log functions", () => {
    expect([...O.SHIPPED].every(O.isBuiltinName)).toBe(true);
    expect(names().filter(O.isShippedBuiltin)).toEqual([...O.SHIPPED]);
    expect(
      O.OPERATOR_NAMES.filter((n) => n.category !== null && O.isShippedBuiltin(n.name))
        .map((n) => n.name)
        .join(" ")
    ).toBe("sin cos tan csc sec cot arcsin arccos arctan arccsc arcsec arccot exp ln log");
    expect(
      O.OPERATOR_NAMES.filter((n) => n.category === null)
        .map((n) => n.name)
        .join(" ")
    ).toBe("with for and or of");
    expect([
      O.OPERATOR_NAMES.find((n) => n.name === "arctan")?.arity,
      ["mean", "sinh", "nope", "length", "abs"].map(O.isShippedBuiltin),
    ]).toEqual([
      [1, 2],
      [false, false, false, false, false],
    ]);
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
      "8 Calculus: exp ln log logₐ",
    ]);
    expect(calculus.entries.map((e) => e.name).join(" ")).toBe("exp ln log log");
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
