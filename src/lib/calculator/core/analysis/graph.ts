// The shape of a row that defines nothing (RC-2, RC-11 to RC-15, RC-17): its kind, graph
// descriptor, shape error and relation; and the graph of a one-parameter function definition
// (RC-5). Pure TypeScript: no DOM (AR-44).

import type { RowErrorCode, RowKind } from "../corpus/types";
import type { InequalityOp, Node, RelOp, SourceSpan } from "../latex/ast";
import type { RowGraph } from "./index";
import { displayName } from "./messages";

export interface RowShape {
  kind: RowKind;
  graph: RowGraph | null; // before classifyRow's hidden, chips and error filter
  error: { code: RowErrorCode; names: string[] } | null;
  relation: { ops: RelOp[] } | null;
}

/** The polar coordinates, which Phase 1 does not graph (RC-2, RC-18). */
export const POLAR_NAMES: readonly string[] = ["r", "\\theta"];

/**
 * Classifies a tree that defines nothing, by RC-2's order: r or θ anywhere is `unsupported`;
 * then a point or a list of points (RC-15, G-3: `pointed`, isPointShaped or its typed shape), a relation (RC-11 to RC-14) or a bare expression (RC-17). `coordinatesOf`
 * gives the coordinates a node reaches through definitions; `unboundT` is true when a `t` inside
 * the point has no defining row. A relation with no coordinates is a `constant-relation` here:
 * classifyRow makes it an `unsolved-relation` when the row has chips (RC-13), which depend on the
 * other rows. `relation` is `{ ops }` for every relation.
 */
export function shapeOf(
  tree: Node,
  coordinatesOf: (node: Node) => ReadonlySet<string>,
  unboundT: boolean,
  pointed: boolean
): RowShape {
  const coordinates = coordinatesOf(tree);
  const relation = tree.kind === "rel" ? { ops: [...tree.ops] } : null;
  if (relation === null && !pointed) return expressionShape(tree, coordinates);
  const polar = [...coordinates].find((name) => POLAR_NAMES.includes(name));
  if (polar !== undefined) return failed("unsupported", [displayName(polar)], relation);
  if (pointed) {
    if (unboundT) return failed("unsupported", ["t"], relation);
    if (coordinates.has("x") || coordinates.has("y")) {
      return failed("point-coordinates", [], relation);
    }
    return shape("point", { kind: "point" });
  }
  if (tree.kind === "rel") {
    const problem = coordinates.size > 0 ? chainProblem(tree, coordinatesOf) : null;
    if (problem !== null) return failed(problem, [], relation);
    const shaped =
      tree.ops[0] === "="
        ? equationShape(tree, coordinates, coordinatesOf)
        : chainShape(tree, coordinates);
    return { ...shaped, relation };
  }
  return expressionShape(tree, coordinates);
}

/**
 * RC-17, a bare expression as Desmos reads it (captured 2026-10-20): in x alone it graphs y=…;
 * otherwise it asks for an equation: 'r=' for θ alone ("Try adding 'r=' to the beginning of this
 * equation.") and "Try adding an equals sign to turn this into an equation." for x with y or r
 * with θ. r without θ is a name like any other to Desmos, so it asks for 'y=' (or names r when x
 * or y is there too), and θ beside x or y is "Too many variables, I don't know what to do with
 * this.". classifyRow lets undefined names (chips) speak first. In y alone Desmos asks for 'x=';
 * this calculator still graphs x=… there, which question transfer relies on.
 */
function expressionShape(tree: Node, coordinates: ReadonlySet<string>): RowShape {
  const [x, y, r, theta] = ["x", "y", "r", "\\theta"].map((c) => coordinates.has(c));
  if (theta && (x || y)) return failed("too-many-variables", [], null);
  if ((x && y) || (r && theta)) return failed("mixed-variables", [], null);
  if (r)
    return x || y
      ? failed("too-many-variables", ["r"], null)
      : failed("equation-required", ["y="], null);
  if (theta) return failed("equation-required", ["r="], null);
  if (x) return shape("curve-y", { kind: "explicit", independent: "x", expr: tree });
  if (y) return shape("curve-x", { kind: "explicit", independent: "y", expr: tree });
  return shape("value", null);
}

/**
 * RC-5 and : a one-parameter function definition graphs as y = f(x), whatever its
 * parameter is called, with every node spanning the row (`span`); more parameters give null.
 */
export function functionGraph(
  name: string,
  params: readonly string[],
  span: SourceSpan
): RowGraph | null {
  if (params.length !== 1) return null;
  const x: Node = { kind: "id", name: "x", span };
  return { kind: "explicit", independent: "x", expr: { kind: "call", name, args: [x], span } };
}

type Rel = Extract<Node, { kind: "rel" }>;

/**
 * RC-11 and RC-12: exactly `y` on one side with no `y` on the other gives y = f(x) or, without x,
 * horizontal lines; then the same for `x`. Any other equation is implicit in x and y, vertical
 * lines in x alone, horizontal lines in y alone, and a constant relation without coordinates.
 */
