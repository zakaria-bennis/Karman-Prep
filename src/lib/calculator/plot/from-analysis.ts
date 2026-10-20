// Plot inputs from row analyses (NM-16, AR-44).
// Each graphable row's RowGraph compiles once into the closures plotRow samples; the executor
// calls this per row with the scope built from the latest values pass. Pure TypeScript: no DOM,
// so it runs unchanged in the worker and in the main-thread executor (AR-44).

import type { AnalysisResult, RowAnalysis } from "../core/analysis/index";
import { NO_DEADLINE } from "../core/deadline";
import {
  compileExpression,
  compileRealFunction1,
  compileRealFunction2,
  type CompileScope,
  type EvalSettings,
} from "../core/eval/compile";
import { branchTrees, chainBranches } from "../core/eval/branches";
import type { Value } from "../core/eval/values";
import type { Node } from "../core/latex/ast";
import type { PlotInput } from "./index";

/**
 * The scope plot closures compile against. `functions` is `analysis.functions`, which holds
 * function definitions and each dependent definition as a zero-parameter entry.
 * `values` maps a constant definition's name to its row's entry in `values` (keyed by row id);
 * a dependent definition (`a=2x`) never gets one, so it cannot shadow its function entry (RC-6).
 */
export function buildCompileScope(
  analysis: AnalysisResult,
  values: ReadonlyMap<string, Value>,
  settings: EvalSettings
): CompileScope {
  const named = new Map<string, Value>();
  // byId also holds the synthetic definitions of table columns (D-11) and regressions (D-22).
  for (const row of analysis.byId.values()) {
    if (row.kind === "definition" && row.defines?.type === "value" && values.has(row.id)) {
      named.set(row.defines.name, values.get(row.id)!);
    }
  }
  return { functions: analysis.functions, values: named, settings };
}

/**
 * The PlotInput of a row, or null when `row.graph` is null (an error, chips, a hidden row or a
 * non-graphing kind) or for a point row whose `value` holds no point with two finite coordinates
 * (G-7: not drawn; G-3: a list of points draws each defined one). Each curve, line set or region
 * compiles once per branch of branchTrees (G-22: a list-valued tree draws one per element):
 * explicit → compileRealFunction1(branch, independent); implicit → compileRealFunction2(branch);
 * lines → compileRealFunction1(branch, "x" for vertical, "y" for horizontal); region →
 * compileRealFunction2 per operand of each branch of the chain (chainBranches). constant-region compiles the chain as
 * one `rel` node and evaluates it once: it holds exactly when the result is n(1), which
 * compileExpression gives only when every link holds between real operands (NM-22).
 */
export function plotInputFor(
  row: RowAnalysis,
  scope: CompileScope,
  value: Value | null
): PlotInput | null {
  const { id: rowId, graph } = row;
  if (graph === null) return null;
  switch (graph.kind) {
    case "explicit":
      return {
        rowId,
        kind: "explicit",
        independent: graph.independent,
        fs: branchTrees(graph.expr, scope).map((tree) =>
          compileRealFunction1(tree, graph.independent, scope)
        ),
      };
    case "implicit":
      return {
        rowId,
        kind: "implicit",
        Fs: branchTrees(graph.expr, scope).map((tree) => compileRealFunction2(tree, scope)),
      };
    case "lines": {
      const axis = graph.orientation === "vertical" ? "x" : "y";
      return {
        rowId,
        kind: "lines",
        orientation: graph.orientation,
        fs: branchTrees(graph.expr, scope).map((tree) => compileRealFunction1(tree, axis, scope)),
      };
    }
    case "region":
      return {
        rowId,
        kind: "region",
        branches: chainBranches(graph.operands, graph.ops, scope).map((operands) =>
          operands.map((operand) => compileRealFunction2(operand, scope))
        ),
        ops: [...graph.ops],
      };
    case "constant-region": {
      const rel: Node = {
        kind: "rel",
        ops: graph.ops,
        operands: graph.operands,
        span: row.tree?.span ?? { start: 0, end: 0 },
      };
      const result = compileExpression(rel, scope)({}, NO_DEADLINE);
      return {
        rowId,
        kind: "constant-region",
        holds: result.type === "number" && result.value === 1,
      };
    }
    case "table":
      return null; // D-11: the runPlot unit plots tables from their TableResult
    case "point": {
      // G-7: a point with an undefined coordinate is not drawn; G-3, NM-33: a list of points
      // (a point whose parts are lists, or a list of points) draws each point that is defined.
      const items = value?.type === "list" ? value.value : value === null ? [] : [value];
      const points: [number, number][] = [];
      for (const item of items) {
        if (item.type !== "point") continue;
        const [x, y] = item.value;
        if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
      }
      return points.length > 0 ? { rowId, kind: "points", points } : null;
    }
  }
}
