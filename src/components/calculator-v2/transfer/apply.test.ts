import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { analyzeRows } from "@/lib/calculator-v2/core/analysis/index";
import { createTestEngine } from "@/lib/calculator-v2/core/api/__fixtures__/test-engine";
import { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import type { RowKind } from "@/lib/calculator-v2/core/corpus/types";
import { classifyStem, type StemInput } from "@/lib/calculator-transfer/classify";
import type { TransferPayload } from "@/lib/calculator-transfer/payload";
import { applyTransfer, transferPayloadSchema } from "./apply";

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
const analysed = (e: CalculatorEngine) =>
  analyzeRows(
    e.getExpressions().map((r) => ({ id: r.id, latex: r.latex ?? "", hidden: r.hidden ?? false })),
    REAL
  );

const REJECTED = {
  status: "rejected",
  message: "This can't be added to the calculator.",
  focusRowId: null,
};

it("AR-16 transferPayloadSchema accepts the AR-16 shape and refuses anything else", () => {
  expect(transferPayloadSchema.safeParse(P(["y=x"])).success).toBe(true);
  expect(
    transferPayloadSchema.safeParse({
      ...P([]),
      format: "table",
      rows: undefined,
      table: { headers: ["x", null], columns: [["1"], ["2"]] },
    }).success
  ).toBe(true);
  const noDependencies = {
    version: 1,
    questionKey: "a1:q1",
    sourceId: "stem:1",
    description: "d",
    format: "rows",
    rows: ["y=x"],
  };
  for (const bad of [
    null,
    "y=x",
    noDependencies,
    { ...P(["y=x"]), version: 2 },
    { ...P(["y=x"]), extra: 1 },
    { ...P(["y=x"]), rows: [1] },
    { ...P(["y=x"]), format: "graph" },
    { ...P(["y=x"]), questionKey: 3 },
  ])
    expect(transferPayloadSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
  expect(readFileSync("src/components/calculator-v2/transfer/apply.ts", "utf8")).toMatch(
    /import \{ z \} from "zod";/
  );
});

it("AR-16 an invalid payload changes nothing and is rejected with the table 11.1 message", () => {
  const e = seeded(["y=x"]);
  e.updateSettings({ expressionsCollapsed: true });
  const before = [e.getExpressions(), e.settings, e.canUndo()];
  for (const bad of [{}, { ...P(["y=2x"]), version: 2 }, P(["y=2x"], { format: "point" })])
    expect(applyTransfer(e, bad, "mouse")).toEqual(REJECTED);
  expect([e.getExpressions(), e.settings, e.canUndo()]).toEqual(before);
});

it("TR-71 apply uses only the TransferTarget members of the public API and focuses by trigger", () => {
  const e = seeded();
  const touched = new Set<string>();
  const target = new Proxy(e, {
    get(obj, key) {
      touched.add(String(key));
      const v = Reflect.get(obj, key); // no receiver: getters run on the engine, so #private fields work
      return typeof v === "function" ? v.bind(obj) : v;
    },
  });
  const focus = vi.spyOn(e, "focusExpression");
  const activate = vi.spyOn(e, "activateExpression");
  expect(applyTransfer(target, P(["y=2x"]), "mouse")).toMatchObject({
    status: "added",
    focusRowId: "1",
  });
  expect(focus).toHaveBeenLastCalledWith("1");
  expect(applyTransfer(target, P(["y=3x"]), "keyboard")).toMatchObject({ focusRowId: "2" });
  expect(focus).toHaveBeenLastCalledWith("2");
  expect(applyTransfer(target, P(["y=4x"]), "touch")).toMatchObject({ focusRowId: "3" });
  expect([activate.mock.calls, focus.mock.calls.length]).toEqual([[["3"]], 2]);
  expect(
    [...touched].filter(
      (k) =>
        ![
          "getExpressions",
          "setExpressions",
          "updateSettings",
          "focusExpression",
          "activateExpression",
          "settings",
          "graphpaperBounds", // TR-39: read, and setMathBounds called, only when points are added
          "setMathBounds",
          "editRows", // a point-table append (plan-points.ts)
        ].includes(k)
    )
  ).toEqual([]);
});

it("TR-71 no public API method transfers", () => {
  expect(
    Object.getOwnPropertyNames(CalculatorEngine.prototype).filter((n) => /transfer/i.test(n))
  ).toEqual([]);
  expect(readFileSync("src/components/calculator-v2/KarmanCalculator.ts", "utf8")).not.toMatch(
    /^\s+(?:public\s+)?\w*[tT]ransfer\w*\s*\(/m
  );
});

it("TR-73 a payload whose rows would error, or that would make an existing row error, inserts nothing", () => {
  const e = seeded(["a=b"]);
  for (const rows of [["y=x+"], ["b=a"], ["x+y"], ["y=2x", "\\frac{"]]) {
    expect(applyTransfer(e, P(rows), "mouse")).toEqual(REJECTED);
    expect([latexOf(e), e.canUndo()]).toEqual([["a=b"], false]);
  }
});

it("TR-73 an existing row that already errors does not block a transfer; only an error the transfer causes does", () => {
  const e = seeded(["x+y"]); // mixed-variables before the transfer
  expect(applyTransfer(e, P(["y=2x"]), "mouse").status).toBe("added");
  expect(latexOf(e)).toEqual(["x+y", "y=2x"]);
  expect(analysed(e).rows.map((r) => r.error?.code ?? null)).toEqual(["mixed-variables", null]);
});

it("TR-73, NM-42 a transfer past the row or character limit inserts nothing", () => {
  const full = seeded(Array.from({ length: 100 }, () => "1"));
  expect(applyTransfer(full, P(["y=x"]), "mouse")).toEqual(REJECTED);
  expect(full.getExpressions()).toHaveLength(100);
  const lastEmpty = seeded([...Array.from({ length: 99 }, () => "1"), ""]);
  expect(applyTransfer(lastEmpty, P(["y=x"]), "mouse").status).toBe("added");
  expect(lastEmpty.getExpressions()).toHaveLength(100);
  const e = seeded();
  expect(applyTransfer(e, P(["1".repeat(2049)]), "mouse")).toEqual(REJECTED);
  expect(applyTransfer(e, P(["1".repeat(2048)]), "mouse").status).toBe("added");
});

it("TR-26 each expression, equation, inequality or function becomes one row of its normalised LaTeX with its RC- kind", () => {
  const cases: [string, string, RowKind, string[]][] = [
    ["Graph $y=2x+3$.", "y=2x+3", "curve-y", []],
    ["Find $\\sqrt{50}$.", "\\sqrt{50}", "value", []],
    ["If $P(t)=500(1.03)^{t}$", "P(t)=500(1.03)^{t}", "function-definition", []],
    ["Shade $y>2x+1$.", "y>2x+1", "region", []],
    ["Shade $-2<x\\le5$.", "-2<x\\le5", "region", []],
    ["Use $y\\geq 2x$.", "y\\ge2x", "region", []],
    ["Solve $3p+4>19$.", "3p+4>19", "unsolved-relation", ["p"]],
    ["Is $3>2$?", "3>2", "constant-relation", []],
  ];
  for (const [text, row, kind, chips] of cases) {
    const item = [...classifyStem(stem(text)).values()][0];
    const e = seeded();
    expect(applyTransfer(e, { ...item.payload, questionKey: "a1:q1" }, "mouse").status, text).toBe(
      "added"
    );
    expect(latexOf(e), text).toEqual([row]);
    expect([analysed(e).rows[0].kind, analysed(e).rows[0].chips], text).toEqual([kind, chips]);
  }
});

it("TR-27 a system becomes one row per line, consecutive and in source order", () => {
  const item = classifyStem(
    stem("Solve $\\begin{cases}y=2x\\\\y\\ge x^{2}\\\\x<3\\end{cases}$.")
  ).get(1);
  if (!item) throw new Error("no system item");
  const e = seeded(["y=5", ""]);
  expect(applyTransfer(e, { ...item.payload, questionKey: "a1:q1" }, "mouse")).toMatchObject({
    status: "added",
    focusRowId: "2",
  });
  expect(e.getExpressions().map((r) => [r.id, r.latex])).toEqual([
    ["1", "y=5"],
    ["2", "y=2x"],
    ["3", "y\\ge x^{2}"],
    ["4", "x<3"],
  ]);
});

it("TR-32 the first row fills an empty last row, the rest append, a collapsed list expands and nothing else changes", () => {
  const e = seeded(["y=x", "a=2"]);
  e.updateSettings({ expressionsCollapsed: true, angleMode: "degrees" });
  const before = e.getExpressions();
  const settings = e.settings;
  const viewport = e.getState().viewport;
  applyTransfer(e, P(["y=2x", "y=3x"]), "mouse");
  expect(e.getExpressions().slice(0, 2)).toEqual(before);
  expect(latexOf(e)).toEqual(["y=x", "a=2", "y=2x", "y=3x"]);
  expect(e.settings).toEqual({ ...settings, expressionsCollapsed: false });
  expect(e.getState().viewport).toEqual(viewport);
  const blank = seeded();
  applyTransfer(blank, P(["y=2x"]), "mouse");
  expect(blank.getExpressions().map((r) => [r.id, r.latex])).toEqual([["1", "y=2x"]]);
});

it("TR-38 one transfer is one undo step that removes everything it added and keeps the view", () => {
  const e = seeded(["y=x", ""]);
  const before = e.getExpressions();
  const viewport = e.getState().viewport;
  expect(applyTransfer(e, P(["y=2x", "y=3x"], { dependencies: ["k=3"] }), "mouse")).toMatchObject({
    focusRowId: "3",
  });
  expect(latexOf(e)).toEqual(["y=x", "k=3", "y=2x", "y=3x"]);
  e.undo();
  expect([e.getExpressions(), e.canUndo(), e.getState().viewport]).toEqual([
    before,
    false,
    viewport,
  ]);
  e.redo();
  expect(latexOf(e)).toEqual(["y=x", "k=3", "y=2x", "y=3x"]);
});

it("PR-44 transferred inequalities and system lines are shaded regions, 3p+4>19 is unsolved with a chip, circles are implicit", () => {
  const e = seeded();
  for (const text of [
    "$y>2x+1$",
    "$-2<x\\le5$",
    "$\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}$",
    "$3p+4>19$",
    "$(x-2)^2+(y+1)^2=9$",
  ]) {
    const item = classifyStem(stem(text)).get(0);
    if (!item) throw new Error(text);
    applyTransfer(e, { ...item.payload, questionKey: "a1:q1" }, "mouse");
  }
  expect(analysed(e).rows.map((r) => [r.kind, r.graph?.kind ?? null, r.chips])).toEqual([
    ["region", "region", []],
    ["region", "region", []],
    ["region", "region", []],
    ["region", "region", []],
    ["unsolved-relation", null, ["p"]],
    ["implicit", "implicit", []],
  ]);
});