function equationShape(
  tree: Rel,
  coordinates: ReadonlySet<string>,
  coordinatesOf: (node: Node) => ReadonlySet<string>
): RowShape {
  const [left, right] = tree.operands;
  for (const [axis, other] of [
    ["y", "x"],
    ["x", "y"],
  ] as const) {
    const solved = solvedFor(axis, left, right, coordinatesOf);
    if (solved === null) continue;
    const [id, side] = solved;
    if (coordinatesOf(side).has(other)) {
      return shape(axis === "y" ? "curve-y" : "curve-x", {
        kind: "explicit",
        independent: other,
        expr: side,
      });
    }
    const expr: Node = { kind: "sub", left: id, right: side, span: tree.span };
    return axis === "y"
      ? shape("horizontal-lines", { kind: "lines", orientation: "horizontal", expr })
      : shape("vertical-lines", { kind: "lines", orientation: "vertical", expr });
  }
  const expr: Node = { kind: "sub", left, right, span: tree.span };
  if (coordinates.has("x") && coordinates.has("y"))
    return shape("implicit", { kind: "implicit", expr });
  if (coordinates.has("x"))
    return shape("vertical-lines", { kind: "lines", orientation: "vertical", expr });
  if (coordinates.has("y"))
    return shape("horizontal-lines", { kind: "lines", orientation: "horizontal", expr });
  return shape("constant-relation", null);
}

/** The `(id axis)` side and the other side when one side is exactly `axis` and the other lacks it. */
function solvedFor(
  axis: "x" | "y",
  left: Node,
  right: Node,
  coordinatesOf: (node: Node) => ReadonlySet<string>
): [Node, Node] | null {
  if (isId(left, axis) && !coordinatesOf(right).has(axis)) return [left, right];
  if (isId(right, axis) && !coordinatesOf(left).has(axis)) return [right, left];
  return null;
}

/**
 * RC-14: why a chain with coordinates cannot graph, as Desmos refuses it: chained equations, more
 * than two inequalities, a double inequality whose middle is not x or y or whose sides use it
 * (`x<1<2`), then one pointing both ways (`1<y>0`); null for a single relation or a graphable
 * double inequality. Chains without coordinates evaluate link by link.
 */
function chainProblem(
  tree: Rel,
  coordinatesOf: (node: Node) => ReadonlySet<string>
): RowErrorCode | null {
  const { ops, operands } = tree;
  if (ops.length < 2) return null;
  if (ops[0] === "=") return "chained-equation";
  if (ops.length > 2) return "long-chain";
  const [low, middle, high] = operands;
  const solved =
    middle.kind === "id" &&
    (middle.name === "x" || middle.name === "y") &&
    !coordinatesOf(low).has(middle.name) &&
    !coordinatesOf(high).has(middle.name);
  if (!solved) return "double-inequality";
  return ops[0][0] === ops[1][0] ? null : "double-direction";
}

/**
 * RC-14: an inequality chain with coordinates is a region, as written; one without is a constant
 * relation that shades the whole view when it holds.
 */
function chainShape(tree: Rel, coordinates: ReadonlySet<string>): RowShape {
  const ops = tree.ops.filter((op): op is InequalityOp => op !== "="),
    operands = tree.operands;
  if (coordinates.size > 0) return shape("region", { kind: "region", operands, ops });
  return shape("constant-relation", { kind: "constant-region", operands, ops });
}

/**
 * RC-15, G-3, PR-31, PR-32: a tree that is a point or a list of points as written, so plots like
 * one: a point, a list literal of points or an index of one, a piecewise whose every value is
 * point-shaped (`\{a>0:(1,2),(3,4)\}`), and a point-shaped tree times a piecewise that is not,
 * a restriction (`(1,2)\{a>0\}`, `\{a>0\}(1,2)`), as Desmos graphs them (captured 2026-10-19).
 */
export function isPointShaped(tree: Node): boolean {
  switch (tree.kind) {
    case "point":
      return true;
    case "piecewise": {
      const values = tree.branches.map(({ value }) => value);
      if (tree.otherwise !== null) values.push(tree.otherwise);
      return values.length > 0 && values.every((v) => v !== null && isPointShaped(v));
    }
    case "mul":
      return (
        (isPointShaped(tree.left) && isRestriction(tree.right)) ||
        (isRestriction(tree.left) && isPointShaped(tree.right))
      );
    default:
      return isPointList(tree);
  }
}

function isRestriction(node: Node): boolean {
  return node.kind === "piecewise" && !isPointShaped(node);
}

/**
 * G-3: a list literal of points, such as `[(1,2),(3,4)]`, plots like a point (RC-15), and so does
 * an index of one (NM-30: `[(1,2),(3,4)][1]` is a point).
 */
function isPointList(tree: Node): boolean {
  if (tree.kind === "index") return isPointList(tree.target);
  return (
    tree.kind === "list" &&
    tree.range === undefined &&
    tree.items.length > 0 &&
    tree.items.every((item) => item.kind === "point")
  );
}

function isId(node: Node, name: string): boolean {
  return node.kind === "id" && node.name === name;
}

function shape(kind: RowKind, graph: RowGraph | null): RowShape {
  return { kind, graph, error: null, relation: null };
}

function failed(code: RowErrorCode, names: string[], relation: RowShape["relation"]): RowShape {
  return { kind: "error", graph: null, error: { code, names }, relation };
}
