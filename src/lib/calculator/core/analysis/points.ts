// Point arithmetic, coordinates and the point built-ins (NM-32, PR-45, FN-70, FN-71): the shapes
// they give and the errors analysis reads from the shapes list typing tells before anything
// evaluates, with Desmos's texts (function catalogue, geometry, captured live 2026-10-19). Pure
// TypeScript: no DOM (AR-44).

import { coordinateAxis, type Axis, type Node } from "../latex/ast";
import { POINT_FUNCTIONS } from "../lib/geometry";
import { nodesInOrder } from "./distributions";
import {
  SHAPE_NAMES as NAMES,
  type Bound,
  type ListProblem,
  type ListTyping,
  type Shape,
} from "./lists";
import { collectNameUses } from "./names";

type Call = Extract<Node, { kind: "call" }>;

/**
 * FN-70, FN-71: a point built-in's argument shapes, `[]` being an empty list of points, as Desmos
 * reads `distance([],(1,1))` (the empty list, captured 2026-10-19).
 */
function argumentShapes(call: Call, of: (n: Node) => Shape | null): (Shape | null)[] {
  return call.args.map((arg) =>
    arg.kind === "list" && arg.items.length === 0 && arg.range === undefined ? "points" : of(arg)
  );
}

const pointed = (s: Shape | null) => s === "point" || s === "points";
const numeric = (s: Shape | null) => s === "number" || s === "numbers";
const listed = (...shapes: (Shape | null)[]) =>
  shapes.some((s) => s === "numbers" || s === "points");

/** PR-45: `P.x` of a point is a number, of a list of points a list of numbers; else unknown. */
export function coordinateShape(target: Shape | null, axis: Axis): Shape | null {
  if (!pointed(target) || axis === "z") return null;
  return target === "points" ? "numbers" : "number";
}

/**
 * FN-70, FN-71: distance of two points is a number and midpoint a point, a list of either when
 * an argument is a list; unknown otherwise (pointProblem's errors).
 */
export function pointCallShape(call: Call, of: (n: Node) => Shape | null): Shape | null {
  const args = argumentShapes(call, of);
  if (args.length !== 2 || !args.every(pointed)) return null;
  const list = listed(...args);
  if (call.name === "distance") return list ? "numbers" : "number";
  return list ? "points" : "point";
}

/**
 * NM-32: the shape of an operator with a point operand, from its operand shapes; undefined when
 * no operand is a point (the number rules apply), null for what Desmos refuses (pointProblem).
 * Points add and subtract to a point, negate and divide by a number to a point and multiply each
 * other to their dot product, a number (a point times a number is lists.ts's scaledShape); |P| is
 * a number. A list operand gives a list.
 */
export function pointOperatorShape(
  kind: Node["kind"],
  operands: readonly (Shape | null)[]
): Shape | null | undefined {
  const [a, b = null] = operands;
  if (!operands.some(pointed)) return undefined;
  const list = listed(...operands);
  switch (kind) {
    case "neg":
      return a;
    case "abs":
      return list ? "numbers" : "number";
    case "add":
    case "sub":
      return pointed(a) && pointed(b) ? (list ? "points" : "point") : null;
    case "mul":
      return pointed(a) && pointed(b) ? (list ? "numbers" : "number") : undefined;
    case "div":
      return pointed(a) && numeric(b) ? (list ? "points" : "point") : null;
    default:
      return null;
  }
}

/** The arithmetic Desmos names in "Cannot add a point and a number." and the like. */
const OPERATOR_CODES = {
  add: "add-types",
  sub: "subtract-types",
  mul: "multiply-types",
  div: "divide-types",
  pow: "power-types",
} as const;

type Problem = Omit<ListProblem, "span">;

/**
 * The first problem, in source order, with a point: a point or a list as a point's coordinate
 * ("Cannot use a point as a coordinate of a point."); a coordinate of anything but a point
 * ("Cannot access coordinate '.x' of a number.", "… '.z' of a 2d point."); distance or midpoint
 * with more than two arguments, or with anything but two points ("Function 'distance' requires 2
 * points.", "Function 'midpoint' requires a segment or 2 points."), or after a dot ("Function
 * 'distance' cannot be called with dot notation.", "Cannot call '.midpoint' on a point."); and
 * arithmetic Desmos refuses: a point with a number added, subtracted or divided into, a power of
 * a point, a point divided by a point and two points written side by side, which Desmos reads as
 * a product, not the `\cdot` dot product ("Cannot multiply a point by a point."). A name no row
 * defines is a number, as a slider would be; a function head's parameters are unknown. `text` is
 * the row's normalized LaTeX, which the spans index.
 */
