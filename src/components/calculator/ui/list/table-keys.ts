// What the keys of a table cell do (D-7, D-8, D-9, RT-7; appendix F requirements 6 to 16): Enter
// inserts a row or continues a sequence in the first column, moves down a later one and leaves
// the table from the blank row, Tab and Shift+Tab walk the headers then
// the cells row by row (never the header slot or a computed cell), the arrows move one cell and
// leave the table at its top or bottom, ArrowLeft and ArrowRight cross cells at the caret's edge,
// and Backspace in an empty cell moves back, deleting a wholly empty data row; in an empty header
// it deletes the column (the first column's takes the table). A cell entered by
// Tab, Enter or an arrow has its content selected (requirement 9). Each call reads the latest
// snapshot, so a key acts on the table as it is when pressed.

import { MAX_TABLE_ROWS } from "@/lib/calculator/core/api/document";
import type { CalculatorEngine, RowView } from "@/lib/calculator/core/api/engine";
import type { Announcer } from "../a11y/announcer";
import { cellKey, type FocusController } from "../focus/focus-controller";
import { nextSequenceTerm } from "@/lib/calculator/core/data/next-term";
import { insertTableRow } from "@/lib/calculator/core/api/table-row-commands";
import { insertRowBelow, leaveRow } from "./row-actions";
import { TABLE_ROW_MESSAGE, type CellKeys } from "./TableCell";
import { dataRowCount } from "./table-model";

export interface TableKeyContext {
  engine: CalculatorEngine;
  focus: FocusController;
  announcer: Announcer | null;
  tableId: string;
}

type Place = { column: number; row: number | "h" };
type Entry = "select" | "start" | "end";

/** Focuses a cell: the caret at its start or end, or its whole content selected. */
function enter(ctx: TableKeyContext, { column, row }: Place, how: Entry): void {
  ctx.focus.focusRow(cellKey(ctx.tableId, column, row), how === "select" ? "all" : how);
}

function tableView(ctx: TableKeyContext): RowView | undefined {
  return ctx.engine.getSnapshot().rows.find((r) => r.id === ctx.tableId);
}

/** The cells a key can reach: every header, then each editable cell row by row. */
function reachable(view: RowView): Place[] {
  const columns = view.columns ?? [];
  const roles = view.table?.analysis.columns ?? [];
  const editable = columns.map((_, k) => k).filter((k) => roles[k]?.role !== "computed");
  const places: Place[] = columns.map((_, k) => ({ column: k, row: "h" as const }));
  const rows = dataRowCount(view);
  for (let r = 0; r <= rows; r++) for (const k of editable) places.push({ column: k, row: r });
  return places;
}

/** The reachable cell in `row` nearest to `column`, preferring the left. */
function nearest(places: Place[], column: number, row: number | "h"): Place | null {
  const inRow = places.filter((p) => p.row === row);
  if (inRow.length === 0) return null;
  return inRow.reduce((best, p) =>
    Math.abs(p.column - column) < Math.abs(best.column - column) ? p : best
  );
}

/** Leaves the table for the next list item, or a new empty expression after the last one. */
function leaveDown(ctx: TableKeyContext): void {
  const rows = ctx.engine.getSnapshot().rows;
  if (rows.at(-1)?.id === ctx.tableId)
    insertRowBelow(ctx.engine, ctx.focus, ctx.announcer, ctx.tableId, "focus");
  else leaveRow(ctx.engine, ctx.focus, ctx.tableId, "down");
}

