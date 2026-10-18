// The keypad inside a table (D-41): which cell the keypad edits in a table row (the cell or
// header that last had focus, else the blank row's first cell, never the header slot), how its
// edit is committed (editCell or editHeader, as a keypad edit), and the keys of that cell, so the
// keypad's Enter moves down the column as a hardware Enter does.

import type { CalculatorEngine, EditRefusal } from "@/lib/calculator-v2/core/api/engine";
import type { MathField } from "../../math-field/MathField";
import type { Announcer } from "../a11y/announcer";
import { cellKey, type FocusController } from "../focus/focus-controller";
import type { CellKeys } from "./TableCell";
import { cellKeys } from "./table-keys";
import { dataRowCount } from "./table-model";

export interface CellTarget {
  field: MathField;
  commit(latex: string): EditRefusal | null;
  keys: CellKeys;
}

/** A cell key's column and row: `${tableId}:${column}:${row}`, read from the right. */
export function parseCellKey(key: string): { column: number; row: number | "h" } | null {
  const m = /:(\d+):(\d+|h)$/.exec(key);
  if (m === null) return null;
  return { column: Number(m[1]), row: m[2] === "h" ? "h" : Number(m[2]) };
}

export function cellTarget(
  engine: CalculatorEngine,
  focus: FocusController,
  announcer: Announcer | null,
  tableId: string
): CellTarget | null {
  const view = engine.getSnapshot().rows.find((r) => r.id === tableId);
  if (view === undefined || view.type !== "table") return null;
  const columns = view.columns ?? [];
  const noted = focus.lastCell(tableId);
  let place = noted === null ? null : parseCellKey(noted);
  // D-41: never the header slot (or a cell that has gone): the blank row's first cell instead.
  if (place === null || place.column >= columns.length || focus.field(noted!) === null)
    place = { column: 0, row: dataRowCount(view) };
  const { column, row } = place;
  const field = focus.field(cellKey(tableId, column, row));
  if (field === null) return null;
  return {
    field,
    commit: (latex) =>
      row === "h"
        ? engine.editHeader(tableId, column, latex, "keypad")
        : engine.editCell(tableId, column, row, latex, "keypad"),
    keys: cellKeys({ engine, focus, announcer, tableId }, column, row),
  };
}
