// The argument errors of list function calls (FN-2, FN-23 to FN-38, FN-75), with Desmos's texts
// (function catalogue, captured live 2026-10-19), read from the argument shapes list typing can
// tell before anything evaluates. Pure TypeScript: no DOM (AR-44).

import { sourceChildren, type Node } from "../latex/ast";
import { REFUSED_NAMES } from "../latex/operator-names";
import { BUILTIN_ARITY } from "../lib/arity";
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
 * cannot be applied to a list of numbers and a number."). The two-list statistics and list
 * operations follow operationProblem. An argument whose shape analysis cannot tell is not
 * checked. `locals` are a function head's parameters.
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
    if (fn.kind === "double" || fn.kind === "operation") {
      // a count Desmos does not accept is classify.ts's arity error
      const counts = BUILTIN_ARITY.get(call.name);
      if (counts !== undefined ? !counts.includes(call.args.length) : call.args.length < 2)
        continue;
      const problem = operationProblem(call.name, shapes);
      if (problem === "both-lists") return { code: problem, names: [name], span: call.span };
      if (problem === "first-list")
        return { code: "first-argument-list", names: [name], span: call.span };
      if (problem !== null && known) return applied(described(shapes as Shape[]));
      // Desmos refuses these only once their arguments pass
      if (REFUSED_NAMES.includes(call.name))
        return { code: "refused-function", names: [name], span: call.span };
    } else if (fn.kind === "parameterized") {
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

const isNumberShape = (s: Shape | null) => s === "number" || s === "numbers";
const isPointShape = (s: Shape | null) => s === "point" || s === "points";
const isListShape = (s: Shape | null) => s === "numbers" || s === "points";

/**
 * FN-30 to FN-38, at Desmos's arity (classify.ts checks that first): "both-lists" when a two-list
 * statistic has a number or point argument (`cov(1,2)`, `cov(S,x)`), "applied" when Desmos names
 * the argument shapes: a two-list statistic of points, sort or unique of a number or point, sort
 * of points without keys or with keys that are not numbers, repeat other than a value and a
 * number or two lists of numbers counts, and join mixing numbers and points. The hidden names, by
 * Desmos's signatures: sortPerm and complexSortPerm take a list of numbers, uniquePerm any list,
 * repeatAssert a value and a number, frequencyList and frequencyListAssert a list and a list of
 * numbers, and sortedLastLessIndex and sortedLastLessEqualIndex a list of numbers first
 * ("first-list" for a number or a point there, as quantile). Else null.
 */
function operationProblem(
  name: string,
  shapes: readonly (Shape | null)[]
): "both-lists" | "applied" | "first-list" | null {
  const [first, second] = shapes;
  const unknown = first === null || second === null;
  switch (name) {
    case "sortPerm":
    case "complexSortPerm":
      return first === "numbers" || first === null ? null : "applied";
    case "uniquePerm":
      return isListShape(first) || first === null ? null : "applied";
    case "repeatAssert":
      return unknown || ((first === "number" || first === "point") && second === "number")
        ? null
        : "applied";
    case "frequencyList":
    case "frequencyListAssert":
      return unknown || (isListShape(first) && second === "numbers") ? null : "applied";
    case "sortedLastLessIndex":
    case "sortedLastLessEqualIndex":
      if (first === "number" || first === "point") return "first-list";
      return first === "points" ? "applied" : null;
    case "cov":
    case "covp":
    case "corr":
    case "spearman":
      if (shapes.some((s) => s === "number" || s === "point")) return "both-lists";
      return shapes.includes("points") ? "applied" : null;
    case "sort":
      if (shapes.length === 1) return first === "numbers" || first === null ? null : "applied";
      return (isListShape(first) || first === null) && (second === "numbers" || second === null)
        ? null
        : "applied";
    case "unique":
      return isListShape(first) || first === null ? null : "applied";
    case "repeat": {
      const single = first === "number" || first === "point";
      if (first === null || second === null) return null;
      return (single && second === "number") || (isListShape(first) && second === "numbers")
        ? null
        : "applied";
    }
    case "join":
      return shapes.some(isNumberShape) && shapes.some(isPointShape) ? "applied" : null;
    default:
      return null;
  }
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
