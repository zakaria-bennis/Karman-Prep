import { expect, expectTypeOf, it, vi } from "vitest";
import { createTestEngine } from "@/lib/calculator/core/api/__fixtures__/test-engine";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { ExpressionState } from "@/lib/calculator/core/api/types";
import { classifyStem, type StemInput } from "@/lib/calculator-transfer/classify";
import type { TransferPayload } from "@/lib/calculator-transfer/payload";
import { applyTransfer } from "./apply";
import { canonicalLatex, definedName, planTransfer } from "./plan";

const REAL = { angleMode: "radians", complex: false } as const;
const stem = (text: string, serializedFunctionLines = false): StemInput => ({
  text,
  serializedFunctionLines,
});
const P = (rows: string[], extra: Record<string, unknown> = {}): TransferPayload =>
  ({
    version: 1,
    questionKey: "a1:q1",
    sourceId: "stem:1",
    description: "test",
    format: "rows",
    dependencies: [],
    rows,
    ...extra,
  }) as TransferPayload;
function seeded(rows: string[] = []): CalculatorEngine {
  const { engine } = createTestEngine();
  if (rows.length > 0)
    engine.setExpressions(rows.map((latex, i) => ({ id: String(i + 1), latex })));
  engine.clearHistory();
  return engine;
}
const latexOf = (e: CalculatorEngine) => e.getExpressions().map((r) => r.latex ?? "");
const plan = (existing: string[], rows: string[], deps: string[] = []) =>
  planTransfer({
    existing: existing.map((latex, i) => ({ id: String(i + 1), latex })),
    payload: P(rows, { dependencies: deps }),
    settings: REAL,
  });

it("TR-35, TR-36 canonicalLatex prints the parse and definedName reads RC-4 heads and RC-6 names", () => {
  const none = new Set<string>();
  expect(canonicalLatex("y = 2x + 3", none)).not.toBeNull();
  expect(canonicalLatex("y = 2x + 3", none)).toBe(canonicalLatex("y=2x+3", none));
  expect(canonicalLatex("y=2x+", none)).toBeNull();
  expect([
    definedName("f(x)=x^{2}", new Set(["f"])),
    definedName("a_{1}=2", none),
    definedName("C=8h+15", none),
    definedName("y=2x", none),
    definedName("x=5", none),
    definedName("r=5", none),
    definedName("3p+4=19", none),
  ]).toEqual(["f", "a_{1}", "C", null, null, null, null]);
});

it("TR-35 a row whose canonical LaTeX matches an existing or earlier row is not inserted again", () => {
  expect(plan(["y=x", "y=2x+3"], ["y = 2x + 3"])).toEqual({
    status: "already-present",
    focusRowId: "2",
    row: 2,
  });
  expect(plan(["y=x"], ["y=x", "y=2x"])).toEqual({
    status: "added",
    writes: [{ id: "2", latex: "y=2x" }],
    focusRowId: "1",
    rename: null,
  });
  expect(plan([""], ["y=x", "y=x"])).toEqual({
    status: "added",
    writes: [{ id: "1", latex: "y=x" }],
    focusRowId: "1",
    rename: null,
  });
});

it("TR-35 repeating a transfer reports the existing row, focuses it and adds no undo step", () => {
  const e = seeded();
  const p = P(["y=2x+3"], { description: "y = 2x + 3" });
  expect(applyTransfer(e, p, "mouse")).toEqual({
    status: "added",
    message: "Added to calculator: y = 2x + 3.",
    focusRowId: "1",
  });
  e.clearHistory();
  const focus = vi.spyOn(e, "focusExpression");
  expect(applyTransfer(e, p, "keyboard")).toEqual({
    status: "already-present",
    message: "Already in the calculator, row 1.",
    focusRowId: "1",
  });
  expect([latexOf(e), e.canUndo(), focus.mock.calls]).toEqual([["y=2x+3"], false, [["1"]]]);
});

it("TR-36 a definition that would redefine a name differently is renamed with every reference in the transfer", () => {
  expect(plan(["a=5"], ["a=2", "y=ax"])).toEqual({
    status: "renamed",
    writes: [
      { id: "2", latex: "a_{2}=2" },
      { id: "3", latex: "y=a_{2}x" },
    ],
    focusRowId: "2",
    rename: { from: "a", to: "a_{2}" },
  });
  expect(plan(["f(x)=3x"], ["f(x)=x^{2}"])).toMatchObject({
    status: "renamed",
    writes: [{ id: "2", latex: "f_{2}(x)=x^{2}" }],
  });
  expect(plan(["a=5", "a_{2}=7"], ["a=2"])).toMatchObject({
    writes: [{ id: "3", latex: "a_{3}=2" }],
  });
  expect(plan(["a=5", "y=a_{2}x"], ["a=2"])).toMatchObject({
    writes: [{ id: "3", latex: "a_{3}=2" }],
  });
  expect(plan(["x_{1}=4"], ["x_{1}=2"])).toMatchObject({
    writes: [{ id: "2", latex: "x_{2}=2" }],
    rename: { from: "x_{1}", to: "x_{2}" },
  });
  expect(plan(["a=2"], ["a=2"])).toMatchObject({ status: "already-present", row: 1 });
  expect(plan(["f(x)=3x", "f_{2}(x)=x^{2}"], ["f(x)=x^{2}"])).toMatchObject({
    status: "already-present",
    row: 2,
  });
});

