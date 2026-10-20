// Table regression commands (RT-25 to RT-33), each one undo step through CalculatorEngine.editRows:
// Add Regression (Linear on the first qualifying column, the next colour), the model and "for"
// pickers, Log Mode, hide, delete (with its residual column), plot residuals (a computed column
// headed e_k), Export as custom regression (the template below the table, renamed when a
// parameter name is taken) and Export to the expression list (the displayed equation). The
// eligibility and export-blocked rules are pure functions of a table's RowView.

import { columnQualifies, chooseResidualName } from "../data/table-regression";
import { TABLE_MODEL_SPECS, type TableModel } from "../../regression/table-models";
import { colourAfter } from "../../theme/roles";
import type { StoredRow, StoredTableRegression } from "./document";
import type { CalculatorEngine, EditRefusal, RowView } from "./engine";
import { normalizeColumns } from "./table-edits";

const at = (rows: readonly StoredRow[], id: string) => rows.findIndex((r) => r.id === id);

/** RT-28: which columns of a table can be regressed. */
export interface RegressionEligibility {
  /** The table may get a regression: none yet, its first column and some later column qualify. */
  canAdd: boolean;
  /** Every later column that qualifies as y, in order (the "for" picker's options). */
  candidates: number[];
}

/** RT-28: the table-level test and the qualifying y columns of `view`. */
export function regressionEligibility(view: RowView): RegressionEligibility {
  const analysis = view.table?.analysis,
    result = view.table?.result;
  if (analysis === undefined || result === null || result === undefined) {
    return { canAdd: false, candidates: [] };
  }
  const residual = analysis.regression?.residual ?? null;
  const qualifies = (j: number) => {
    const c = analysis.columns[j];
    if (c === undefined || c.error !== null) return false;
    if (j > 0 && c.role !== "data" && c.role !== "computed") return false;
    if (j === 0 && c.role !== "variable") return false;
    if (j > 0 && c.tree?.kind === "id" && c.tree.name === residual) return false;
    return columnQualifies(result.columns[j]?.values ?? []);
  };
  const candidates = analysis.columns.flatMap((_, j) => (j > 0 && qualifies(j) ? [j] : []));
  return {
    canAdd: analysis.regression === null && qualifies(0) && candidates.length > 0,
    candidates,
  };
}

/** The colour after the last one a table uses: its regression's, else its last column's. */
function nextTableColour(row: StoredRow, index: number): string {
  const last = row.regression?.color ?? row.columns?.at(-1)?.color;
  return colourAfter(last, index + 1);
}

/** The headers of the x and y columns, for the residual name (RT-25). */
function headers(row: StoredRow, y: number): string[] {
  const columns = row.columns ?? [];
  return [columns[y]?.latex ?? "", columns[0]?.latex ?? ""];
}

function withResidual(
  row: StoredRow,
  regression: Omit<StoredTableRegression, "residual">,
  used: ReadonlySet<string>
): StoredRow {
  const own = row.regression?.residual;
  const taken = new Set([...used].filter((n) => n !== own));
  const residual = chooseResidualName(undefined, headers(row, regression.y), taken);
  return { ...row, regression: { ...regression, residual } };
}

/** Applies `change` to table `tableId`'s stored row as one step; false when nothing changed. */
function editTable(
  engine: CalculatorEngine,
  tableId: string,
  change: (row: StoredRow, index: number, used: ReadonlySet<string>) => StoredRow | null
): boolean {
  let changed = false;
  engine.editRows((rows, ctx) => {
    const i = at(rows, tableId);
    if (i < 0 || rows[i].type !== "table") return null;
    const next = change(rows[i], i, ctx.used);
    if (next === null) return null;
    changed = true;
    return rows.map((r, k) => (k === i ? next : r));
  });
  return changed;
}

/** RT-28: Add Regression: Linear on column `y` (default: the first qualifying one). */
export function addTableRegression(engine: CalculatorEngine, tableId: string, y?: number): boolean {
  const view = engine.getSnapshot().rows.find((r) => r.id === tableId);
  if (view === undefined) return false;
  const { canAdd, candidates } = regressionEligibility(view);
  const column = y ?? candidates[0];
  if (!canAdd || column === undefined || !candidates.includes(column)) return false;
  return editTable(engine, tableId, (row, i, used) =>
    withResidual(
      row,
      { type: "linear", y: column, color: nextTableColour(row, i), hidden: false, logMode: false },
      used
    )
  );
}

