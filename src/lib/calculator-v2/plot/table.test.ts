import { expect, it } from "vitest";
import { analyzeRows, type RowSource } from "../core/analysis/index";
import type { TableResult } from "../core/data/evaluate";
import { NO_DEADLINE } from "../core/deadline";
import { evaluateRows } from "../core/eval/compile";
import { plotTable } from "./table";

const SETTINGS = { angleMode: "radians" as const, complex: false };
function geometry(columns: { latex: string; values: string[]; hidden?: boolean }[]) {
  const source: RowSource = { id: "t", latex: "", hidden: false, columns };
  const analysis = analyzeRows([source], SETTINGS);
  let result: TableResult | null = null;
  evaluateRows(analysis, SETTINGS, () => NO_DEADLINE, {
    table: (_, t) => (result = t),
    regression: () => undefined,
  });
  return plotTable("t", analysis.byId.get("t")!.table!, result!);
}
const series = (g: ReturnType<typeof plotTable>) => g.series.map((s) => [s.column, [...s.coords]]);

it("D-11 every later visible column plots against the first, skipping pairs with an undefined value", () => {
  const g = geometry([
    { latex: "x_{1}", values: ["1", "2", "", "4"] },
    { latex: "y_{1}", values: ["3", "", "5", "6"] },
    { latex: "x_{1}^{2}", values: [] },
  ]);
  expect(g.kind).toBe("table");
  expect(series(g)).toEqual([
    [1, [1, 3, 4, 6]],
    [2, [1, 1, 2, 4, 4, 16]],
  ]);
});

it("D-11 a hidden or empty-header column is not plotted and keeps its data", () => {
  const g = geometry([
    { latex: "x_{1}", values: ["1", "2"] },
    { latex: "y_{1}", values: ["3", "4"], hidden: true },
    { latex: "", values: ["5", "6"] },
    { latex: "y_{2}", values: ["7", "8"] },
  ]);
  expect(series(g)).toEqual([[3, [1, 7, 2, 8]]]);
});
