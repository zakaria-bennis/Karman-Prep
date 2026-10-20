// TABLES-29: Enter on an interior data row of a table's first column inserts an empty row below it,
// as one undo step; refused at MAX_TABLE_ROWS.

import { MAX_TABLE_ROWS } from "./document";
import type { CalculatorEngine } from "./engine";

/** Inserts an empty data row at index `at` of table `tableId`; false when nothing changed. */
export function insertTableRow(engine: CalculatorEngine, tableId: string, at: number): boolean {
  let done = false;
  engine.editRows((rows) => {
    const i = rows.findIndex((r) => r.id === tableId);
    const table = rows[i];
    if (table === undefined || table.type !== "table") return null;
    const length = Math.max(0, ...(table.columns ?? []).map((c) => c.values.length));
    if (at < 0 || at > length || length >= MAX_TABLE_ROWS) return null;
    const columns = (table.columns ?? []).map((c) => {
      const values = Array.from({ length }, (_, k) => c.values[k] ?? "");
      values.splice(at, 0, "");
      return { ...c, values };
    });
    done = true;
    return rows.map((r, k) => (k === i ? { ...table, columns } : r));
  });
  return done;
}
