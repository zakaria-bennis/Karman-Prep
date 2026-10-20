// Table regressions in the values pass (RT-25, RT-26, RT-28 to RT-30): the stored regression a
// table carries, which of its columns qualify as regression data, the residual name e_k, and the
// fit of the x and y columns' values. The residual list fills the table's own residual column
// (a computed column headed e_k) when it has one. Pure TypeScript: no DOM.

import type { LineStyle } from "../api/types";
import {
  fitTableRegression,
  type TableFitCell,
  type TableFitResult,
} from "../../regression/table-fit";
import type { TableModel } from "../../regression/table-models";

/** RT-28: what a table's row source carries about its regression (the stored row's fields). */
export interface TableRegressionSpec {
  type: TableModel;
  y: number;
  color: string;
  hidden: boolean;
  logMode: boolean;
  lineStyle?: LineStyle;
  residual?: string;
}
export interface TableRegressionResult {
  type: TableModel;
  y: number;
  residualName: string;
  fit: TableFitResult;
}

/** The subscript of a name like `y_{7}` or `y_7`, or null. */
export function subscriptOf(name: string): string | null {
  const m = /^[a-zA-Z]+_\{?([0-9a-zA-Z]+)\}?$/.exec(name.trim());
  return m === null ? null : m[1];
}

/**
 * RT-25: the stored name when still free; else e_<subscript> of the y header, then the x
 * header; else the lowest free e_k. `taken` holds every name in use elsewhere.
 */
export function chooseResidualName(
  stored: string | undefined,
  headers: readonly string[],
  taken: ReadonlySet<string>
): string {
  const free = (name: string) => !taken.has(name);
  if (stored !== undefined && free(stored)) return stored;
  for (const header of headers) {
    const sub = subscriptOf(header);
    if (sub !== null && free(`e_{${sub}}`)) return `e_{${sub}}`;
  }
  for (let k = 1; ; k++) if (free(`e_{${k}}`)) return `e_{${k}}`;
}

/** A column's values qualify as regression data: at least 2 after trailing blanks, none bad. */
export function columnQualifies(values: readonly (number | null)[]): boolean {
  let n = values.length;
  while (n > 0 && values[n - 1] === null) n--;
  if (n < 2) return false;
  for (let i = 0; i < n; i++) if (values[i] === null) return false;
  return true;
}

/** The fit of `spec` on its x and y columns' cells, `[x, y]`. */
export function evaluateTableRegression(
  spec: TableRegressionSpec,
  [xs, ys]: readonly [readonly TableFitCell[], readonly TableFitCell[]],
  residualName: string
): TableRegressionResult {
  return {
    type: spec.type,
    y: spec.y,
    residualName,
    fit: fitTableRegression({ type: spec.type, xs, ys, logMode: spec.logMode }),
  };
}
