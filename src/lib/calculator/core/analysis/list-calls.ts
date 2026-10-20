// The argument errors of list function calls (FN-2, FN-23 to FN-29, FN-75), with Desmos's texts
// (function catalogue, captured live 2026-10-19), read from the argument shapes list typing can
// tell before anything evaluates. Pure TypeScript: no DOM (AR-44).

import { sourceChildren, type Node } from "../latex/ast";
import { listFunction } from "../lib/statistics";
import { SHAPE_NAMES, type ListProblem, type ListTyping, type Shape } from "./lists";
import { displayName } from "./messages";

type Call = Extract<Node, { kind: "call" }>;

/**
 * The first list function call, in source order, whose arguments Desmos refuses: quantile or
 * quartile of a number or a point ("The first argument of 'quantile' must be a list."), or of a
 * list of points ("Function 'quantile' cannot be applied to a list of points and a number."); a
 * point or a list of points given to a reducer that only takes numbers ("Function 'median' cannot
 * be applied to a point."); and length with a list beside another argument ("Function 'length'
 * cannot be applied to a list of numbers and a number."). An argument whose shape analysis cannot
 * tell is not checked. `locals` are a function head's parameters.
 */
export function listCallProblem(
  tree: Node,
  locals: readonly string[],
  typing: ListTyping
): ListProblem | null {
  for (const call of listCalls(tree)) {
    const fn = listFunction(call.name);
    if (fn === undefined || call.args.length === 0) continue;
    const shapes = call.args.map((arg) => typing.shape(arg, locals)),
      name = displayName(call.name),
      known = !shapes.includes(null),
      applied = (k: string): ListProblem => ({
        code: "argument-type",
        names: [name, k],
        span: call.span,
      });
    if (fn.kind === "parameterized") {
      if (call.args.length !== 2) continue;
      if (shapes[0] === "number" || shapes[0] === "point") {
        return { code: "first-argument-list", names: [name], span: call.span };
      }
      if (shapes[0] === "points" && known) return applied(described(shapes as Shape[]));
    } else if (fn.kind === "length") {
      const lists = shapes.some((s) => s === "numbers" || s === "points");
      if (call.args.length > 1 && lists && known) return applied(described(shapes as Shape[]));
    } else if (!fn.points && shapes.some((s) => s === "point" || s === "points")) {
      return applied(SHAPE_NAMES.point);
    }
  }
  return null;
}

/** The argument shapes as Desmos lists them: "a list of numbers and a number". */
function described(shapes: readonly Shape[]): string {
  const names = shapes.map((s) => SHAPE_NAMES[s]);
  return names.length < 3
    ? names.join(" and ")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Every list function call in `tree`, in source order. */
function listCalls(tree: Node): Call[] {
  const calls: Call[] = [],
    pending: Node[] = [tree];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (node.kind === "call" && listFunction(node.name) !== undefined) calls.push(node);
    pending.push(...sourceChildren(node));
  }
  return calls.sort((a, b) => a.span.start - b.span.start);
}
