// Points of interest of one row (POI-TRACE-5, POI-TRACE-10): the row's explicit branches as
// closures from its RowGraph, searched against every other visible row's branches. Pure
// TypeScript: no DOM, so it runs in the worker and the main-thread executor.

import type { AnalysisResult, RowAnalysis } from "../core/analysis/index";
import { collectNameUses } from "../core/analysis/names";
import type { Deadline } from "../core/deadline";
import {
  compileRealFunction1,
  compileRealFunction2,
  type CompileScope,
} from "../core/eval/compile";
import type { Node } from "../core/latex/ast";
import type { ViewSpec } from "../plot/viewport";
import { conicBranches } from "./conic";
import { findPois, searchAlong } from "./find";
import { findRoots } from "./roots";
import type { PoiBranch, PoiPoint } from "./types";

export { findPois, INTERSECTION_CAP, OWN_CAP } from "./find";
export type { PoiBranch, PoiKind, PoiPoint } from "./types";

const sub = (left: Node, right: Node): Node => ({ kind: "sub", left, right, span: left.span });
const isCoordinate = (n: Node, name: "x" | "y") => n.kind === "id" && n.name === name;
const uses = (n: Node, name: string) => collectNameUses(n).some((u) => u.name === name);

/** The curve `expr` = 0 as explicit branches when it is solvable for one coordinate, else none. */
function implicitBranches(expr: Node, scope: CompileScope): PoiBranch[] {
  return conicBranches(expr, compileRealFunction2(expr, scope));
}

/**
 * POI-TRACE-5: the explicit branches a row draws in `view`: y=f(x) and x=g(y) rows as they plot;
 * each line of a line set (x=2, x^2=4) as a constant branch; each boundary of an inequality chain
 * as y=f(x) or x=g(y) when one side is the bare coordinate and the other does not use it, else
 * as the implicit difference of its sides; implicit equations solvable for y (or x) as their
 * branches. Points, parametric, polar, other implicit curves and rows without a graph have none.
 */
export function poiBranchesFor(row: RowAnalysis, scope: CompileScope, view: ViewSpec): PoiBranch[] {
  const graph = row.graph;
  if (graph === null) return [];
  switch (graph.kind) {
    case "explicit":
      return [
        {
          independent: graph.independent,
          f: compileRealFunction1(graph.expr, graph.independent, scope),
        },
      ];
    case "implicit":
      return implicitBranches(graph.expr, scope);
    case "lines": {
      const vertical = graph.orientation === "vertical",
        axis = vertical ? "x" : "y";
      const f = compileRealFunction1(graph.expr, axis, scope);
      return findRoots(f, searchAlong(view, axis)).map((c) => ({
        independent: vertical ? "y" : "x",
        f: () => c,
      }));
    }
    case "region": {
      const branches: PoiBranch[] = [];
      for (let k = 0; k + 1 < graph.operands.length; k++) {
        const a = graph.operands[k],
          b = graph.operands[k + 1];
        const solved = (["y", "x"] as const).find(
          (c) => (isCoordinate(a, c) && !uses(b, c)) || (isCoordinate(b, c) && !uses(a, c))
        );
        if (solved !== undefined) {
          const expr = isCoordinate(a, solved) ? b : a,
            independent = solved === "y" ? "x" : "y";
          branches.push({ independent, f: compileRealFunction1(expr, independent, scope) });
        } else {
          branches.push(...implicitBranches(sub(a, b), scope));
        }
      }
      return branches;
    }
    default:
      return [];
  }
}

/** POI-TRACE-1, POI-TRACE-10: the points of interest of row `rowId` in `view`. */
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
      ? poiBranchesFor(r, scope, view).map((branch) => ({ rowId: r.id, branch }))
      : []
  );
  return findPois(poiBranchesFor(row, scope, view), others, view, deadline);
}
