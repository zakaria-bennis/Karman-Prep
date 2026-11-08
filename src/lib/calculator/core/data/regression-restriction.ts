// The restriction of a regression row (REGRESSION-15): the parameters a `\{…\}` on the model reads
// and each one's constant limits, read from the parse tree. A restriction is a product with a
// piecewise whose parts are all bare conditions (`a+b\left\{a>0\right\}`, PR-32). Pure TypeScript.

import type { Deadline } from "../deadline";
import { compileExpression, type CompileScope } from "../eval/compile";
import { sourceChildren, withChildren, type Node } from "../latex/ast";
import { collectNameUses } from "../analysis/names";
import type { Restriction } from "../../regression/restriction";
import type { RegressionAnalysis } from "./regression-analysis";

type Bare = Extract<Node, { kind: "piecewise" }>;

const isRestriction = (tree: Node): tree is Bare =>
  tree.kind === "piecewise" &&
  tree.otherwise === null &&
  tree.branches.every((b) => b.value === null);

/** `tree` with every restriction replaced by 1, the model as it stands without them. */
export function withoutRestrictions(tree: Node): Node {
  if (isRestriction(tree)) return { kind: "num", value: 1, span: tree.span };
  const kids = sourceChildren(tree);
  return kids.length === 0 ? tree : withChildren(tree, kids.map(withoutRestrictions));
}

/** Every bare-condition piecewise in `tree`: the restrictions it carries. */
function restrictions(tree: Node, found: Bare[] = []): Bare[] {
  if (isRestriction(tree)) found.push(tree);
  for (const child of sourceChildren(tree)) restrictions(child, found);
  return found;
}

/** The fit's restriction, or undefined when the model has none that reads a parameter. */
export function restrictionOf(
  r: RegressionAnalysis,
  scope: CompileScope,
  deadline: Deadline
): Restriction | undefined {
  const found = restrictions(r.model);
  if (found.length === 0) return undefined;
  const index = new Map(r.params.map((name, j) => [name, j]));
  const reads = new Set<number>();
  const bounds = r.params.map(() => ({ lo: null as number | null, hi: null as number | null }));
  const constant = (node: Node): number | null => {
    if (collectNameUses(node).some((u) => index.has(u.name) || r.predictors.includes(u.name))) {
      return null;
    }
    try {
      const v = compileExpression(node, scope)({}, deadline);
      return v.type === "number" && Number.isFinite(v.value) ? v.value : null;
    } catch {
      return null;
    }
  };
  for (const piecewise of found) {
    for (const { cond } of piecewise.branches) {
      for (const use of collectNameUses(cond)) {
        const j = index.get(use.name);
        if (j !== undefined) reads.add(j);
      }
      // a lone condition's chain `115>a>b>0` limits a by 115 and b by 0 (a>b is no constant)
      if (piecewise.branches.length !== 1) continue;
      cond.ops.forEach((op, i) => {
        if (op === "=") return;
        const [left, right] = [cond.operands[i], cond.operands[i + 1]];
        const upper = op === "<" || op === "<="; // left is below right
        const sides: [Node, Node, boolean][] = [
          [left, right, upper],
          [right, left, !upper],
        ];
        for (const [name, other, below] of sides) {
          const j = name.kind === "id" ? index.get(name.name) : undefined;
          const c = j === undefined ? null : constant(other);
          if (j === undefined || c === null) continue;
          const b = bounds[j];
          if (below) b.hi = b.hi === null ? c : Math.min(b.hi, c);
          else b.lo = b.lo === null ? c : Math.max(b.lo, c);
        }
      });
    }
  }
  return reads.size === 0 ? undefined : { params: [...reads].sort((a, b) => a - b), bounds };
}
