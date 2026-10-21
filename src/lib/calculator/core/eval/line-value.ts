// A line row's value, as Desmos shows it (captured 2026-10-20): `y=1+1`, `x=\sqrt{2}` and
// `y=0/0` show the value of their constant side ("= 2", "= 1.41421356237", "undefined") beside
// the line they draw, while `y=2` (a slider) and `y=[1,2]` (a literal) show none. Pure
// TypeScript: no DOM (AR-44).

import { sourceChildren, type Node } from "../latex/ast";

/** The constant side of `x=c` or `y=c` (the coordinate written on the left), or null. */
export function lineConstantSide(tree: Node | null): Node | null {
  if (tree?.kind !== "rel" || tree.ops.length !== 1 || tree.ops[0] !== "=") return null;
  const [left, right] = tree.operands;
  if (left.kind !== "id" || (left.name !== "x" && left.name !== "y")) return null;
  const pending: Node[] = [right];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (node.kind === "id" && (node.name === "x" || node.name === "y")) return null;
    pending.push(...sourceChildren(node));
  }
  return right;
}
