// Pure edits of table rows (D-4, D-5, D-8, D-9, D-12): new tables named by D-4, cell and header
// edits within the D-6, D-8 and D-9 limits, row deletion and column styles. Every table keeps its
// columns the same length, with trailing all-blank rows trimmed, so the one blank row a table
// shows (D-5) is never stored. Package-internal.

import { colourAfter, nextSlot } from "../../theme/roles";
import type { AnalysisResult } from "../analysis";
import { nextTableNames } from "../data/naming";
import { tableHeaderFor } from "../data/table-from-row";
import { functionDefinitionHead } from "../latex/index";
import {
  MAX_CELL_CHARACTERS,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_ROWS,
  type StoredColumn,
  type StoredRow,
} from "./document";
import type { EditRefusal } from "./engine";

/** What CalculatorEngine.editRows hands an edit: fresh row ids and the D-4 names in use. */
export interface RowEditContext {
  nextId(): string; // consumes an id: call it only for a row that is kept
  used: ReadonlySet<string>;
}

/** D-4: every name a row defines or references, and every table header. */
export function usedNames(rows: readonly StoredRow[], analysis: AnalysisResult): Set<string> {
  const used = new Set<string>();
  for (const row of analysis.byId.values()) {
    if (row.defines !== null) used.add(row.defines.name);
    for (const name of row.uses) used.add(name);
    if (row.regression) used.add(row.regression.residual); // RT-25: a typed regression's e_k
  }
  for (const row of rows) for (const c of row.columns ?? []) used.add(c.latex);
  return used;
}

/** D-5: a two-column table x_n, y_n with no data rows, coloured as a row at `index` (TH-10). */
export function newTable(id: string, index: number, used: ReadonlySet<string>): StoredRow {
  const names = nextTableNames(used, 1),
    color = nextSlot(index);
  const column = (latex: string): StoredColumn => ({ latex, values: [], color, hidden: false });
  return {
    id,
    latex: "",
    color,
    hidden: false,
    type: "table",
    columns: [column(names.x), column(names.ys[0])],
  };
}

/** Pads every column to the longest and trims trailing rows that are blank in every column. */
export function normalizeColumns(columns: readonly StoredColumn[]): StoredColumn[] {
  let length = Math.max(0, ...columns.map((c) => c.values.length));
  while (length > 0 && columns.every((c) => (c.values[length - 1] ?? "") === "")) length--;
  return columns.map((c) => ({
    ...c,
    values: Array.from({ length }, (_, k) => c.values[k] ?? ""),
  }));
}

/** D-6, D-8: cell (column, row) set to `latex`; the row may be the blank row after the data. */
export function withCell(
  row: StoredRow,
  column: number,
  r: number,
  latex: string
): StoredRow | EditRefusal {
  const columns = row.columns ?? [];
  if (latex.length > MAX_CELL_CHARACTERS) return "char-limit";
  if (r < 0 || r >= MAX_TABLE_ROWS || column < 0 || column >= columns.length) return "row-limit";
  const next = columns.map((c, j) => {
    if (j !== column) return c;
    const values = [...c.values];
    while (values.length <= r) values.push("");
    values[r] = latex;
    return { ...c, values };
  });
  return { ...row, columns: normalizeColumns(next) };
}

/** D-9: header `column` set to `latex`; one past the last column adds a column (at most 10). */
export function withHeader(row: StoredRow, column: number, latex: string): StoredRow | EditRefusal {
  const columns = row.columns ?? [];
  if (latex.length > MAX_CELL_CHARACTERS) return "char-limit";
  if (column === columns.length) {
    if (columns.length >= MAX_TABLE_COLUMNS) return "row-limit";
    const color = nextColour(columns.at(-1)?.color, columns.length);
    const added: StoredColumn = { latex, values: [], color, hidden: false };
    return { ...row, columns: normalizeColumns([...columns, added]) };
  }
  if (column < 0 || column > columns.length) return "row-limit";
  return { ...row, columns: columns.map((c, j) => (j === column ? { ...c, latex } : c)) };
}

/**
 * The colour after `color` in F-A1's new-row cycle ("c2" after "c1", red after black), or
 * `nextSlot(fallback)` for an explicit colour outside the cycle.
 */
export function nextColour(color: string | undefined, fallback: number): string {
  return colourAfter(color, fallback);
}

/** D-8: data row `r` removed from every column. */
export function withoutTableRow(row: StoredRow, r: number): StoredRow {
  const columns = (row.columns ?? []).map((c) => ({
    ...c,
    values: c.values.filter((_, k) => k !== r),
  }));
  return { ...row, columns: normalizeColumns(columns) };
}

/** D-13: the table Create table inserts below `row`, or null when the row has no function. */
export function tableFromRow(
  row: StoredRow,
  rows: readonly StoredRow[],
  nextId: () => string, // called only when a table is made
  used: ReadonlySet<string>
): StoredRow | null {
  const functions = new Set(rows.flatMap((r) => functionDefinitionHead(r.latex)?.name ?? []));
  const header = row.type === "table" ? null : tableHeaderFor(row.latex, functions);
  if (header === null) return null;
  const x = nextTableNames(used, 1).x;
  const column = (latex: string, values: string[]): StoredColumn => ({
    latex,
    values,
    color: row.color,
    hidden: false,
  });
  return {
    id: nextId(),
    latex: "",
    color: row.color,
    hidden: false,
    type: "table",
    columns: [column(x, ["-2", "-1", "0", "1", "2"]), column(header(x), [])],
  };
}

/** D-9: a later column and its data removed; the first column is never removed this way. */
export function withoutColumn(row: StoredRow, column: number): StoredRow {
  const columns = row.columns ?? [];
  if (column < 1 || column >= columns.length) return row;
  const next: StoredRow = {
    ...row,
    columns: normalizeColumns(columns.filter((_, j) => j !== column)),
  };
  // RT-28: the regression follows its y column, and goes with it.
  const r = row.regression;
  if (r !== undefined && r.y === column) delete (next as { regression?: unknown }).regression;
  else if (r !== undefined && r.y > column) return { ...next, regression: { ...r, y: r.y - 1 } };
  return next;
}

/** D-12: one column's style changed. */
export function withColumnStyle(
  row: StoredRow,
  column: number,
  style: Partial<Pick<StoredColumn, "color" | "hidden" | "lines" | "lineStyle" | "pointStyle">>
): StoredRow {
  return {
    ...row,
    columns: (row.columns ?? []).map((c, j) => (j === column ? { ...c, ...style } : c)),
  };
}

/** The row a deleted table leaves: an empty expression row with the same id (appendix F 32). */
export function emptiedTable(row: StoredRow): StoredRow {
  return { id: row.id, latex: "", color: row.color, hidden: false };
}
