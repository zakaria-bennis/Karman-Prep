import { expect, it } from "vitest";
import { createTestEngine } from "@/lib/calculator/core/api/__fixtures__/test-engine";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { ExpressionState } from "@/lib/calculator/core/api/types";
import { fitPoints } from "@/lib/calculator/core/data/fit-view";
import type { Viewport } from "@/lib/calculator/plot/viewport";
import type { TransferPayload } from "@/lib/calculator-transfer/payload";
import { applyTransfer } from "./apply";

function seeded(rows: ExpressionState[] = []): CalculatorEngine {
  const { engine } = createTestEngine();
  if (rows.length > 0) engine.setExpressions(rows);
  engine.clearHistory();
  return engine;
}
const base = { version: 1 as const, questionKey: "a1:q1", dependencies: [] as string[] };
const tableRow = (pairs: [string, string][], key = "points", sourceId = "stem:1") =>
  ({
    ...base,
    sourceId,
    description: "pairs",
    format: "tableRow",
    pairs,
    pointTableKey: key,
  }) as TransferPayload;
const point = (rows: string[]) =>
  ({ ...base, sourceId: "stem:2", description: "point", format: "point", rows }) as TransferPayload;
const table = (columns: string[][], sourceId = "table") =>
  ({
    ...base,
    sourceId,
    description: "table",
    format: "table",
    table: { headers: columns.map(() => null), columns },
  }) as TransferPayload;
const tables = (e: CalculatorEngine) =>
  e
    .getExpressions()
    .filter((r) => r.type === "table")
    .map((r) => [r.id, ...(r.columns ?? []).map((c) => [c.latex, ...c.values].join(" "))]);
const bounds = (e: CalculatorEngine): Viewport => e.graphpaperBounds.mathCoordinates;
const inside = (v: Viewport, [x, y]: [number, number]) =>
  x >= v.left && x <= v.right && y >= v.bottom && y <= v.top;

it("TR-34 Table row appends to the source's point table and creates it on first use", () => {
  const e = seeded([{ id: "1", latex: "y=x" }]);
  // first use: a two-column point table named by TR-25, after the existing rows
  expect(applyTransfer(e, tableRow([["1", "2"]]), "mouse")).toEqual({
    status: "added",
    message: "Added to table x₁, y₁, row 1.",
    focusRowId: "2",
  });
  // the same source key appends, skipping a pair already in the table (TR-35)
  expect(
    applyTransfer(
      e,
      tableRow([
        ["1", "2"],
        ["3", "\\frac{1}{2}"],
      ]),
      "mouse"
    )
  ).toEqual({ status: "added", message: "Added to table x₁, y₁, row 2.", focusRowId: "2" });
  expect(applyTransfer(e, tableRow([["3", "\\frac{1}{2}"]]), "keyboard")).toEqual({
    status: "already-present",
    message: "Already in the calculator, row 2.",
    focusRowId: "2",
  });
  // a function's point table is its own, keyed by the function name
  applyTransfer(e, tableRow([["2", "5"]], "f", "stem:4"), "mouse");
  applyTransfer(e, tableRow([["4", "9"]], "f", "stem:5"), "mouse");
  // a question table never receives points, and a point never goes into one
  applyTransfer(
    e,
    table([
      ["0", "1"],
      ["5", "6"],
    ]),
    "mouse"
  );
  applyTransfer(e, tableRow([["7", "8"]]), "mouse");
  expect(tables(e)).toEqual([
    ["2", "x_{1} 1 3 7", "y_{1} 2 \\frac{1}{2} 8"],
    ["3", "x_{2} 2 4", "y_{2} 5 9"],
    ["4", "x_{3} 0 1", "y_{3} 5 6"],
  ]);
  // each append is one undo step that keeps the table and its column styles
  e.setColumnStyle("2", 1, { lines: true, pointStyle: "cross" });
  applyTransfer(e, tableRow([["9", "9"]]), "mouse");
  const styled = e.getSnapshot().rows.find((r) => r.id === "2")?.columns?.[1];
  expect([styled?.lines, styled?.pointStyle, styled?.values.at(-1)]).toEqual([true, "cross", "9"]);
  e.undo();
  expect(tables(e)[0]).toEqual(["2", "x_{1} 1 3 7", "y_{1} 2 \\frac{1}{2} 8"]);
  // a point table edited to three columns, or deleted, is replaced by a new one
  e.editHeader("2", 2, "y_{9}", "api");
  applyTransfer(e, tableRow([["5", "5"]]), "mouse");
  expect(tables(e).at(-1)).toEqual(["5", "x_{4} 5", "y_{4} 5"]);
  e.removeExpression({ id: "5" });
  applyTransfer(e, tableRow([["6", "6"]]), "mouse");
  expect(tables(e).at(-1)).toEqual(["5", "x_{4} 6", "y_{4} 6"]);
});

