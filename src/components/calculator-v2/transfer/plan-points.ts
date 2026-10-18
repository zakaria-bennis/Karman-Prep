// Point-table transfers (c-transfer TR-34, TR-35, TR-70): "Table row" pairs go to the point table
// of their source key ("points" for plain coordinate pairs, else the function name), created on
// first use with two columns named by TR-25 and appended to while it is still a two-column table
// with the names it was given, otherwise replaced by a new one. The registry lives with the
// calculator object, so a new calculator per question (R10, AR-58) starts with none.

import type { AnalysisSettings } from "@/lib/calculator-v2/core/analysis/index";
import { MAX_TABLE_ROWS } from "@/lib/calculator-v2/core/api/document";
import type { ExpressionState } from "@/lib/calculator-v2/core/api/types";
import { nextTableNames } from "@/lib/calculator-v2/core/data/naming";
import { plainMath } from "@/lib/calculator-transfer/describe";
import { TRANSFER_MESSAGES } from "@/lib/calculator-transfer/payload";
import { assignIds } from "./plan";
import { namesInUse, passesTableCheck, validColumns, withWrite } from "./plan-table";

interface PointTable {
  id: string;
  x: string;
  y: string;
}

function perCalculator<V>(): (calculator: object) => Map<string, V> {
  const registry = new WeakMap<object, Map<string, V>>();
  return (calculator) => {
    let map = registry.get(calculator);
    if (map === undefined) registry.set(calculator, (map = new Map()));
    return map;
  };
}

/** The point tables of one calculator, by source key (TR-34). */
export const pointTables = perCalculator<PointTable>();
/** The table each question-table source added, by source id, for TR-35's repeat rule (D-18). */
export const sourceTables = perCalculator<string>();

export type PointRowPlan =
  | { status: "rejected" }
  | { status: "already-present"; focusRowId: string; message: string }
  | {
      status: "added";
      kind: "create" | "append";
      table: PointTable;
      write: ExpressionState; // the whole table after the transfer
      added: [string, string][];
      focusRowId: string;
      message: string;
    };

/** The registered table of `key` while it is still the point table it was made as. */
function liveTable(
  existing: readonly ExpressionState[],
  entry: PointTable | undefined
): ExpressionState | null {
  if (entry === undefined) return null;
  const row = existing.find((r) => r.id === entry.id);
  const columns = row?.type === "table" ? (row.columns ?? []) : [];
  return columns.length === 2 && columns[0].latex === entry.x && columns[1].latex === entry.y
    ? (row ?? null)
    : null;
}

/** TR-34, TR-35: where `pairs` go, with the pairs already in that table left out. */
export function planPointRows(
  existing: readonly ExpressionState[],
  tables: ReadonlyMap<string, PointTable>,
  key: string,
  pairs: readonly [string, string][],
  settings: AnalysisSettings
): PointRowPlan {
  if (pairs.length === 0 || !validColumns([pairs.map((p) => p[0]), pairs.map((p) => p[1])], 2))
    return { status: "rejected" };
  const live = liveTable(existing, tables.get(key));
  const [xs, ys] = live?.columns ?? [];
  const seen = new Set((xs?.values ?? []).map((x, k) => `${x}\u0000${ys?.values[k] ?? ""}`));
  const added: [string, string][] = [];
  for (const [x, y] of pairs) {
    const id = `${x.trim()}\u0000${y.trim()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    added.push([x.trim(), y.trim()]);
  }
  if (live !== null && added.length === 0) {
    const row = existing.findIndex((r) => r.id === live.id) + 1;
    return {
      status: "already-present",
      focusRowId: live.id,
      message: TRANSFER_MESSAGES.alreadyPresent(row),
    };
  }
  let table: PointTable;
  let write: ExpressionState;
  let first: number;
  if (live !== null && xs !== undefined && ys !== undefined) {
    table = { id: live.id, x: xs.latex, y: ys.latex };
    first = xs.values.length + 1;
    if (first - 1 + added.length > MAX_TABLE_ROWS) return { status: "rejected" };
    write = {
      ...live,
      columns: [
        { ...xs, values: [...xs.values, ...added.map((p) => p[0])] },
        { ...ys, values: [...ys.values, ...added.map((p) => p[1])] },
      ],
    };
  } else {
    const names = nextTableNames(namesInUse(existing, settings), 1);
    const [{ id }] = assignIds(existing, [""]); // TR-32
    table = { id, x: names.x, y: names.ys[0] };
    first = 1;
    write = {
      id,
      type: "table",
      columns: [
        { latex: table.x, values: added.map((p) => p[0]) },
        { latex: table.y, values: added.map((p) => p[1]) },
      ],
    };
  }
  if (!passesTableCheck(existing, withWrite(existing, write), table.id, settings))
    return { status: "rejected" };
  return {
    status: "added",
    kind: live === null ? "create" : "append",
    table,
    write,
    added,
    focusRowId: table.id,
    message: TRANSFER_MESSAGES.pairAppended(plainMath(table.x), plainMath(table.y), first),
  };
}
