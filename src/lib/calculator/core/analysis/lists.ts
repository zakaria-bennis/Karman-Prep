// Which names and calls hold lists, read from the rows before anything evaluates (PR-34, NM-32),
// and the list errors analysis can report from that: indexing what is not a list, or by a point
// (NM-30), nested lists (NM-34), literal ranges with a count Desmos rejects or too many elements
// (NM-35, NM-36), lists whose length depends on a free variable (NM-31, NM-36) and list-valued
// graphs, which are deferred (G-22). Evaluation still reports any list error these rules cannot
// see. Pure TypeScript: no DOM (AR-44).

import type { RowErrorCode } from "../corpus/types";
import { sourceChildren as childNodes, type Node, type SourceSpan } from "../latex/ast";
import { DEFERRED_FEATURES } from "../latex/errors";
import { isBuiltinName } from "../latex/operator-names";
import { isDistributionName, readsDistribution } from "../lib/distributions";
import { rangeShape } from "../lib/range";
import { givesList, listFunction } from "../lib/statistics";
import type { DefinitionHead } from "./definitions";
import { displayName } from "./messages";
import { collectNameUses, COORDINATE_NAMES, lengthShaping } from "./names";

export interface ListTyping {
  names: ReadonlySet<string>; // value names that hold a list
  defined: ReadonlySet<string>; // every name a row, a table column or a regression defines
  isList(node: Node, locals: readonly string[]): boolean; // a list, or a list of points
  /** null when unknown; a `bound` local has the given shape instead of a number's */
  shape(node: Node, locals: readonly string[], bound?: Bound): Shape | null;
  functions: ReadonlyMap<string, DefinitionHead>; // the function heads, by name
}
/** The shapes a call gives a function's parameters, null where analysis cannot tell. */
export type Bound = ReadonlyMap<string, Shape | null>;
const UNBOUND: Bound = new Map();
/**
 * NM-30: a value's type as Desmos names it in "Cannot index {a number} with {a point}.";
 * FN-45: a distribution or a list of them.
 */
export type Shape = "number" | "point" | "numbers" | "points" | "distribution" | "distributions";
export const SHAPE_NAMES: Readonly<Record<Shape, string>> = {
  number: "a number",
  point: "a point",
  numbers: "a list of numbers",
  points: "a list of points",
  distribution: "a distribution",
  distributions: "a list of distributions",
};
/** FN-45: a distribution or a list of them. */
export const isDistributionShape = (s: Shape | null) =>
  s === "distribution" || s === "distributions";
type Bracket = Extract<Node, { kind: "list" | "index" }>;
type Index = Extract<Node, { kind: "index" }>;
type Call = Extract<Node, { kind: "call" }>;
type Piecewise = Extract<Node, { kind: "piecewise" }>;

export interface ListProblem {
  code: RowErrorCode;
  names: string[];
  span: SourceSpan | null;
}

/**
 * The list typing of `heads`: a value name holds a list when its body is list-valued, and a
 * function returns one when its body is with its parameters read as numbers. `seeds` hold lists
 * of numbers whatever defines them (table columns, regression residuals) and `scalars` never hold
 * a list (fitted parameters). A value name's shape is its body's. `defined` adds names defined
 * where `heads` cannot show it. Computed to a fixed point, so definitions resolve in any order
 * and cycles end.
 */
export function inferLists(
  heads: readonly DefinitionHead[],
  seeds: Iterable<string>,
  scalars: ReadonlySet<string> = new Set(),
  defined: Iterable<string> = []
): ListTyping {
  const names = new Set<string>(),
    functions = new Set<string>(),
    shapes = new Map<string, Shape>();
  for (const name of seeds) {
    if (COORDINATE_NAMES.includes(name)) continue;
    names.add(name);
    shapes.set(name, "numbers");
  }
  for (const name of scalars) shapes.set(name, "number");
  const typing: ListTyping = {
    names,
    defined: new Set([...defined, ...names, ...scalars, ...heads.map((h) => h.name)]),
    isList: (node, locals) => listValued(node, locals, names, functions),
    shape: (node, locals, bound = UNBOUND) => shapeOf(node, locals, shapes, bound),
    functions: new Map(heads.filter((h) => h.type === "function").map((h) => [h.name, h])),
  };
  for (let changed = true; changed; ) {
    changed = false;
    for (const head of heads) {
      const set = head.type === "value" ? names : functions;
      if (head.type === "value" && !shapes.has(head.name)) {
        const found = typing.shape(head.body, []);
        if (found !== null) {
          shapes.set(head.name, found);
          changed = true;
        }
      }
      if (set.has(head.name) || scalars.has(head.name)) continue;
      if (typing.isList(head.body, head.params)) {
        set.add(head.name);
        changed = true;
      }
    }
  }
  return typing;
}

