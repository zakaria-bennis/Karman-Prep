// Create table (D-13): for a row y=E(x) or f(x)=E, the header of the computed column a new table
// shows against its first column, E with x renamed to that column's name, or f(xₙ). Pure
// TypeScript: no DOM.

import { parseLatex } from "../latex/index";
import type { Node } from "../latex/ast";
import { printLatex } from "../latex/printer";

/** `tree` with every id `from` renamed `to`. */
function rename(tree: Node, from: string, to: string): Node {
  const walk = (n: Node): Node => {
    switch (n.kind) {
      case "id":
        return n.name === from ? { ...n, name: to } : n;
      case "add":
      case "sub":
      case "mul":
      case "div":
      case "pow":
        return { ...n, left: walk(n.left), right: walk(n.right) };
      case "neg":
      case "pct":
      case "deg":
      case "fact":
      case "abs":
        return { ...n, arg: walk(n.arg) };
      case "root":
        return { ...n, arg: walk(n.arg), index: n.index === null ? null : walk(n.index) };
      case "call":
        return { ...n, args: n.args.map(walk) };
      case "point":
        return { ...n, x: walk(n.x), y: walk(n.y) };
      case "rel":
        return { ...n, operands: n.operands.map(walk) };
      case "list":
        return { ...n, items: n.items.map(walk) };
      case "index":
        return { ...n, target: walk(n.target), items: n.items.map(walk) };
      case "piecewise":
        return {
          ...n,
          branches: n.branches.map(({ cond, value }) => ({
            cond: { ...cond, operands: cond.operands.map(walk) },
            value: value === null ? null : walk(value),
          })),
          otherwise: n.otherwise === null ? null : walk(n.otherwise),
        };
      default:
        return n;
    }
  };
  return walk(tree);
}

const uses = (tree: Node, name: string): boolean =>
  printLatex(rename(tree, name, "\\placeholder")) !== printLatex(tree);

/**
 * D-13: the computed header for a first column named `x`, or null when `latex` is not y=E(x) with
 * E free of y, or f(t)=E for a one-parameter function f.
 */
export function tableHeaderFor(
  latex: string,
  userFunctions: ReadonlySet<string>
): ((x: string) => string) | null {
  const parsed = parseLatex(latex, { userFunctions });
  if (!parsed.ok) return null;
  const tree = parsed.tree;
  if (tree.kind !== "rel" || tree.ops.length !== 1 || tree.ops[0] !== "=") return null;
  const [lhs, rhs] = tree.operands;
  if (lhs.kind === "id" && lhs.name === "y" && !uses(rhs, "y")) {
    // `y=x` would name the first column twice, so, as the reference writes `1x`, the header is
    // `1x_{1}` (live Desmos, 2026-10-20)
    if (rhs.kind === "id" && rhs.name === "x") return (x) => `1${x}`;
    return (x) => printLatex(rename(rhs, "x", x));
  }
  if (lhs.kind === "call" && userFunctions.has(lhs.name) && lhs.args.length === 1) {
    const [param] = lhs.args;
    if (param.kind !== "id") return null;
    return (x) => printLatex({ ...lhs, args: [{ ...param, name: x }] });
  }
  return null;
}