export function pointProblem(
  tree: Node,
  locals: readonly string[],
  typing: ListTyping,
  text: string
): ListProblem | null {
  const bound = new Map<string, Shape | null>(locals.map((name) => [name, null]));
  for (const { name, call } of collectNameUses(tree)) {
    if (!call && !locals.includes(name) && !typing.defined.has(name)) bound.set(name, "number");
  }
  const shape = (node: Node) => typing.shape(node, locals, bound as Bound);
  const nodes = nodesInOrder(tree);
  // a point shape starts at a point, a name that holds points, a coordinate or distance and
  // midpoint, so a row with none of them is not typed node by node (deep sums stay linear)
  if (!nodes.some((node) => startsPoint(node, shape))) return null;
  for (const node of nodes) {
    const problem = nodeProblem(node, shape, text);
    if (problem !== null) return { ...problem, span: node.span };
  }
  return null;
}

function startsPoint(node: Node, shape: (n: Node) => Shape | null): boolean {
  if (node.kind === "point" || coordinateAxis(node) !== null) return true;
  if (node.kind === "call") return POINT_FUNCTIONS.has(node.name);
  return node.kind === "id" && pointed(shape(node));
}

function nodeProblem(node: Node, shape: (n: Node) => Shape | null, text: string): Problem | null {
  const axis = coordinateAxis(node);
  if (axis !== null && node.kind === "call") {
    const target = shape(node.args[0]);
    if (target === null || (target === "points" && axis !== "z")) return null;
    if (target === "point") {
      return axis === "z" ? { code: "coordinate-type", names: [axis, "a 2d point"] } : null;
    }
    return { code: "coordinate-type", names: [axis, NAMES[target]] };
  }
  switch (node.kind) {
    case "point": {
      const part = [shape(node.x), shape(node.y)].find(pointed);
      return part === undefined || part === null
        ? null
        : { code: "point-coordinate-type", names: [NAMES[part]] };
    }
    case "call":
      return POINT_FUNCTIONS.has(node.name) ? callProblem(node, argumentShapes(node, shape)) : null;
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow": {
      const [a, b] = [shape(node.left), shape(node.right)];
      if (a === null || b === null || !(pointed(a) || pointed(b))) return null;
      if (!(pointed(a) || numeric(a)) || !(pointed(b) || numeric(b))) return null;
      if (refused(node.kind, a, b, besideEachOther(node.left, node.right, text))) {
        return { code: OPERATOR_CODES[node.kind], names: [NAMES[a], NAMES[b]] };
      }
      return null;
    }
    default:
      return null;
  }
}

/** Whether Desmos refuses `a op b` with a point on a side: see pointProblem. */
function refused(kind: keyof typeof OPERATOR_CODES, a: Shape, b: Shape, beside: boolean): boolean {
  switch (kind) {
    case "add":
    case "sub":
      return !(pointed(a) && pointed(b));
    case "mul":
      return pointed(a) && pointed(b) && beside;
    case "div":
      return !(pointed(a) && numeric(b));
    case "pow":
      return true;
  }
}

/** A product written by juxtaposition: nothing but spaces between its factors, `(1,2)(3,4)`. */
function besideEachOther(left: Node, right: Node, text: string): boolean {
  return text.slice(left.span.end, right.span.start).trim() === "";
}

/** FN-70, FN-71: what Desmos asks distance and midpoint for. */
const REQUIRES: Readonly<Record<string, string>> = {
  distance: "2 points",
  midpoint: "a segment or 2 points",
};

function callProblem(call: Call, shapes: readonly (Shape | null)[]): Problem | null {
  const { name } = call;
  if (call.member !== undefined) {
    if (name === "distance") return { code: "dot-call", names: [name] };
    const target = shapes[0];
    return target === null ? null : { code: "member-target", names: [name, NAMES[target]] };
  }
  if (shapes.length > 2) return { code: "point-function-arity", names: [name, "2"] };
  const known = shapes.length < 2 || shapes.every((s) => s !== null);
  if (known && !(shapes.length === 2 && shapes.every(pointed))) {
    return { code: "point-function-arguments", names: [name, REQUIRES[name]] };
  }
  return null;
}