/**
 * NM-30: the shape of `node` where analysis can tell it, else null: numbers and constants, x, y
 * and `locals` are numbers, unless `bound` gives a local's shape; a point is a point; a list or range holds numbers, or points when
 * every item is one; an index picks from its target's elements; and arithmetic or a built-in on
 * numbers gives a number, or a list of numbers when an operand is one; a point times a number is
 * a point. Other point arithmetic (M4), user calls, relations and undefined names are unknown.
 */
function shapeOf(
  node: Node,
  locals: readonly string[],
  shapes: ReadonlyMap<string, Shape>,
  bound: Bound
): Shape | null {
  const of = (n: Node) => shapeOf(n, locals, shapes, bound);
  switch (node.kind) {
    case "num":
    case "const":
      return "number";
    case "id":
      if (bound.has(node.name)) return bound.get(node.name) ?? null;
      if (locals.includes(node.name) || node.name === "x" || node.name === "y") return "number";
      return shapes.get(node.name) ?? null;
    case "point":
      return "point";
    case "list": {
      if (node.range !== undefined || node.items.length === 0) return "numbers";
      const items = node.items.map(of);
      if (items.every((item) => item === "point")) return "points";
      if (items.every((item) => item === "distribution")) return "distributions";
      return items.every((item) => item === "number") ? "numbers" : null;
    }
    case "index": {
      const target = of(node.target);
      if (target !== "numbers" && target !== "points") return null;
      if (indexesList(node)) return target;
      return target === "numbers" ? "number" : "point";
    }
    case "call": {
      if (!isBuiltinName(node.name)) return null;
      const args = node.args.map(of),
        read = distributionCallShape(node, args);
      if (read !== undefined) return read;
      if (listFunction(node.name) !== undefined) return listCallShape(node, args);
      return numeric(args);
    }
    case "piecewise":
      return piecewiseShape(node, of);
    case "mul":
      return scaledShape(of(node.left), of(node.right)) ?? numeric([of(node.left), of(node.right)]);
    case "rel":
    case "sim":
      return null;
    default:
      return numeric(childNodes(node).map(of));
  }
}

/**
 * PR-32: a point times a number is a point (a restriction on a point, `(1,2)\{a>0\}`), and a
 * list of either side gives a list of points; null when neither side is a point.
 */
function scaledShape(a: Shape | null, b: Shape | null): Shape | null {
  const [point, other] = pointed(a) ? [a, b] : [b, a];
  if (!pointed(point) || (other !== "number" && other !== "numbers")) return null;
  return point === "points" || other === "numbers" ? "points" : "point";
}

/**
 * PR-31: a piecewise's branch shapes in source order, a bare condition's value being a number,
 * and a missing otherwise adding nothing; null for an unknown one.
 */
function branchShapes(node: Piecewise, of: (n: Node) => Shape | null): (Shape | null)[] {
  const values = node.branches.map(({ value }) => (value === null ? "number" : of(value)));
  return node.otherwise === null ? values : [...values, of(node.otherwise)];
}

/** True for a point or a list of points, the branch kind Desmos keeps apart from numbers. */
const pointed = (s: Shape | null) => s === "point" || s === "points";

/**
 * PR-31, NM-33: a piecewise is a point when its branches are points and a number when they are
 * numbers, and a list of either when a branch or a condition operand is a list; unknown when a
 * shape is or when branches mix points and numbers (piecewiseProblem's error).
 */
function piecewiseShape(node: Piecewise, of: (n: Node) => Shape | null): Shape | null {
  const branches = branchShapes(node, of),
    operands = node.branches.flatMap(({ cond }) => cond.operands.map(of));
  if (branches.includes(null) || operands.includes(null)) return null;
  if (branches.some(pointed) !== branches.every(pointed)) return null;
  const list = [...branches, ...operands].some((s) => s === "numbers" || s === "points");
  if (branches.some(pointed)) return list ? "points" : "point";
  return list ? "numbers" : "number";
}

/**
 * PR-31: the first piecewise whose branches mix points and numbers, Desmos's "Cannot use a point
 * and a number as the branches in a piecewise.", naming the first branch's shape and then the
 * first that differs from it in kind, over the braces.
 */
