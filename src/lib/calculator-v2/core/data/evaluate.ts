// Table values (D-6, D-10, D-11): each column's numbers row by row and, for computed columns, the
// values they show. Variable and data columns read the list their synthetic definition evaluated
// to (or their cells, for a column named x or y); a computed column evaluates its header with the
// first column's variable, and every list it names, bound to that row's element. Pure TypeScript.

import type { RowAnalysis } from "../analysis/index";
import type { Deadline } from "../deadline";
import { compileExpression, type CompileScope } from "../eval/compile";
import { formatNumber } from "../eval/format";
import { numberValue, type Value } from "../eval/values";
import { collectNameUses } from "../analysis/names";
import type { RegressionOutcome } from "./evaluate-regression";

export interface TableColumnResult {
  values: (number | null)[]; // null: blank, undefined or not a real number
  display: (string | null)[]; // computed columns' shown values; null for entered columns
}
export interface TableResult {
  columns: TableColumnResult[];
}
/** Where evaluateRows hands the results that are not row values (D-11, D-22). */
export interface DataSink {
  table(rowId: string, table: TableResult): void;
  regression(rowId: string, result: RegressionOutcome): void; // D-22
}

const real = (v: Value | undefined): number | null =>
  v !== undefined && v.type === "number" && Number.isFinite(v.value) ? v.value : null;

/** One table row's results; `rows` cells per column, every column the table's length. */
export function evaluateTable(
  row: RowAnalysis,
  scope: CompileScope,
  deadline: Deadline
): TableResult {
  const table = row.table!;
  const n = table.rows;
  const entered = (j: number): (number | null)[] => {
    const c = table.columns[j];
    const list = c.name === null ? undefined : scope.values.get(c.name);
    if (list !== undefined && list.type === "list") {
      return Array.from({ length: n }, (_, i) => real(list.value[i]));
    }
    return Array.from({ length: n }, (_, i) => {
      const tree = c.cells[i] ?? null;
      return tree === null ? null : real(compileExpression(tree, scope)({}, deadline));
    });
  };
  const first = table.columns[0];
  const firstValues =
    first.role === "variable" ? entered(0) : new Array<number | null>(n).fill(null);
  const firstName = first.role === "variable" ? first.name : null;
  const columns = table.columns.map((c, j): TableColumnResult => {
    const none = () => ({ values: new Array(n).fill(null), display: new Array(n).fill(null) });
    if (j === 0) return { values: firstValues, display: new Array(n).fill(null) };
    if (c.role === "data") return { values: entered(j), display: new Array(n).fill(null) };
    if (c.role !== "computed" || c.tree === null || firstName === null) return none();
    const compiled = compileExpression(c.tree, scope);
    const lists = collectNameUses(c.tree).flatMap(({ name }) => {
      const v = name === firstName ? undefined : scope.values.get(name);
      return v !== undefined && v.type === "list" ? [[name, v.value] as const] : [];
    });
    const values = firstValues.map((x, i) => {
      if (x === null) return null;
      const vars: Record<string, Value> = { [firstName]: numberValue(x) };
      for (const [name, items] of lists) vars[name] = items[i] ?? numberValue(NaN);
      return real(compiled(vars, deadline));
    });
    return { values, display: values.map((v) => (v === null ? null : formatNumber(v))) };
  });
  return { columns };
}
