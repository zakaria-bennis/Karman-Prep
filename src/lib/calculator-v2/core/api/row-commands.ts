// Row commands built on CalculatorEngine.editRows, each one undo step (D-20): Create table (D-13),
// Log mode (D-30), Plot residuals (D-33) and Add regression (D-3, K-8). Kept apart from the
// engine so it stays a list of primitives.

import type { CalculatorEngine, EditRefusal } from "./engine";
import type { StoredRow } from "./document";
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
  const view = engine.getSnapshot().rows.find((r) => r.id === rowId);
  const fit = view?.regression?.analysis;
  if (view === undefined || fit === undefined || fit.observed.kind !== "id") return null;
  const observed = fit.observed.name;
  const source = engine
    .getSnapshot()
    .rows.find((r) => r.type === "table" && r.columns?.some((c) => c.latex === observed));
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

/** D-23: m and b, or m_k and b_k for the lowest k at which neither is in use. */
function freeLinearNames(used: ReadonlySet<string>): [string, string] {
  if (!used.has("m") && !used.has("b")) return ["m", "b"];
  for (let k = 1; ; k++) {
    const names: [string, string] = [`m_{${k}}`, `b_{${k}}`];
    if (!names.some((n) => used.has(n))) return names;
  }
}

/**
 * D-3, K-8: Add regression inserts `y ~ m x + b` below table `tableId`, written with its first
 * column and column `column` (the first data column by default), already fitted by the next
 * values pass. The new row's id, or null when the table has no such columns.
 */
export function insertRegressionBelow(
  engine: CalculatorEngine,
  tableId: string,
  column = 1
): { id: string } | EditRefusal | null {
  let made: string | null = null;
  const refusal = engine.editRows((rows, ctx) => {
    const i = at(rows, tableId);
    const columns = rows[i]?.columns ?? [];
    if (i < 0 || column < 1 || column >= columns.length) return null;
    const x = columns[0].latex.trim(),
      y = columns[column].latex.trim();
    if (x === "" || y === "") return null;
    const [m, b] = freeLinearNames(ctx.used);
    const row: StoredRow = {
      id: ctx.nextId(),
      latex: `${y}\\sim ${m}${x}+${b}`,
      color: nextColour(columns[column].color, i + 1),
      hidden: false,
    };
    made = row.id;
    return [...rows.slice(0, i + 1), row, ...rows.slice(i + 1)];
  });
  return refusal ?? (made === null ? null : { id: made });
}