export function piecewiseProblem(
  tree: Node,
  locals: readonly string[],
  typing: ListTyping
): ListProblem | null {
  const pending: Node[] = [tree];
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    pending.push(...childNodes(n));
    if (n.kind !== "piecewise") continue;
    const shapes = branchShapes(n, (b) => typing.shape(b, locals));
    const [first] = shapes;
    const other = shapes.find((s) => s !== null && first !== null && pointed(s) !== pointed(first));
    if (first !== null && other !== undefined && other !== null) {
      return {
        code: "piecewise-types",
        names: [SHAPE_NAMES[first], SHAPE_NAMES[other]],
        span: n.span,
      };
    }
  }
  return null;
}

/**
 * PR-31, NM-31: the first comparison of a point, or a list of points, with anything whose shape is
 * known, in a piecewise condition, a filter or a relation row: Desmos's "Cannot compare a point to
 * a point." (captured 2026-10-19), naming both sides of the first such link, over the relation.
 * A relation row compares only when both sides are points, so `y=(1,2)` keeps its own errors.
 */
export function comparisonProblem(
  tree: Node,
  locals: readonly string[],
  typing: ListTyping
): ListProblem | null {
  const pending: Node[] = [tree];
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    pending.push(...childNodes(n));
    if (n.kind !== "rel") continue;
    const shapes = n.operands.map((operand) => typing.shape(operand, locals));
    for (let k = 0; k + 1 < shapes.length; k++) {
      const [a, b] = [shapes[k], shapes[k + 1]];
      if (a === null || b === null || !(pointed(a) || pointed(b))) continue;
      if (n === tree && !(pointed(a) && pointed(b))) continue;
      return { code: "comparator-types", names: [SHAPE_NAMES[a], SHAPE_NAMES[b]], span: n.span };
    }
  }
  return null;
}

/**
 * FN-2, FN-23 to FN-29, FN-75: a list function's shape, unknown when an argument's shape is and
 * the result is not always numbers. mean and total of points are a point, and broadcast over
 * points and lists of points only (`total(P,P)`, `mean(P,(1,1))`) a list of points; any other
 * broadcast is a list of numbers and any other result a number.
 */
function listCallShape(node: Call, args: readonly (Shape | null)[]): Shape | null {
  const kind = listFunction(node.name)?.kind;
  if (kind === "double") return "number";
  if (kind === "operation") return operationShape(node.name, args);
  const lists = args.map((s) => s === "numbers" || s === "points"),
    broadcast = givesList(node.name, lists);
  if (listFunction(node.name)?.points !== true || ["count", "length"].includes(node.name)) {
    return broadcast ? (args.includes(null) ? null : "numbers") : "number";
  }
  if (args.includes(null)) return null;
  const pointed = (s: Shape | null) => s === "point" || s === "points";
  if (broadcast) return args.every(pointed) ? "points" : "numbers";
  const one = args.length === 1 && pointed(args[0]);
  return one || args.every((s) => s === "point") ? "point" : "number";
}

const PERMUTATION_NAMES: ReadonlySet<string> = new Set([
  "sortPerm",
  "complexSortPerm",
  "uniquePerm",
]);

/**
 * FN-34 to FN-36, FN-38: a list operation's shape: sort and unique keep their list's, repeat
 * gives a list of its first argument's kind, and join a list of numbers or of points when every
 * argument holds that kind; sortPerm, complexSortPerm and uniquePerm give indexes, numbers.
 * Unknown otherwise, Desmos's errors being list-calls.ts's.
 */
function operationShape(name: string, args: readonly (Shape | null)[]): Shape | null {
  const [first] = args;
  if (PERMUTATION_NAMES.has(name)) return "numbers";
  if (name === "sort" || name === "unique") {
    return first === "numbers" || first === "points" ? first : null;
  }
  const kinds = (name === "repeat" ? [first] : args).map((s) =>
    s === "number" || s === "numbers"
      ? "numbers"
      : s === "point" || s === "points"
        ? "points"
        : null
  );
  return kinds.length > 0 && kinds.every((k) => k === kinds[0]) ? kinds[0] : null;
}

/** Arithmetic's shape over operand shapes: unknown for a point, a distribution or an unknown. */
function numeric(operands: readonly (Shape | null)[]): Shape | null {
  if (operands.some((s) => s === null || pointed(s) || isDistributionShape(s))) return null;
  return operands.includes("numbers") ? "numbers" : "number";
}

/**
 * FN-45 to FN-51: a constructor of numbers is a distribution, and a list of them when a parameter
 * is a list; a reader of a distribution or a list of them (`D.pdf(x)`, `mean(D)`) is a number,
 * or a list of numbers when it or another argument is a list. Unknown for any other argument, for
 * a dot after anything else and for pdf or cdf without a distribution first (distributions.ts
 * reports those); undefined for every other call.
 */
