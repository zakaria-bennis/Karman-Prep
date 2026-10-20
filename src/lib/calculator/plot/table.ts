// Table plots (D-11): each later visible column with a data or computed role, as world (x, y)
// pairs against the first column in row order, skipping rows where either value is undefined.
// Pure TypeScript: no DOM.

import type { TableResult } from "../core/data/evaluate";
import type { TableAnalysis } from "../core/data/table-analysis";
import type { TableGeometry } from "./geometry";
import { TABLE_MODEL_SPECS } from "../regression/table-models";

export function plotTable(
  rowId: string,
  analysis: TableAnalysis,
  result: TableResult
): TableGeometry {
  const xs = result.columns[0]?.values ?? [];
  const series: TableGeometry["series"] = [];
  analysis.columns.forEach((c, j) => {
    if (j === 0 || c.hidden || (c.role !== "data" && c.role !== "computed")) return;
    const ys = result.columns[j]?.values ?? [];
    const coords: number[] = [];
    xs.forEach((x, i) => {
      const y = ys[i];
      if (x !== null && y !== null && y !== undefined) coords.push(x, y);
    });
    series.push({ column: j, coords: Float64Array.from(coords) });
  });
  return { kind: "table", rowId, evaluations: 0, series };
}

/** RT-16, RT-28: y = f(x) of a visible, successful table regression, or null. */
export function tableRegressionCurve(
  analysis: TableAnalysis,
  result: TableResult
): ((x: number) => number) | null {
  const spec = analysis.regression,
    fit = result.regression?.fit;
  if (spec === null || spec.hidden || fit === undefined || !fit.ok) return null;
  const model = TABLE_MODEL_SPECS[spec.type],
    params = fit.params;
  return (x) => model.evaluate(params, x);
}
