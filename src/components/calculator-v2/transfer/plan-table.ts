// Table transfers (c-transfer TR-25, TR-72, TR-73; b D-4, D-18): which table a "table" payload
// writes, named xₙ, yₙ … by the lowest free n when the calculator applies it, and whether the
// prospective list passes the core check. Pure: apply.ts commits. A transferred table is an
// ordinary table row (D-18), so typing, statistics, regressions and the per-question reset treat
// it like a typed one.

import type { AnalysisSettings } from "@/lib/calculator-v2/core/analysis/index";
import { MAX_CELL_CHARACTERS } from "@/lib/calculator-v2/core/api/document";
import type { ExpressionState } from "@/lib/calculator-v2/core/api/types";
import { nextTableNames } from "@/lib/calculator-v2/core/data/naming";
import { MAX_ROWS } from "@/lib/calculator-v2/core/latex/index";
import { plainMath } from "@/lib/calculator-transfer/describe";
import { TRANSFER_MESSAGES } from "@/lib/calculator-transfer/payload";
import { analyse, assignIds } from "./plan";

/** TR-23's limits, repeated from the classifier (AR-3 keeps it free of v2 imports). */
const MAX_VARIABLES = 8;
const MAX_POINTS = 200;

export type TableWrite =
  | { status: "rejected" }
  | { status: "added"; write: ExpressionState; focusRowId: string; message: string };

/** D-4: every name a row defines or references, and every table header. */
export function namesInUse(
  existing: readonly ExpressionState[],
  settings: AnalysisSettings
): Set<string> {
  const used = new Set<string>();
  for (const row of analyse(existing, settings).byId.values()) {
    if (row.defines !== null) used.add(row.defines.name);
    for (const name of row.uses) used.add(name);
  }
  for (const row of existing) for (const c of row.columns ?? []) used.add(c.latex);
  return used;
}

/** Equal-length columns within TR-23's limits and D-6's cell size. */
export function validColumns(columns: readonly (readonly string[])[], minColumns = 1): boolean {
  const points = columns[0]?.length ?? 0;
  return (
    columns.length >= minColumns &&
    columns.length <= MAX_VARIABLES &&
    points >= 1 &&
    points <= MAX_POINTS &&
    columns.every(
      (c) =>
        c.length === points && c.every((v) => v.trim() !== "" && v.length <= MAX_CELL_CHARACTERS)
    )
  );
}

/**
 * TR-73 for tables: the list stays within MAX_ROWS, the written table's headers and cells analyse
 * with no error, and no row without an error gains one.
 */
export function passesTableCheck(
  existing: readonly ExpressionState[],
  prospective: readonly ExpressionState[],
  tableId: string,
  settings: AnalysisSettings
): boolean {
  if (prospective.length > MAX_ROWS) return false;
  const before = analyse(existing, settings);
  return analyse(prospective, settings).rows.every((row) => {
    if (row.id === tableId)
      return (
        row.error === null &&
        (row.table?.columns ?? []).every(
          (c) => c.error === null && c.cellErrors.every((e) => e === null)
        )
      );
    return row.error === null || (before.byId.get(row.id)?.error ?? null) !== null;
  });
}

/** The list with `write` upserted the way setExpressions upserts it (by id, else appended). */
export function withWrite(
  existing: readonly ExpressionState[],
  write: ExpressionState
): ExpressionState[] {
  const at = existing.findIndex((r) => r.id === write.id);
  if (at < 0) return [...existing, write];
  return existing.map((r, k) => (k === at ? { ...r, ...write, latex: "" } : r));
}

/** TR-25: a "table" payload as one new table, its status naming each column's header. */
export function planTable(
  existing: readonly ExpressionState[],
  table: { headers: (string | null)[]; columns: string[][] },
  settings: AnalysisSettings
): TableWrite {
  const { headers, columns } = table;
  if (!validColumns(columns) || headers.length !== columns.length) return { status: "rejected" };
  const names = nextTableNames(namesInUse(existing, settings), columns.length - 1);
  const latex = [names.x, ...names.ys];
  const [{ id }] = assignIds(existing, [""]); // TR-32: an empty last row becomes the table
  const write: ExpressionState = {
    id,
    type: "table",
    columns: columns.map((values, k) => ({ latex: latex[k], values: [...values] })),
  };
  if (!passesTableCheck(existing, withWrite(existing, write), id, settings))
    return { status: "rejected" };
  const parts = latex.map((name, k) => {
    const header = headers[k];
    return header ? `${plainMath(name)} is ${header}` : plainMath(name);
  });
  return {
    status: "added",
    write,
    focusRowId: id,
    message: TRANSFER_MESSAGES.tableAdded(parts, columns[0].length),
  };
}