/** RT-29: picking a model writes its type and clears the residual name, which is chosen again. */
export function setTableRegressionType(
  engine: CalculatorEngine,
  tableId: string,
  type: TableModel
): boolean {
  return editTable(engine, tableId, (row, _, used) => {
    const r = row.regression;
    if (r === undefined || r.type === type) return null;
    return withResidual(row, { ...r, type }, used);
  });
}

/** REG-MODELS-5: the "for" picker changes the y column and clears the residual name. */
export function setTableRegressionColumn(
  engine: CalculatorEngine,
  tableId: string,
  y: number
): boolean {
  return editTable(engine, tableId, (row, _, used) => {
    const r = row.regression;
    if (r === undefined || r.y === y || y < 1 || y >= (row.columns?.length ?? 0)) return null;
    return withResidual(row, { ...r, y }, used);
  });
}

/** RT-24b: the Log Mode checkbox. */
export function setTableRegressionLogMode(
  engine: CalculatorEngine,
  tableId: string,
  on: boolean
): boolean {
  return editTable(engine, tableId, (row) => {
    const r = row.regression;
    return r === undefined || r.logMode === on
      ? null
      : { ...row, regression: { ...r, logMode: on } };
  });
}

/** RT-30: the colour icon toggles `hidden`. */
export function setTableRegressionHidden(
  engine: CalculatorEngine,
  tableId: string,
  hidden: boolean
): boolean {
  return editTable(engine, tableId, (row) => {
    const r = row.regression;
    return r === undefined || r.hidden === hidden ? null : { ...row, regression: { ...r, hidden } };
  });
}

/** The index of a table's plotted residual column, or -1. */
export function residualColumnIndex(row: Pick<StoredRow, "columns" | "regression">): number {
  const name = row.regression?.residual;
  if (name === undefined) return -1;
  return (row.columns ?? []).findIndex((c, j) => j > 0 && c.latex.trim() === name);
}

/** RT-32: Delete regression removes the regression and its plotted residual column. */
export function deleteTableRegression(engine: CalculatorEngine, tableId: string): boolean {
  return editTable(engine, tableId, (row) => {
    if (row.regression === undefined) return null;
    const residual = residualColumnIndex(row);
    const columns = (row.columns ?? []).filter((_, j) => j !== residual);
    const next: StoredRow = { ...row, columns: normalizeColumns(columns) };
    delete (next as { regression?: StoredTableRegression }).regression;
    return next;
  });
}

/** RT-26: "plot" appends the residual column e_k, computed and read-only, in the next colour. */
export function plotTableResiduals(engine: CalculatorEngine, tableId: string): boolean {
  return editTable(engine, tableId, (row, i) => {
    const r = row.regression,
      columns = row.columns ?? [];
    if (r?.residual === undefined || residualColumnIndex(row) >= 0) return null;
    // Desmos writes the name into the trailing empty column when there is one.
    const blank = columns.findIndex(
      (c, j) => j > 0 && c.latex.trim() === "" && c.values.every((v) => v === "")
    );
    const color = nextTableColour(row, i);
    const column = { latex: r.residual, values: [], color, hidden: false };
    const next =
      blank >= 0
        ? columns.map((c, j) => (j === blank ? { ...c, latex: r.residual! } : c))
        : [...columns, column];
    return { ...row, columns: normalizeColumns(next) };
  });
}

/** RT-32: why a table regression cannot be exported, or null when it can. */
export type ExportBlock =
  | { kind: "coordinates" }
  | { kind: "column"; name: string }
  | { kind: "computed"; latex: string };

const SIMPLE = /^[a-zA-Z](?:_\{?[0-9a-zA-Z]+\}?)?$|^\\[a-zA-Z]+(?:_\{?[0-9a-zA-Z]+\}?)?$/;

export function exportBlock(row: Pick<StoredRow, "columns" | "regression">): ExportBlock | null {
  const r = row.regression,
    columns = row.columns ?? [];
  if (r === undefined) return null;
  const x = columns[0]?.latex.trim() ?? "",
    y = columns[r.y]?.latex.trim() ?? "";
  const coordinate = (h: string) => h === "x" || h === "y";
  if (coordinate(x) && coordinate(y)) return { kind: "coordinates" };
  if (coordinate(x)) return { kind: "column", name: x };
  if (coordinate(y)) return { kind: "column", name: y };
  if (!SIMPLE.test(x)) return { kind: "computed", latex: x };
  if (!SIMPLE.test(y)) return { kind: "computed", latex: y };
  return null;
}

