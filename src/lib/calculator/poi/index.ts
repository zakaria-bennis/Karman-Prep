// Points of interest of one row: the row's curves
// as closures from its RowGraph, searched against every other graphable row's curves (POI-1,
// POI-4). Pure TypeScript: no DOM, so it runs in the worker and the main-thread executor.

import type { AnalysisResult, RowAnalysis } from "../core/analysis/index";
import type { Deadline } from "../core/deadline";
import {
  compileRealFunction1,
  compileRealFunction2,
  type CompileScope,
} from "../core/eval/compile";
import type { Node } from "../core/latex/ast";
import { collectNameUses } from "../core/analysis/names";
import type { ViewSpec } from "../plot/viewport";
import { findPois } from "./find";
import type { PoiCurve, PoiPoint } from "./types";

export { findPois, POI_CAP, searchRange } from "./find";
export type { PoiCurve, PoiKind, PoiPoint } from "./types";

const sub = (left: Node, right: Node): Node => ({ kind: "sub", left, right, span: left.span });
const isCoordinate = (n: Node, name: "x" | "y") => n.kind === "id" && n.name === name;
const uses = (n: Node, name: string) => collectNameUses(n).some((u) => u.name === name);

/**
 * The curves a row draws, as POI closures: explicit, implicit and line graphs as they plot; each
 * boundary of an inequality chain as y=f(x) or x=g(y) when one side is the bare coordinate and the
 * other does not use it, else as the implicit difference of its sides. Points, constant regions
 * and rows without a graph have none (POI-2's table).
 */
export function poiCurvesFor(row: RowAnalysis, scope: CompileScope): PoiCurve[] {
  const graph = row.graph;
  if (graph === null) return [];
  switch (graph.kind) {
    case "explicit":
      return [
        {
          kind: "explicit",
          independent: graph.independent,
          f: compileRealFunction1(graph.expr, graph.independent, scope),
        },
      ];
    case "implicit":
      return [{ kind: "implicit", F: compileRealFunction2(graph.expr, scope) }];
    case "lines":
      return [
        {
          kind: "lines",
          orientation: graph.orientation,
          f: compileRealFunction1(graph.expr, graph.orientation === "vertical" ? "x" : "y", scope),
        },
      ];
    case "region": {
      const curves: PoiCurve[] = [];
      for (let k = 0; k + 1 < graph.operands.length; k++) {
        const a = graph.operands[k],
          b = graph.operands[k + 1];
        const solved = (["y", "x"] as const).find(
          (c) => (isCoordinate(a, c) && !uses(b, c)) || (isCoordinate(b, c) && !uses(a, c))
        );
        if (solved !== undefined) {
          const expr = isCoordinate(a, solved) ? b : a,
            independent = solved === "y" ? "x" : "y";
          curves.push({
            kind: "explicit",
            independent,
            f: compileRealFunction1(expr, independent, scope),
          });
        } else {
          curves.push({ kind: "implicit", F: compileRealFunction2(sub(a, b), scope) });
        }
      }
      return curves;
    }
    default:
      return [];
  }
}

/** POI-1: the points of interest of row `rowId` (none unless it is graphable) in `view`. */
export function findRowPois(
  rowId: string,
  analysis: AnalysisResult,
  scope: CompileScope,
  view: ViewSpec,
  deadline: Deadline
): PoiPoint[] {
  const row = analysis.byId.get(rowId);
  if (row === undefined || !row.isGraphable) return [];
  const others = analysis.rows.flatMap((r) =>
    r.id !== rowId && r.isGraphable
      ? poiCurvesFor(r, scope).map((curve) => ({ rowId: r.id, curve }))
      : []
  );
  const curves = poiCurvesFor(row, scope);
  if (curves.length === 1) return findPois(curves[0], others, view, deadline);
  const all = curves.flatMap((c) => findPois(c, others, view, deadline));
  return all.sort((a, b) => a.x - b.x || a.y - b.y);
}
