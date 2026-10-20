// The argument errors of list function calls (FN-2, FN-23 to FN-38, FN-75), with Desmos's texts
// (function catalogue, captured live 2026-10-19), read from the argument shapes list typing can
// tell before anything evaluates. Pure TypeScript: no DOM (AR-44).

import { sourceChildren, type Node } from "../latex/ast";
import { REFUSED_NAMES } from "../latex/operator-names";
import { BUILTIN_ARITY } from "../lib/arity";
import { BUILTINS } from "../lib/builtins";
import { listFunction } from "../lib/statistics";
import { SHAPE_NAMES, type Bound, type ListProblem, type ListTyping, type Shape } from "./lists";
import { displayName } from "./messages";

type Call = Extract<Node, { kind: "call" }>;
/** A call, or a square root as the call `sqrt` Desmos names in its errors. */
type Checked = Pick<Call, "name" | "args" | "span">;

/**
 * The first list function call, in source order, whose arguments Desmos refuses: quantile or
 * quartile of a number or a point ("The first argument of 'quantile' must be a list."), or of a
 * list of points ("Function 'quantile' cannot be applied to a list of points and a number."); a
 * point or a list of points given to a reducer that only takes numbers ("Function 'median' cannot
 * be applied to a point."); and length with a list beside another argument ("Function 'length'
 * cannot be applied to a list of numbers and a number."). The two-list statistics and list
 * operations follow operationProblem. Every other built-in (FN-4, elementary functions and
 * square and nth roots) takes numbers only, so a point or a list of points reads "Function 'sin'
 * cannot be applied to a point." (several arguments: "… to a point and a number.", an nth root
 * being Desmos's `nthroot(radicand, index)`). A user function called with a point or a list of
 * points is checked as Desmos type-checks it, its body with those parameter shapes, the error at
 * the call (`f((1,2))` with `f(x)=\sin(x)` reads "Function 'sin' cannot be applied to a point.").
 * An argument whose shape analysis cannot tell is not checked. `locals` are a function head's
 * parameters, `bound` the shapes a call gave them and `calling` the user functions being checked.
 */
export function listCallProblem(
  tree: Node,
  locals: readonly string[],
  typing: ListTyping,
  bound: Bound = new Map(),
  calling: ReadonlySet<string> = new Set()
): ListProblem | null {
  for (const call of checkedCalls(tree, typing)) {
    const fn = listFunction(call.name);
    if (call.args.length === 0) continue;
    const shapes = call.args.map((arg) => typing.shape(arg, locals, bound)),
      name = displayName(call.name),
      known = !shapes.includes(null),
      applied = (k: string): ListProblem => ({
        code: "argument-type",
        names: [name, k],
        span: call.span,
      });
    const definition = typing.functions.get(call.name);
    if (definition !== undefined) {
      const problem = userCallProblem(call, shapes, typing, calling);
      if (problem !== null) return problem;
    } else if (fn === undefined) {
      // a count Desmos does not accept is classify.ts's arity error
      const counts = BUILTIN_ARITY.get(call.name) ?? (call.name === "nthroot" ? [2] : [1]);
      const elements = shapes.map((s) =>
        s === "points" ? "point" : s === "numbers" ? "number" : s
      );
      if (counts.includes(call.args.length) && elements.includes("point") && known)
        return applied(described(elements as Shape[]));
    } else if (fn.kind === "double" || fn.kind === "operation") {
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

/**
 * A user function call with a point or a list of points among its arguments: the first problem in
 * its body with each parameter given its argument's shape, at the call's span. A count that does
 * not match the parameters is classify.ts's arity error, and a function already being checked (a
 * cycle) is not checked again.
 */
function userCallProblem(
  call: Checked,
  shapes: readonly (Shape | null)[],
  typing: ListTyping,
  calling: ReadonlySet<string>
): ListProblem | null {
  const definition = typing.functions.get(call.name);
  if (definition === undefined || calling.has(call.name)) return null;
  const { params, body } = definition;
  if (params.length !== shapes.length || !shapes.some(isPointShape)) return null;
  const bound = new Map(params.map((param, i) => [param, shapes[i]]));
  const problem = listCallProblem(body, params, typing, bound, new Set([...calling, call.name]));
  return problem === null ? null : { ...problem, span: call.span };
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

/**
 * Every built-in call, user function call and root in `tree`, in source order; a square root is
 * the call `sqrt` and an nth root `nthroot(radicand, index)`, as Desmos names them in its errors.
 */
function checkedCalls(tree: Node, typing: ListTyping): Checked[] {
  const calls: Checked[] = [],
    pending: Node[] = [tree];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    const { kind } = node;
    if (
      kind === "call" &&
      (listFunction(node.name) !== undefined ||
        BUILTINS.has(node.name) ||
        typing.functions.has(node.name))
    )
      calls.push(node);
    if (kind === "root") {
      const [name, args] =
        node.index === null ? ["sqrt", [node.arg]] : ["nthroot", [node.arg, node.index]];
      calls.push({ name, args, span: node.span });
    }
    pending.push(...sourceChildren(node));
  }
  return calls.sort((a, b) => a.span.start - b.span.start);
}