function distributionCallShape(
  node: Call,
  args: readonly (Shape | null)[]
): Shape | null | undefined {
  const lists = args.some((s) => s === "numbers" || s === "distributions");
  if (isDistributionName(node.name)) {
    if (!args.every((s) => s === "number" || s === "numbers")) return null;
    return lists ? "distributions" : "distribution";
  }
  const reads = readsDistribution(node.name) && isDistributionShape(args[0] ?? null);
  if (reads) {
    return args.slice(1).every((s) => s === "number" || s === "numbers")
      ? lists
        ? "numbers"
        : "number"
      : null;
  }
  if (node.member !== undefined || node.name === "pdf" || node.name === "cdf") return null;
  return undefined;
}

/** True when `node` evaluates to a list: a literal or range, a list name or call, or any operand. */
function listValued(
  node: Node,
  locals: readonly string[],
  names: ReadonlySet<string>,
  functions: ReadonlySet<string>
): boolean {
  const pending: Node[] = [node];
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    switch (n.kind) {
      case "list":
        return true;
      case "index":
        // NM-30, NM-31: an element is a list only when the index is one; T's own list is not
        if (indexesList(n)) return true;
        pending.push(n.items[0]);
        break;
      case "id":
        if (!locals.includes(n.name) && names.has(n.name)) return true;
        break;
      case "call":
        if (!isBuiltinName(n.name) && functions.has(n.name)) return true;
        if (listFunction(n.name) !== undefined) {
          // FN-23: a list function gives a list only when it broadcasts
          const lists = n.args.map((arg) => listValued(arg, locals, names, functions));
          if (givesList(n.name, lists)) return true;
          break;
        }
        pending.push(...n.args);
        break;
      default:
        pending.push(...childNodes(n));
    }
  }
  return false;
}

/**
 * NM-30, then NM-34 to NM-36, in this order: the first index of a number or a point, or by a point
 * or a list of points (`5[1]`, `a[1]` with a=5, `L[(1,2)]`, at the index); the first nested list
 * (a list-valued item or range bound, at the item's span); the first literal range that is not an
 * arithmetic sequence (rangeShape) or holds more than 10,000 elements (over the range); and the
 * first range or filter whose length depends on a free variable (at its brackets). `locals` are a
 * function head's parameters.
 */
export function listProblem(
  tree: Node,
  locals: readonly string[],
  typing: ListTyping
): ListProblem | null {
  const brackets = bracketNodes(tree);
  for (const node of brackets) {
    if (node.kind !== "index") continue;
    const names = indexTypeError(node, locals, typing);
    if (names !== null) return { code: "index-type", names, span: node.span };
  }
  for (const node of brackets) {
    if (node.kind === "index" && !indexesList(node)) continue;
    if (node.kind === "index" && node.items[0]?.kind === "rel") continue;
    const item = node.items.find((i) => typing.isList(i, locals));
    if (item !== undefined) return { code: "nested-list", names: [], span: item.span };
  }
  for (const node of brackets) {
    if (node.range === undefined) continue;
    const code = literalRangeError(node.items, node.range);
    if (code !== null) return { code, names: [], span: node.span };
  }
  for (const node of brackets) {
    const free = lengthDependency(node, locals, typing);
    if (free !== null) {
      return { code: "list-length-free", names: [displayName(free)], span: node.span };
    }
  }
  return null;
}

/**
 * NM-30: Desmos's ListAccess signature, a list indexed by numbers or a list of them: the target
 * and index as "Cannot index {n} with {k}." names them when the target is a number or a point, or
 * the index a point or a list of points; null when it holds or analysis cannot tell.
 */
function indexTypeError(
  node: Index,
  locals: readonly string[],
  typing: ListTyping
): string[] | null {
  const target = typing.shape(node.target, locals);
  if (target === null) return null;
  const pointed = (item: Node) => ["point", "points"].includes(typing.shape(item, locals) ?? "");
  const byPoints = node.range === undefined && node.items.every(pointed);
  if (target !== "number" && target !== "point" && !byPoints) return null;
  return [SHAPE_NAMES[target], indexDescription(node, locals, typing)];
}

/** NM-30, NM-31: whether an index gives a list: a range, several items, a filter or one list item. */
function indexesList(node: Index): boolean {
  return node.range !== undefined || node.items.length > 1 || node.items[0].kind === "rel";
}

