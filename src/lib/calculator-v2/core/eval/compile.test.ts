import { expect, it } from "vitest";
import {
  compileExpression,
  compileRealFunction1,
  compileRealFunction2,
  evaluateLatex,
  evaluateRows,
  type CompileScope,
  type EvalSettings,
} from "./compile";
import { analyzeRows, type RowGraph } from "../analysis/index";
import { numberValue, UNDEFINED, type Value } from "./values";
import { DeadlineExceeded, NO_DEADLINE, type Deadline } from "../deadline";
import { parseLatex } from "../latex/index";

const REAL = { angleMode: "radians", complex: false } as const;
const DEG = { ...REAL, angleMode: "degrees" } as const;
const CX = { ...REAL, complex: true } as const;
const P = Math.PI;
const n = numberValue;
const src = (l: string[]) => l.map((latex, k) => ({ id: `r${k}`, latex, hidden: false }));

/** The parseLatex tree of `latex`; throws on a parse error. */
function tree(latex: string, userFunctions?: ReadonlySet<string>) {
  const parsed = parseLatex(latex, { userFunctions });
  if (!parsed.ok) throw new Error(`${latex}: ${parsed.error.code}`);
  return parsed.tree;
}

function setup(rows: string[], settings: EvalSettings = REAL) {
  const analysis = analyzeRows(src(rows), settings),
    byRow = evaluateRows(analysis, settings, () => NO_DEADLINE),
    values = new Map<string, Value>();
  for (const r of analysis.rows) {
    const v = byRow.get(r.id);
    if (r.kind === "definition" && r.defines && v) values.set(r.defines.name, v);
  }
  return { analysis, scope: { functions: analysis.functions, values, settings } };
}
const explicitExpr = (g: RowGraph | null) => {
  if (g?.kind !== "explicit") throw new Error("not explicit");
  return g.expr;
};
const empty = (settings: EvalSettings): CompileScope => ({
  functions: new Map(),
  values: new Map(),
  settings,
});
const value = (latex: string, s: EvalSettings = REAL) =>
  compileExpression(tree(latex), empty(s))({}, NO_DEADLINE);

it("G-6 functions defined in later rows evaluate and graph from earlier rows", () => {
  const rows = ["y=f(x)+g(1,2)", "f(x)=x^{2}", "g(a,b)=a+b"],
    { analysis, scope } = setup(rows);
  expect(compileRealFunction1(explicitExpr(analysis.rows[0].graph), "x", scope)(3)).toBe(12);
  expect(evaluateLatex("f(2)+g(1,2)", { rows: rows.slice(1) })).toEqual(n(7));
});
it("RC-6, RC-4 y=a after a=2x graphs y=2x, parameters shadow defined names, and a call to a head with an error is undefined", () => {
  const { analysis, scope } = setup(["a=2x", "y=a"]);
  expect(compileRealFunction1(explicitExpr(analysis.rows[1].graph), "x", scope)(2)).toBe(4);
  expect([
    evaluateLatex("f(2)", { rows: ["a=5", "f(a)=a+1"] }),
    evaluateLatex("f(2)", { rows: ["f(x,x)=x"] }),
  ]).toEqual([n(3), UNDEFINED]);
});
it("RC-9 evaluateRows follows dependency order and skips a row whose deadline expires", () => {
  const a = analyzeRows(src(["c=b+1", "b=a+1", "a=1", "c+1", "y=x", "(c,1)", "k"]), REAL),
    out = evaluateRows(a, REAL, () => NO_DEADLINE);
  expect([[...out.keys()].sort(), out.get("r3"), out.get("r5")]).toEqual([
    ["r0", "r1", "r2", "r3", "r5"],
    n(4),
    { type: "point", value: [3, 1] },
  ]);
  const expire = (id: string): Deadline =>
      id === "r1"
        ? {
            check() {
              throw new DeadlineExceeded(id);
            },
          }
        : NO_DEADLINE,
    late = evaluateRows(a, REAL, expire);
  expect([late.has("r1"), late.get("r0"), late.get("r2")]).toEqual([false, UNDEFINED, n(1)]);
});
it("NM-9 later rows and conditions use the full double, not the displayed value", () =>
  expect([evaluateLatex("a-0.3", { rows: ["a=0.1+0.2"] }), value("0.1+0.2>0.3")]).toEqual([
    n(5.551115123125783e-17),
    n(1),
  ]));
it("NM-12 division by zero, bad logs, even roots, inverse-trig domains and poles are undefined", () => {
  for (const l of [
    "\\frac{1}{0}",
    "\\ln(0)",
    "\\ln(-1)",
    "\\log(0)",
    "\\log_{1}(5)",
    "\\log_{-2}(4)",
    "\\sqrt{-1}",
    "\\sqrt[4]{-16}",
    "\\arcsin(2)",
    "\\arccos(-1.5)",
    "\\tan(\\frac{\\pi}{2})",
    "\\sec(\\frac{\\pi}{2})",
    "\\csc(0)",
    "\\cot(0)",
  ])
    expect(evaluateLatex(l), l).toEqual(UNDEFINED);
});
it("NM-21 complex-mode curves plot only where the value is real", () => {
  const f = (l: string) => compileRealFunction1(tree(l), "x", empty(CX)),
    g = compileRealFunction2(tree("x^{2}+iy"), empty(CX));
  expect([
    f("\\sqrt{x}")(-4),
    f("\\sqrt{x}")(4),
    f("e^{i\\pi x}")(1),
    f("e^{i\\pi x}")(0.5),
    f("(x+i)(x-i)")(2),
    g(1, 0),
    g(1, 1),
  ]).toEqual([NaN, 2, -1, NaN, 5, 1, NaN]);
});
it("NM-22 a relation with a non-real or undefined operand is false, and evaluateLatex shows a constant relation through compileExpression", () => {
  expect([
    value("2<3"),
    value("1<2<3"),
    value("3<2"),
    value("\\frac{1}{0}<2"),
    value("i<2", CX),
    value("i\\cdot i<0", CX),
  ]).toEqual([n(1), n(1), UNDEFINED, UNDEFINED, UNDEFINED, n(1)]);
  expect([evaluateLatex("2<3"), evaluateLatex("i\\cdot i<0", { settings: CX })]).toEqual([
    n(1),
    n(1),
  ]);
  expect([evaluateLatex("2=3"), evaluateLatex("y>x"), evaluateLatex("3p+4<19")]).toEqual([
    UNDEFINED,
    UNDEFINED,
    UNDEFINED,
  ]);
});
it("NM-27 the degree sign converts, and a degree trig argument is exact in both modes", () => {
  for (const settings of [REAL, DEG])
    expect(
      ["\\sin(30^{\\circ})", "\\cos(60^{\\circ})"].map((l) => evaluateLatex(l, { settings }))
    ).toEqual([n(0.5), n(0.5)]);
  expect([evaluateLatex("30^{\\circ}"), evaluateLatex("30^{\\circ}", { settings: DEG })]).toEqual([
    n(P / 6),
    n(30),
  ]);
});
it("FN-17 complex mode uses principal branches, keeps real-mode values and plots only real points", () => {
  expect(
    ["(-8)^{\\frac{1}{3}}", "\\ln(-1)", "2+3"].map((l) => evaluateLatex(l, { settings: CX }))
  ).toEqual([n(-2), { type: "complex", value: { re: 0, im: P } }, n(5)]);
  expect(compileRealFunction1(tree("\\ln(x)"), "x", empty(CX))(-1)).toBeNaN();
});