it("TR-34 a question table that takes a freed point-table id never receives Table row pairs", () => {
  const free = {
    undo: (e: CalculatorEngine) => e.undo(),
    delete: (e: CalculatorEngine) => e.removeExpression({ id: "2" }),
  };
  for (const [how, gone] of Object.entries(free)) {
    const e = seeded([{ id: "1", latex: "y=x" }]);
    applyTransfer(e, tableRow([["1", "2"]]), "mouse"); // the point table: id 2, x₁ and y₁
    gone(e); // its id and names are free again (TR-32, D-4)
    applyTransfer(
      e,
      table([
        ["0", "1"],
        ["5", "6"],
      ]),
      "mouse"
    ); // the question table lands on id 2 with x₁ and y₁
    expect(applyTransfer(e, tableRow([["7", "8"]]), "mouse"), how).toEqual({
      status: "added",
      message: "Added to table x₂, y₂, row 1.",
      focusRowId: "3",
    });
    expect(tables(e), how).toEqual([
      ["2", "x_{1} 0 1", "y_{1} 5 6"],
      ["3", "x_{2} 7", "y_{2} 8"],
    ]);
  }
});

it("TR-29, TR-35 Point inserts one (a,b) row per pair and never repeats one; non-point rows are refused", () => {
  const e = seeded();
  expect(applyTransfer(e, point(["(1,2)", "(3,4)"]), "mouse")).toMatchObject({
    status: "added",
    focusRowId: "1",
  });
  expect(applyTransfer(e, point(["(1,2)"]), "mouse")).toMatchObject({
    status: "already-present",
  });
  expect(e.getExpressions().map((r) => r.latex)).toEqual(["(1,2)", "(3,4)"]);
  for (const rows of [["y=2x"], ["(x,2)"], ["5"]])
    expect(applyTransfer(e, point(rows), "mouse").status, rows[0]).toBe("rejected");
});

it("TR-39, D-17 a table transfer fits the view only when no point is visible", () => {
  // D-40's table: every point is far outside the default view, so the view fits them (D-16)
  const e = seeded();
  const start = bounds(e);
  applyTransfer(
    e,
    table([
      ["1990", "2000", "2010", "2020"],
      ["30000", "36000", "42000", "48000"],
    ]),
    "mouse"
  );
  const pts: [number, number][] = [
    [1990, 30000],
    [2000, 36000],
    [2010, 42000],
    [2020, 48000],
  ];
  expect(bounds(e)).toEqual(fitPoints([Float64Array.from(pts.flat())]));
  expect(pts.every((p) => inside(bounds(e), p))).toBe(true);
  // one visible point leaves the view as it is, for tables, point rows and point-table rows
  const visible = seeded();
  for (const payload of [
    table([
      ["1", "500"],
      ["1", "500"],
    ]),
    point(["(2,2)", "(400,400)"]),
    tableRow([
      ["3", "3"],
      ["900", "900"],
    ]),
  ]) {
    applyTransfer(visible, payload, "mouse");
    expect(bounds(visible), payload.format).toEqual(start);
  }
  // a point row or a point-table row wholly outside the view fits it, fractions and π included
  const far = seeded();
  applyTransfer(far, point(["(\\frac{1}{2}\\cdot100,60)"]), "mouse");
  expect(inside(bounds(far), [50, 60])).toBe(true);
  applyTransfer(far, tableRow([["-500", "\\pi"]]), "mouse");
  expect(inside(bounds(far), [-500, Math.PI])).toBe(true);
  // a one-variable table plots no points, and an expression transfer never moves the view
  const still = seeded();
  applyTransfer(still, table([["800", "900"]]), "mouse");
  applyTransfer(still, { ...point(["y=500"]), format: "rows" }, "mouse");
  expect(bounds(still)).toEqual(start);
  // the fit is not an undo step: undo removes the table and keeps the fitted view
  const fitted = bounds(e);
  e.undo();
  expect([e.getExpressions().length, bounds(e)]).toEqual([1, fitted]);
});

it("D-18 a transferred table is editable and removed by the per-question reset", () => {
  const e = seeded();
  applyTransfer(
    e,
    table([
      ["1", "2", "3"],
      ["2", "4", "6"],
    ]),
    "mouse"
  );
  // cells, headers and rows edit like a typed table's, and it feeds regressions
  expect(e.editCell("1", 1, 0, "3", "api")).toBeNull();
  e.deleteTableRow("1", 2);
  expect(e.editHeader("1", 1, "y_{5}", "api")).toBeNull();
  e.setExpression({ id: "2", latex: "y_{5}\\sim mx_{1}+b" });
  const rows = e.getSnapshot().rows;
  expect(rows[0].columns?.map((c) => [c.latex, ...c.values])).toEqual([
    ["x_{1}", "1", "2"],
    ["y_{5}", "3", "4"],
  ]);
  expect(rows[0].table?.analysis.columns.map((c) => c.role)).toEqual(["variable", "data"]);
  expect(rows[1].latex).toBe("y_{5}\\sim mx_{1}+b");
  // the per-question reset (setBlank, R10) removes it and restores the default view
  applyTransfer(e, tableRow([["700", "700"]]), "mouse");
  e.setBlank();
  expect(e.getExpressions().map((r) => [r.type, r.latex])).toEqual([["expression", ""]]);
  expect(bounds(e)).toEqual(bounds(seeded()));
  // the point table went with it: the next Table row creates a new one
  applyTransfer(e, tableRow([["1", "1"]]), "mouse");
  expect(tables(e)).toEqual([["1", "x_{1} 1", "y_{1} 1"]]);
});