/** NM-30: how Desmos names what indexes: "a number", "a point" or a list of either. */
function indexDescription(node: Index, locals: readonly string[], typing: ListTyping): string {
  const [item] = node.items;
  if (node.range !== undefined) return SHAPE_NAMES.numbers;
  const shapes = node.items.map((i) => typing.shape(i, locals));
  if (node.items.length > 1) {
    return SHAPE_NAMES[shapes.every((s) => s === "point") ? "points" : "numbers"];
  }
  if (shapes[0] !== null) return SHAPE_NAMES[shapes[0]];
  return SHAPE_NAMES[item.kind === "rel" || typing.isList(item, locals) ? "numbers" : "number"];
}

/**
 * NM-31, NM-36: the first name a range's bounds or a filter's condition use that is not in
 * `locals` and that no row defines (x, y or a free variable such as `i` in `L[i>2]`), which would
 * make the list's length change: Desmos's "Can't plot a list whose length depends on free
 * variable '…'." (`[x...5]`, `L[L>x]`).
 */
function lengthDependency(
  node: Bracket,
  locals: readonly string[],
  typing: ListTyping
): string | null {
  const filter = node.kind === "index" && node.items[0]?.kind === "rel";
  if (node.range === undefined && !filter) return null;
  for (const item of node.items) {
    for (const { name, call } of collectNameUses(item)) {
      if (!call && !locals.includes(name) && !typing.defined.has(name)) return name;
    }
  }
  return null;
}

/**
 * G-22, deferred: a list-valued graph is `unsupported`, at its first part that is a list itself: a
 * literal or range, a list name, or a call of a function that returns a list. FN-34, FN-38: before
 * that, a list-valued graph whose length depends on a free variable through repeat's counts or
 * unique's arguments is `list-length-free` (`repeat(1,x)`), Desmos's error for a top-level list
 * with no constant length; inside count, total or another reducer the row still graphs.
 */
export function listCurveProblem(
  tree: Node,
  locals: readonly string[],
  typing: ListTyping
): ListProblem | null {
  if (!typing.isList(tree, locals)) return null;
  let span: SourceSpan | null = null;
  const pending: Node[] = [tree];
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    if (!typing.isList(n, locals)) continue;
    for (const part of n.kind === "call" ? lengthShaping(n) : []) {
      for (const { name, call } of collectNameUses(part)) {
        if (call || locals.includes(name) || typing.defined.has(name)) continue;
        return { code: "list-length-free", names: [displayName(name)], span: n.span };
      }
    }
    const parts = n.kind === "list" ? [] : childNodes(n).filter((c) => typing.isList(c, locals));
    if (parts.length > 0) pending.push(...parts);
    else if (span === null || n.span.start < span.start) span = n.span;
  }
  return { code: "unsupported", names: [DEFERRED_FEATURES.listCurves], span };
}

/** Every list and index node in `tree`, in source order. */
function bracketNodes(tree: Node): Bracket[] {
  const found: Bracket[] = [],
    pending: Node[] = [tree];
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    if (n.kind === "list" || n.kind === "index") found.push(n);
    pending.push(...childNodes(n));
  }
  return found.sort((a, b) => a.span.start - b.span.start);
}

/**
 * NM-35, NM-36 for a range whose values are all number literals, `starts` of them before the
 * ellipsis; null otherwise, when valid, or when a side is empty (an open slice, `L[2...]`).
 */
function literalRangeError(bounds: readonly Node[], starts: number): RowErrorCode | null {
  if (starts === 0 || starts === bounds.length) return null;
  const values = bounds.map(literal);
  if (values.some((v) => v === null)) return null;
  const numbers = values as number[];
  const shape = rangeShape(numbers.slice(0, starts), numbers.slice(starts));
  return typeof shape === "string" ? shape : null;
}

/**
 * The value of a tree of number literals, signs, the four operations and powers (NaN for `0/0`),
 * or null when it holds anything else. A power that is NaN here (`(-8)^{1/3}`) is left to
 * evaluation, whose powers of negative numbers differ from JavaScript's.
 */
function literal(node: Node): number | null {
  switch (node.kind) {
    case "num":
      return node.value;
    case "neg": {
      const v = literal(node.arg);
      return v === null ? null : -v;
    }
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow": {
      const left = literal(node.left),
        right = literal(node.right);
      if (left === null || right === null) return null;
      const v = BINARY[node.kind](left, right);
      return node.kind === "pow" && Number.isNaN(v) ? null : v;
    }
    default:
      return null;
  }
}

const BINARY = {
  add: (a: number, b: number) => a + b,
  sub: (a: number, b: number) => a - b,
  mul: (a: number, b: number) => a * b,
  div: (a: number, b: number) => a / b,
  pow: (a: number, b: number) => a ** b,
};
