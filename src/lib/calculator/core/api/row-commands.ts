// Row commands built on CalculatorEngine.editRows, each one undo step (D-20): Create table (D-13),
// Log mode (D-30) and Plot residuals (D-33). Kept apart from the
// engine so it stays a list of primitives.

import type { CalculatorEngine, EditRefusal, RowView } from "./engine";
import { collectNameUses } from "../analysis/names";
import type { RegressionAnalysis } from "../data/regression-analysis";
import type { StoredRow } from "./document";
import { functionDefinitionHead } from "../latex/index";
import { nextTableNames } from "../data/naming";
import { pointTableCells } from "../data/table-from-points";
import { nextColour, tableFromRow, withHeader, withColumnStyle } from "./table-edits";

const at = (rows: readonly StoredRow[], id: string) => rows.findIndex((r) => r.id === id);

/** D-13: a table of row `rowId`'s function below it; null when the row has none. */
export function createTableFromRow(
  engine: CalculatorEngine,
  rowId: string
): { id: string } | EditRefusal | null {
  let made: string | null = null;
  const refusal = engine.editRows((rows, ctx) => {
    const i = at(rows, rowId);
    const table = i < 0 ? null : tableFromRow(rows[i], rows, ctx.nextId, ctx.used);
    if (table === null) return null;
    made = table.id;
    return [...rows.slice(0, i + 1), table, ...rows.slice(i + 1)];
  });
  return refusal ?? (made === null ? null : { id: made });
}

/**
 * RT-26 (REG-CUSTOM-15): the table a typed regression's residuals plot into: the first table whose
 * first header is a plain name the model reads (`z_1\sim my_1+b` over x₁, y₁, z₁ has none).
 */
export function residualTable(
  rows: readonly RowView[],
  fit: Pick<RegressionAnalysis, "model">
): RowView | undefined {
  const reads = new Set(collectNameUses(fit.model).map((u) => u.name));
  return rows.find((r) => r.type === "table" && reads.has(r.columns?.[0]?.latex.trim() ?? ""));
}

/** RT-10: the x and y cells Convert to Table would write for row `rowId`, or null. */
export function pointListCells(
  engine: CalculatorEngine,
  rowId: string
): { xs: string[]; ys: string[] } | null {
  const rows = engine.getSnapshot().rows;
  const view = rows.find((r) => r.id === rowId);
  if (view === undefined || view.type === "table") return null;
  const functions = new Set(rows.flatMap((r) => functionDefinitionHead(r.latex)?.name ?? []));
  return pointTableCells(view.latex, view.value, functions);
}

/**
 * RT-10: Convert to Table replaces a point-list row, in place and under its id, by a table of its
 * coordinates: x_n in the next colour, y_n in the row's colour. One undo step.
 */
export function convertPointsToTable(
  engine: CalculatorEngine,
  rowId: string
): { id: string } | EditRefusal | null {
  const cells = pointListCells(engine, rowId);
  if (cells === null) return null;
  let made = false;
  const refusal = engine.editRows((rows, ctx) => {
    const i = at(rows, rowId);
    if (i < 0) return null;
    const row = rows[i];
    const names = nextTableNames(ctx.used, 1);
    const table: StoredRow = {
      id: row.id,
      latex: "",
      color: row.color,
      hidden: row.hidden,
      type: "table",
      columns: [
        { latex: names.x, values: cells.xs, color: nextColour(row.color, i), hidden: false },
        { latex: names.ys[0], values: cells.ys, color: row.color, hidden: false },
      ],
    };
    made = true;
    return rows.map((r, k) => (k === i ? table : r));
  });
  return refusal ?? (made ? { id: rowId } : null);
}

/** D-30: a regression row's Log mode checkbox. */
export function setLogMode(engine: CalculatorEngine, rowId: string, on: boolean): void {
  engine.editRows((rows) => {
    const i = at(rows, rowId);
    if (i < 0 || (rows[i].logMode === true) === on) return null;
    return rows.map((r, k) => (k === i ? { ...r, logMode: on } : r));
  });
}

/**
 * D-33: Plot residuals adds the regression's residual list e_k as a computed column of the table
 * its observations come from, in the palette colour after the regression's. The table's id, or
 * null when the observations are not a table column or the column is already there.
 */
export function plotResiduals(engine: CalculatorEngine, rowId: string): string | null {
  const rows = engine.getSnapshot().rows;
  const view = rows.find((r) => r.id === rowId);
  const fit = view?.regression?.analysis;
  if (view === undefined || fit === undefined) return null;
  const source = residualTable(rows, fit);
  if (source === undefined || source.columns!.some((c) => c.latex === fit.residual)) return null;
  engine.editRows((rows) => {
    const i = at(rows, source.id);
    if (i < 0) return null;
    const column = rows[i].columns?.length ?? 0;
    const added = withHeader(rows[i], column, fit.residual);
    if (typeof added === "string") return null;
    const colour = nextColour(view.color, at(rows, rowId));
    const styled = withColumnStyle(added, column, { color: colour });
    return rows.map((r, k) => (k === i ? styled : r));
  });
  return source.id;
}
