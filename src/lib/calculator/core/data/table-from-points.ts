// Convert to Table for a point-list row (RT-10, REG-TABLES-FROM-EQUATIONS-12, -13): a row that is
// a literal point or list of points, `(1,2),(3,4)`, `(1,2)`, `([1,2,3],[4,5,6])` or
// `(x_1+0.5,y_1)`, but not a definition (`P=(1,2),(3,4)`), becomes a table of its coordinates as
// they evaluate now: each written at full float precision ("0.3333333333333333"), an undefined
// coordinate as a blank cell. Pure TypeScript: no DOM.

import { parseLatex } from "../latex/index";
import type { Node } from "../latex/ast";
import type { Value } from "../eval/values";

/** A literal point or list of points, as parsed. */
function isPointList(tree: Node): boolean {
  if (tree.kind === "point") return true;
  return (
    tree.kind === "list" && tree.items.length > 0 && tree.items.every((n) => n.kind === "point")
  );
}

const cell = (v: number) => (Number.isFinite(v) ? String(v) : "");

/**
 * The x and y cells of row `latex` whose latest value is `value`, or null when the row is not a
 * literal point list or has not evaluated to points.
 */
export function pointTableCells(
  latex: string,
  value: Value | null,
  userFunctions: ReadonlySet<string>
): { xs: string[]; ys: string[] } | null {
  const parsed = parseLatex(latex, { userFunctions });
  if (!parsed.ok || !isPointList(parsed.tree) || value === null) return null;
  const points = value.type === "point" ? [value] : value.type === "list" ? value.value : null;
  if (points === null || points.length === 0) return null;
  const xs: string[] = [],
    ys: string[] = [];
  for (const p of points) {
    if (p.type === "point") {
      xs.push(cell(p.value[0]));
      ys.push(cell(p.value[1]));
    } else if (p.type === "undefined") {
      xs.push("");
      ys.push("");
    } else return null;
  }
  return { xs, ys };
}
