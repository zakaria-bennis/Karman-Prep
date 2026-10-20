// The errors of distribution values (FN-45 to FN-51) analysis can read from the shapes list
// typing tells before anything evaluates, with Desmos's texts (function catalogue,
// distributions, captured live 2026-10-19). Pure TypeScript: no DOM (AR-44).

import { sourceChildren, type Node } from "../latex/ast";
import { MEMBER_NAMES } from "../latex/operator-names";
import { arityText } from "../lib/arity";
import { BUILTINS } from "../lib/builtins";
import { distributionStatistic, isDistributionName, readsDistribution } from "../lib/distributions";
import { listFunction } from "../lib/statistics";
import {
  isDistributionShape,
  SHAPE_NAMES,
  type ListProblem,
  type ListTyping,
  type Shape,
} from "./lists";
import { displayName } from "./messages";

type Call = Extract<Node, { kind: "call" }>;

/** FN-47 to FN-49: the counts each method takes after its distribution. */
const METHOD_ARITY: ReadonlyMap<string, readonly number[]> = new Map([
  ["pdf", [1]],
  ["cdf", [1, 2]],
  ["inversecdf", [1]],
  ["inverseCdf", [1]],
]);

/** The arithmetic Desmos names in "Cannot multiply a distribution by a number." and the like. */
const OPERATOR_CODES = {
  add: "add-types",
  sub: "subtract-types",
  mul: "multiply-types",
  div: "divide-types",
  pow: "power-types",
} as const;

/**
 * The first problem, in source order, with a distribution: a dot after a value that is known and
 * is not a distribution (`L.\operatorname{mean}`, PR-45, not shipped), a method with a count it
 * does not take ("Function '.cdf' requires 2 arguments."), a statistic written as a method, a
 * member a distribution does not have ("Function '.pleft' cannot be applied to a
 * distribution."), a constructor given anything but numbers ("Function 'normaldist' cannot be
 * applied to a point."), pdf called without a distribution and a number ("'pdf' should be called on a
 * distribution with a number. …", or "Function 'pdf' cannot be applied to a number and a
 * number."), a list function other than mean, median, stdev, var and quantile of a distribution
 * ("Function 'stdevp' cannot be applied to a distribution."), any other built-in of one, a
 * distribution name followed by parentheses (`N(1)`: "Cannot call distribution 'N' as a function.
 * Try 'N.pdf(x)'."), and arithmetic on a distribution ("Cannot multiply a distribution by a
 * number."). `text` is the row's normalized LaTeX, which the spans index; `locals` are a function
 * head's parameters.
 */
export function distributionProblem(
  tree: Node,
  locals: readonly string[],
  typing: ListTyping,
  text: string
): ListProblem | null {
  const shape = (node: Node) => typing.shape(node, locals);
  for (const node of nodesInOrder(tree)) {
    const problem =
      node.kind === "call"
        ? callProblem(node, node.args.map(shape))
        : operatorProblem(node, shape, text);
    if (problem !== null) return { ...problem, span: node.span };
  }
  return null;
}

type Problem = Omit<ListProblem, "span">;

function callProblem(call: Call, shapes: readonly (Shape | null)[]): Problem | null {
  const [first = null] = shapes;
  if (call.member !== undefined) return memberProblem(call, first);
  if (isDistributionName(call.name)) {
    const known = shapes.every((s) => s !== null);
    const numbers = shapes.every((s) => s === "number" || s === "numbers");
    return known && !numbers ? applied(call.name, shapes as Shape[]) : null;
  }
  if (call.name === "pdf" && call.args.length !== 2) {
    return { code: "distribution-call", names: ["pdf"] };
  }
  if (!isDistributionShape(first)) {
    if ((call.name === "pdf" || call.name === "cdf") && shapes.every((s) => s !== null)) {
      return applied(call.name, shapes as Shape[]);
    }
    return builtinProblem(call, shapes);
  }
  if (listFunction(call.name) !== undefined && !readsDistribution(call.name)) {
    return applied(call.name, [first]);
  }
  return builtinProblem(call, shapes);
}

/**
 * A dot: after a list of numbers, an inference member is Desmos's "Function '.pleft' cannot be
 * applied to a list of numbers." (captured 2026-10-19); any other dot after a known value that is
 * not a distribution is unsupported (PR-45's list members have not shipped); after a
 * distribution, it is checked as a member.
 */
function memberProblem(call: Call, target: Shape | null): Problem | null {
  const name = `.${call.name}`;
  if (target === null) return null;
  if (target === "numbers" && MEMBER_NAMES.includes(call.name)) return applied(name, [target]);
  if (!isDistributionShape(target)) return { code: "unsupported", names: [] };
  const written = call.args.length - 1,
    arity = METHOD_ARITY.get(call.name);
  if (arity !== undefined && !arity.includes(written)) {
    return { code: "arity", names: [name, arityText(arity), String(written)] };
  }
  if (arity !== undefined) return null;
  if (distributionStatistic(call.name) === undefined) return applied(name, [target]);
  return call.member === "method" ? { code: "unsupported", names: [] } : null;
}

/** An elementwise built-in given a distribution: "Function 'sin' cannot be applied to …". */
function builtinProblem(call: Call, shapes: readonly (Shape | null)[]): Problem | null {
  if (!BUILTINS.has(call.name) || !shapes.some(isDistributionShape)) return null;
  return shapes.every((s) => s !== null) ? applied(call.name, shapes as Shape[]) : null;
}

/**
 * Arithmetic on a distribution, with both operand shapes known: Desmos's "Cannot multiply {a} by
 * {b}." and its kin, and for a distribution name written before parentheses, which reads as a
 * product, "Cannot call distribution 'N' as a function. Try 'N.pdf(x)'.".
 */
function operatorProblem(
  node: Node,
  shape: (node: Node) => Shape | null,
  text: string
): Problem | null {
  if (node.kind === "neg") {
    const a = shape(node.arg);
    return isDistributionShape(a) ? { code: "negate-type", names: [names(a)] } : null;
  }
  if (!(node.kind in OPERATOR_CODES) || !("left" in node)) return null;
  const [a, b] = [shape(node.left), shape(node.right)];
  if (a === null || b === null || !(isDistributionShape(a) || isDistributionShape(b))) return null;
  const { left } = node;
  if (node.kind === "mul" && left.kind === "id" && isDistributionShape(a)) {
    if (text[left.span.end] === "(") {
      return { code: "distribution-function", names: [displayName(left.name)] };
    }
  }
  const code = OPERATOR_CODES[node.kind as keyof typeof OPERATOR_CODES];
  return { code, names: [names(a), names(b)] };
}

const names = (s: Shape) => SHAPE_NAMES[s];

function applied(name: string, shapes: readonly Shape[]): Problem {
  const shown = shapes.map(names);
  const listed =
    shown.length < 3
      ? shown.join(" and ")
      : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  return { code: "argument-type", names: [displayName(name), listed] };
}

/** Every node of `tree` in source order, an outer node before the nodes inside it. */
function nodesInOrder(tree: Node): Node[] {
  const found: Node[] = [],
    pending: Node[] = [tree];
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    found.push(n);
    pending.push(...sourceChildren(n));
  }
  return found.sort((a, b) => a.span.start - b.span.start);
}
