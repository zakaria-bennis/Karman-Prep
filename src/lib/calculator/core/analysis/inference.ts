// The errors of inference values (FN-53 to FN-58) analysis can read from list typing's shapes,
// in source order (live Desmos, College Board version, captured 2026-10-26):
// - a test function given arguments of the wrong kinds, `ttest([1,2,3],2)` ("Function 'ttest'
//   cannot be applied to a list of numbers and a number."), and chisqtest of fewer than 2 lists;
// - a member the value does not have, `ztest(L,2).dof` ("Function '.dof' cannot be applied to a
//   one-sample z-inference object."), and `.null` or `.conf` without one number ("Function '.null'
//   requires an argument.");
// - arithmetic on a test ("Cannot add a one-sample t test and a number.").
// Pure TypeScript: no DOM (AR-44).

import type { Node } from "../latex/ast";
import { BUILTIN_ARITY } from "../lib/arity";
import { nodesInOrder } from "./distributions";
import {
  fitsPattern,
  hasInferenceMember,
  INFERENCE_CALLS,
  INFERENCE_METHODS,
  isInferenceShape,
} from "./inference-shapes";
import { SHAPE_NAMES, type ListProblem, type ListTyping, type Shape } from "./lists";

type Problem = Omit<ListProblem, "span">;
type Call = Extract<Node, { kind: "call" }>;

const OPERATOR_CODES = {
  add: "add-types",
  sub: "subtract-types",
  mul: "multiply-types",
  div: "divide-types",
  pow: "power-types",
} as const;

/** Shapes as Desmos lists them: "a and b", "a, b and c". */
function listed(shapes: readonly Shape[]): string {
  const shown = shapes.map((s) => SHAPE_NAMES[s]);
  return shown.length < 3
    ? shown.join(" and ")
    : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

function callProblem(call: Call, shapes: readonly (Shape | null)[]): Problem | null {
  if (call.member === undefined) {
    if (!INFERENCE_CALLS.has(call.name)) return null;
    if (call.name === "chisqtest" && shapes.length < 2) {
      return { code: "arity", names: [call.name, "2", String(shapes.length)] };
    }
    if (shapes.length === 0 || shapes.some((s) => s === null)) return null;
    if (fitsPattern(call.name, shapes)) return null;
    // a count the function never takes is classify's arity error
    const counts = BUILTIN_ARITY.get(call.name);
    if (counts !== undefined && !counts.includes(shapes.length)) return null;
    return { code: "argument-type", names: [call.name, listed(shapes as Shape[])] };
  }
  const target = shapes[0] ?? null;
  if (!isInferenceShape(target)) return null;
  if (!hasInferenceMember(target, call.name)) {
    return { code: "member-target", names: [call.name, SHAPE_NAMES[target]] };
  }
  const written = call.args.length - 1;
  if (INFERENCE_METHODS.has(call.name) && written !== 1) {
    return { code: "arity", names: [`.${call.name}`, "1", String(written)] };
  }
  return null;
}

/** Arithmetic with a test, both operand shapes known. */
function operatorProblem(node: Node, shape: (n: Node) => Shape | null): Problem | null {
  if (node.kind === "neg") {
    const a = shape(node.arg);
    return isInferenceShape(a) ? { code: "negate-type", names: [SHAPE_NAMES[a]] } : null;
  }
  if (!(node.kind in OPERATOR_CODES) || !("left" in node)) return null;
  const [a, b] = [shape(node.left), shape(node.right)];
  if (a === null || b === null || !(isInferenceShape(a) || isInferenceShape(b))) return null;
  const code = OPERATOR_CODES[node.kind as keyof typeof OPERATOR_CODES];
  return { code, names: [SHAPE_NAMES[a], SHAPE_NAMES[b]] };
}

/** The first inference error in `tree`, in source order; `locals` are a function's parameters. */
export function inferenceProblem(
  tree: Node,
  locals: readonly string[],
  typing: ListTyping
): ListProblem | null {
  const shape = (node: Node) => typing.shape(node, locals);
  for (const node of nodesInOrder(tree)) {
    const problem =
      node.kind === "call" ? callProblem(node, node.args.map(shape)) : operatorProblem(node, shape);
    if (problem !== null) return { ...problem, span: node.span };
  }
  return null;
}