export const EXPORT_BLOCK_TEXT = {
  coordinates:
    "These columns can't be referenced outside of the table. To export the regression model, first try renaming the columns.",
  column: (name: string) =>
    `Column ${name} can't be referenced outside of the table. To create a standalone regression, first try renaming that column.`,
  computedBefore:
    "The headers need to be simple identifiers to export as a custom regression. Try assigning ",
  computedAfter: " to a variable and then referencing it in the table header.",
} as const;

/** The names ordinary rows define (`m=2`, `f(x)=…`), from their latex. */
function definedNames(views: readonly RowView[]): Set<string> {
  const out = new Set<string>();
  for (const v of views) {
    if (v.type !== "expression" || v.kind === "regression") continue;
    const m = /^\s*([a-zA-Z](?:_\{?[0-9a-zA-Z]+\}?)?)\s*(?:\\left\(|\()?[^=]*?=/.exec(v.latex);
    if (m !== null && /^(definition|dependent-definition|function-definition)$/.test(v.kind)) {
      out.add(m[1].replace(/_([0-9a-zA-Z])$/, "_{$1}"));
    }
  }
  return out;
}

/**
 * RT-32: the parameter names an export uses: the template letters, or, when an ordinary row
 * defines any of them, all of them with the subscript one more than the highest in use among
 * those names (a plain name counts as −1, so a plain clash gives 0).
 */
export function exportParameterNames(params: readonly string[], defined: ReadonlySet<string>) {
  const base = (name: string) => /^([a-zA-Z])(?:_\{?([0-9]+)\}?)?$/.exec(name);
  const clash = params.some((p) => defined.has(p));
  if (!clash) return [...params];
  let highest = -1;
  for (const name of defined) {
    const m = base(name);
    if (m === null || !params.includes(m[1])) continue;
    highest = Math.max(highest, m[2] === undefined ? -1 : Number(m[2]));
  }
  return params.map((p) => `${p}_{${highest + 1}}`);
}

/** Inserts `row` right below table `tableId`; the new row's id, or null. */
function insertBelow(
  engine: CalculatorEngine,
  tableId: string,
  make: (table: StoredRow, index: number, id: () => string) => StoredRow | null
): { id: string } | EditRefusal | null {
  let made: string | null = null;
  const refusal = engine.editRows((rows, ctx) => {
    const i = at(rows, tableId);
    if (i < 0) return null;
    const row = make(rows[i], i, ctx.nextId);
    if (row === null) return null;
    made = row.id;
    return [...rows.slice(0, i + 1), row, ...rows.slice(i + 1)];
  });
  return refusal ?? (made === null ? null : { id: made });
}

/** RT-32: Export as custom regression: the template latex only, below the table. */
export function exportCustomRegression(
  engine: CalculatorEngine,
  tableId: string
): { id: string } | EditRefusal | null {
  const defined = definedNames(engine.getSnapshot().rows);
  return insertBelow(engine, tableId, (table, index, id) => {
    const r = table.regression;
    if (r === undefined || exportBlock(table) !== null) return null;
    const columns = table.columns ?? [];
    const spec = TABLE_MODEL_SPECS[r.type];
    const names = exportParameterNames(spec.params, defined);
    const latex = spec.template(columns[0].latex.trim(), columns[r.y].latex.trim(), names);
    return { id: id(), latex, color: colourAfter(r.color, index + 1), hidden: false };
  });
}

/** RT-32: Export to the expression list: the displayed equation, at the table's index + 1. */
export function exportRegressionEquation(
  engine: CalculatorEngine,
  tableId: string
): { id: string } | EditRefusal | null {
  const view = engine.getSnapshot().rows.find((r) => r.id === tableId);
  const fit = view?.table?.result?.regression?.fit;
  if (fit === undefined || !fit.ok) return null;
  return insertBelow(engine, tableId, (table, index, id) => {
    const r = table.regression;
    if (r === undefined) return null;
    return { id: id(), latex: fit.equation, color: colourAfter(r.color, index + 1), hidden: false };
  });
}
