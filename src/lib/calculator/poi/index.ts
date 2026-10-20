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
import { branchTrees, chainBranches } from "../core/eval/branches";
import type { Node } from "../core/latex/ast";
import type { ViewSpec } from "../plot/viewport";
import { conicBranches, polynomialDegree } from "./conic";
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
 * POI-TRACE-5: the explicit branches a row draws in `view`, for each element of a list of curves
 * (G-22: Desmos marks each element's points and traces each, but never where two elements of one
 * row meet): y=f(x) and x=g(y) rows as they plot; each line of a line set (x=2, x^2=4) as a
 * constant branch; each boundary of an inequality chain as y=f(x) or x=g(y) when one side is the
 * bare coordinate and the other does not use it, else as the implicit difference of its sides;
 * implicit equations solvable for y (or x) as their branches. Points, parametric, polar, other
 * implicit curves and rows without a graph have none.
 */
export function poiBranchesFor(row: RowAnalysis, scope: CompileScope, view: ViewSpec): PoiBranch[] {
  const graph = row.graph;
  if (graph === null) return [];
  switch (graph.kind) {
    case "explicit":
      return branchTrees(graph.expr, scope).map((tree) => ({
        independent: graph.independent,
        f: compileRealFunction1(tree, graph.independent, scope),
        linear: polynomialDegree(tree, graph.independent) <= 1,
      }));
    case "implicit":
      return branchTrees(graph.expr, scope).flatMap((tree) => implicitBranches(tree, scope));
    case "lines": {
      const vertical = graph.orientation === "vertical",
        axis = vertical ? "x" : "y";
      return branchTrees(graph.expr, scope).flatMap((tree) =>
        findRoots(compileRealFunction1(tree, axis, scope), searchAlong(view, axis)).map(
          (c): PoiBranch => ({ independent: vertical ? "y" : "x", f: () => c, linear: true })
        )
      );
    }
    case "region":
      return chainBranches(graph.operands, graph.ops, scope).flatMap((operands) =>
        boundaryBranches(operands, scope)
      );
    default:
      return [];
  }
}

/** POI-TRACE-5: each boundary of one inequality chain, solved for a coordinate where it can be. */
function boundaryBranches(operands: readonly Node[], scope: CompileScope): PoiBranch[] {
  const branches: PoiBranch[] = [];
  for (let k = 0; k + 1 < operands.length; k++) {
    const a = operands[k],
      b = operands[k + 1];
    const solved = (["y", "x"] as const).find(
      (c) => (isCoordinate(a, c) && !uses(b, c)) || (isCoordinate(b, c) && !uses(a, c))
    );
    if (solved !== undefined) {
      const expr = isCoordinate(a, solved) ? b : a,
        independent = solved === "y" ? "x" : "y";
      branches.push({
        independent,
        f: compileRealFunction1(expr, independent, scope),
        linear: polynomialDegree(expr, independent) <= 1,
      });
    } else {
      branches.push(...implicitBranches(sub(a, b), scope));
    }
  }
  return branches;
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