/** A plain decimal or \frac{p}{q} cell's number, else null (the worker's value is used). */
function cellNumber(latex: string): number | null {
  const t = latex.trim();
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return Number(t);
  const m = /^(-?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(t);
  return m === null ? null : (m[1] === "-" ? -1 : 1) * (Number(m[2]) / Number(m[3]));
}

/** The row ArrowUp or ArrowDown moves to from `row`, or null when it leaves the table (D-7). */
function verticalTarget(
  row: number | "h",
  direction: "up" | "down",
  rows: number
): number | "h" | null {
  if (direction === "up") return row === "h" ? null : row === 0 ? "h" : row - 1;
  if (row === "h") return 0;
  return row < rows ? row + 1 : null;
}

export function cellKeys(ctx: TableKeyContext, column: number, row: number | "h"): CellKeys {
  const here = (view: RowView) => ({ view, places: reachable(view), rows: dataRowCount(view) });
  const read = () => {
    const view = tableView(ctx);
    return view === undefined ? null : here(view);
  };
  const vertical = (direction: "up" | "down") => {
    const t = read();
    if (t === null) return;
    const target = verticalTarget(row, direction, t.rows);
    const place = target === null ? null : nearest(t.places, column, target);
    if (place !== null) enter(ctx, place, "select");
    else if (direction === "up") leaveRow(ctx.engine, ctx.focus, ctx.tableId, "up");
    else leaveDown(ctx);
  };
  return {
    // RT-7, TABLES-29, -30: a header goes to its row 1; in the first column an interior row
    // inserts an empty row below and the last data row continues an arithmetic sequence (or
    // goes to the blank row); a later column moves down; the blank row leaves the table for a
    // new empty expression right below it.
    onEnter() {
      const t = read();
      if (t === null) return;
      if (row !== "h" && row >= t.rows) {
        insertRowBelow(ctx.engine, ctx.focus, ctx.announcer, ctx.tableId, "focus");
        return;
      }
      if (row !== "h" && column === 0 && t.view.table?.analysis.columns[0]?.role === "variable") {
        if (row < t.rows - 1) insertTableRow(ctx.engine, ctx.tableId, row + 1);
        else {
          // The cells as typed, so a key pressed before the worker reports still sees them.
          const computed = t.view.table.result?.columns[0]?.values ?? [];
          const values = (t.view.columns?.[0]?.values ?? [])
            .slice(0, row + 1)
            .map((latex, k) => cellNumber(latex) ?? computed[k] ?? null);
          const next = nextSequenceTerm(values);
          if (next !== null) {
            ctx.engine.editCell(ctx.tableId, 0, row + 1, next, "api");
            // Select the new term once its field shows it, so typing replaces it.
            requestAnimationFrame(() => enter(ctx, { column: 0, row: row + 1 }, "select"));
            return;
          }
        }
        enter(ctx, { column: 0, row: row + 1 }, "select");
        return;
      }
      const place = nearest(t.places, column, row === "h" ? 0 : row + 1);
      if (place !== null) enter(ctx, place, "select");
    },
    onArrowOut: vertical,
    // D-7: across at the caret's edge, staying in the row.
    onMoveOutOf(direction) {
      const t = read();
      if (t === null) return;
      const inRow = t.places.filter((p) => p.row === row);
      const i = inRow.findIndex((p) => p.column === column);
      const next = inRow[direction === "left" ? i - 1 : i + 1];
      if (i >= 0 && next !== undefined) enter(ctx, next, direction === "left" ? "end" : "start");
    },
    // D-7: the headers, then each row's cells, wrapping; past either end Tab leaves the table.
    onTab(backwards) {
      const t = read();
      if (t === null) return false;
      const i = t.places.findIndex((p) => p.column === column && p.row === row);
      const next = t.places[backwards ? i - 1 : i + 1];
      if (i >= 0 && next !== undefined) {
        enter(ctx, next, "select");
        return true;
      }
      return false;
    },
    // TABLES-36: Ctrl+ArrowUp/Down to the column's header or its blank row; Ctrl+ArrowLeft/Right
    // to the first or last data column of the row.
    onJump(direction) {
      const t = read();
      if (t === null) return;
      let place: Place | null;
      if (direction === "up") place = { column, row: "h" };
      else if (direction === "down") place = nearest(t.places, column, t.rows);
      else {
        const inRow = t.places.filter((p) => p.row === row);
        place = (direction === "left" ? inRow[0] : inRow.at(-1)) ?? null;
      }
      if (place !== null) enter(ctx, place, "select");
    },
    // D-8, D-9: Backspace in an empty cell or header (requirements 13, 14).
    onDeleteOutOf() {
      const t = read();
      if (t === null) return;
      if (row === "h") {
        if (column < (t.view.columns ?? []).length) deleteColumnByKey(ctx, column);
        else if (column > 0) enter(ctx, { column: column - 1, row: "h" }, "end");
        return;
      }
      if (row >= t.rows) {
        const place = t.rows > 0 ? nearest(t.places, column, t.rows - 1) : null;
        if (place !== null) enter(ctx, place, "select");
        return;
      }
      const empty = (t.view.columns ?? []).every((c) => (c.values[row] ?? "").trim() === "");
      if (empty) {
        ctx.engine.deleteTableRow(ctx.tableId, row);
        const after = here(tableView(ctx) ?? t.view);
        const place = nearest(after.places, column, Math.max(0, row - 1));
        if (place !== null) enter(ctx, place, "select");
        return;
      }
      const place = nearest(t.places, column, row === 0 ? "h" : row - 1);
      if (place !== null) enter(ctx, place, row === 0 ? "end" : "select");
    },
  };
}

/**
 * D-9, as the reference does it: Backspace in an empty header deletes that column with its data
 * and moves to the end of the previous header; in the first column's empty header it deletes the
 * whole table, leaving R-9's empty row with the caret.
 */
function deleteColumnByKey(ctx: TableKeyContext, column: number): void {
  if (column === 0) {
    ctx.engine.deleteRow(ctx.tableId);
    ctx.focus.focusRow(ctx.tableId, "end");
    return;
  }
  ctx.engine.deleteTableColumn(ctx.tableId, column);
  enter(ctx, { column: column - 1, row: "h" }, "end");
}

/** D-8: Add row to table n focuses the blank row's first editable cell; refused at the limit. */
export function addTableRow(ctx: TableKeyContext): void {
  const view = tableView(ctx);
  if (view === undefined) return;
  const rows = dataRowCount(view);
  if (rows >= MAX_TABLE_ROWS) {
    ctx.announcer?.announce(TABLE_ROW_MESSAGE);
    return;
  }
  const place = nearest(reachable(view), 0, rows);
  if (place !== null) enter(ctx, place, "start");
}

/** D-8: the Delete table n row k control; the row now in its place, else the one above, takes focus. */
export function deleteTableRowByControl(ctx: TableKeyContext, row: number): void {
  ctx.engine.deleteTableRow(ctx.tableId, row);
  const view = tableView(ctx);
  if (view === undefined) return;
  const rows = dataRowCount(view);
  const place = nearest(reachable(view), 0, rows === 0 ? 0 : Math.min(row, rows - 1));
  if (place !== null) enter(ctx, place, "end");
}