it("TR-36 existing rows are never modified and the status names the rename", () => {
  const e = seeded(["f(x)=3x"]);
  const before = e.getExpressions();
  expect(applyTransfer(e, P(["f(x)=x^{2}"]), "mouse")).toEqual({
    status: "renamed",
    message: "Added as f₂ because f is already defined.",
    focusRowId: "2",
  });
  expect(e.getExpressions()[0]).toEqual(before[0]);
});

it("TR-38 one undo removes a renamed transfer, renamed definition included, and redo restores the renamed rows", () => {
  const e = seeded(["f(x)=3x"]);
  const before = e.getExpressions();
  expect(applyTransfer(e, P(["f(x)=x^{2}", "y=f(x)"]), "mouse").status).toBe("renamed");
  expect(latexOf(e)).toEqual(["f(x)=3x", "f_{2}(x)=x^{2}", "y=f_{2}(x)"]);
  e.undo();
  expect([e.getExpressions(), e.canUndo()]).toEqual([before, false]);
  e.redo();
  expect(latexOf(e)).toEqual(["f(x)=3x", "f_{2}(x)=x^{2}", "y=f_{2}(x)"]);
});

it("TR-37 a dependency is inserted first only when its name is unused, otherwise the calculator's own definition is used", () => {
  expect(plan([""], ["y=kx+1"], ["k=3"])).toEqual({
    status: "added",
    writes: [
      { id: "1", latex: "k=3" },
      { id: "2", latex: "y=kx+1" },
    ],
    focusRowId: "2",
    rename: null,
  });
  expect(plan(["k=5"], ["y=kx+1"], ["k=3"])).toMatchObject({
    writes: [{ id: "2", latex: "y=kx+1" }],
  });
  expect(plan(["y=kx"], ["y=kx+1"], ["k=3"])).toMatchObject({
    writes: [{ id: "2", latex: "y=kx+1" }],
  });
  expect(plan(["f(x)=3x"], ["g(x)=f(x)+3"], ["f(x)=x^{2}"])).toMatchObject({
    status: "added",
    writes: [{ id: "2", latex: "g(x)=f(x)+3" }],
  });
  expect(plan([""], ["g(x)=f(x)+3"], ["a=2", "f(x)=ax^{2}"])).toMatchObject({
    writes: [
      { id: "1", latex: "a=2" },
      { id: "2", latex: "f(x)=ax^{2}" },
      { id: "3", latex: "g(x)=f(x)+3" },
    ],
  });
});

it("TR-72 names, duplicates and dependencies are decided when the payload is applied, never by the classifier", () => {
  expectTypeOf(classifyStem).parameters.toEqualTypeOf<[StemInput]>();
  const item = classifyStem(stem("Let $f(x)=x^{2}$; graph $y=f(x)+1$.")).get(3);
  if (!item) throw new Error("no item");
  expect(item.payload).toMatchObject({ rows: ["y=f(x)+1"], dependencies: ["f(x)=x^{2}"] });
  const fresh = seeded();
  const busy = seeded(["f(x)=3x"]);
  applyTransfer(fresh, { ...item.payload, questionKey: "a1:q1" }, "mouse");
  applyTransfer(busy, { ...item.payload, questionKey: "a1:q1" }, "mouse");
  expect([latexOf(fresh), latexOf(busy)]).toEqual([
    ["f(x)=x^{2}", "y=f(x)+1"],
    ["f(x)=3x", "y=f(x)+1"],
  ]);
});

// Adaptation: tables and regressions arrived after the plan. Their column names, regression
// parameters and residual lists are definitions (synthetic rows of analyzeRows), so they count
// as defined and used names, and a blank table is never the empty last row the first write fills.
const TABLE: ExpressionState = {
  id: "1",
  type: "table",
  latex: "",
  columns: [
    { latex: "x_{1}", values: ["1", "2", "3"] },
    { latex: "y_{1}", values: ["2", "4", "7"] },
  ],
};
const withData =
  (...latex: string[]) =>
  (rows: string[], deps: string[] = []) =>
    planTransfer({
      existing: [TABLE, ...latex.map((l, i) => ({ id: String(i + 2), latex: l }))],
      payload: P(rows, { dependencies: deps }),
      settings: REAL,
    });

it("TR-36, TR-37 table columns and regression parameters and residuals count as defined names at apply time", () => {
  const regression = withData("y_{1}\\sim mx_{1}+b");
  expect(regression(["m=2", "y=mx"])).toEqual({
    status: "renamed",
    writes: [
      { id: "3", latex: "m_{2}=2" },
      { id: "4", latex: "y=m_{2}x" },
    ],
    focusRowId: "3",
    rename: { from: "m", to: "m_{2}" },
  });
  expect(regression(["y=mx+b"], ["m=3", "b=1"])).toMatchObject({
    status: "added",
    writes: [{ id: "3", latex: "y=mx+b" }],
  });
  expect(regression(["e_{1}=4"])).toMatchObject({
    status: "renamed",
    writes: [{ id: "3", latex: "e_{2}=4" }],
  });
  expect(withData()(["x_{1}=5"])).toMatchObject({
    status: "renamed",
    writes: [{ id: "2", latex: "x_{2}=5" }],
  });
});

it("TR-32 a transfer after a blank table appends instead of writing into the table", () => {
  const blankTable: ExpressionState = {
    id: "1",
    type: "table",
    latex: "",
    columns: [
      { latex: "x_{1}", values: [] },
      { latex: "y_{1}", values: [] },
    ],
  };
  expect(
    planTransfer({ existing: [blankTable], payload: P(["y=2x"]), settings: REAL })
  ).toMatchObject({ status: "added", writes: [{ id: "2", latex: "y=2x" }] });
});
