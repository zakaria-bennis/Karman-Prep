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
import { rangeShape } from "../lib/range";
import { givesList, listFunction } from "../lib/statistics";
import type { DefinitionHead } from "./definitions";
import { displayName } from "./messages";
import { collectNameUses, COORDINATE_NAMES } from "./names";

export interface ListTyping {
  names: ReadonlySet<string>; // value names that hold a list
  defined: ReadonlySet<string>; // every name a row, a table column or a regression defines
  isList(node: Node, locals: readonly string[]): boolean; // a list, or a list of points
  shape(node: Node, locals: readonly string[]): Shape | null; // null when unknown
}
/** NM-30: a value's type as Desmos names it in "Cannot index {a number} with {a point}.". */
export type Shape = "number" | "point" | "numbers" | "points";
export const SHAPE_NAMES: Readonly<Record<Shape, string>> = {
  number: "a number",
  point: "a point",
  numbers: "a list of numbers",
  points: "a list of points",
};
type Bracket = Extract<Node, { kind: "list" | "index" }>;
type Index = Extract<Node, { kind: "index" }>;
type Call = Extract<Node, { kind: "call" }>;

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
    shape: (node, locals) => shapeOf(node, locals, shapes),
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
 * and `locals` are numbers; a point is a point; a list or range holds numbers, or points when
 * every item is one; an index picks from its target's elements; and arithmetic or a built-in on
 * numbers gives a number, or a list of numbers when an operand is one. Points in arithmetic (M4),
 * user calls, relations and undefined names are unknown.
 */
function shapeOf(
  node: Node,
  locals: readonly string[],
  shapes: ReadonlyMap<string, Shape>
): Shape | null {
  const of = (n: Node) => shapeOf(n, locals, shapes);
  switch (node.kind) {
    case "num":
    case "const":
      return "number";
    case "id":
      if (locals.includes(node.name) || node.name === "x" || node.name === "y") return "number";
      return shapes.get(node.name) ?? null;
    case "point":
      return "point";
    case "list": {
      if (node.range !== undefined || node.items.length === 0) return "numbers";
      const items = node.items.map(of);
      if (items.every((item) => item === "point")) return "points";
      return items.every((item) => item === "number") ? "numbers" : null;
    }
    case "index": {
      const target = of(node.target);
      if (target !== "numbers" && target !== "points") return null;
      if (indexesList(node)) return target;
      return target === "numbers" ? "number" : "point";
    }
    case "call":
      if (!isBuiltinName(node.name)) return null;
      if (listFunction(node.name) !== undefined) return listCallShape(node, node.args.map(of));
      return numeric(node.args.map(of));
    case "rel":
    case "sim":
      return null;
    default:
      return numeric(childNodes(node).map(of));
  }
}

/**
 * FN-2, FN-23 to FN-29, FN-75: a list function's shape, unknown when an argument's shape is and
 * the result is not always numbers. mean and total of points are a point, and broadcast over
 * points and lists of points only (`total(P,P)`, `mean(P,(1,1))`) a list of points; any other
 * broadcast is a list of numbers and any other result a number.
 */
function listCallShape(node: Call, args: readonly (Shape | null)[]): Shape | null {
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

/** Arithmetic's shape over operand shapes: unknown for a point or an unknown operand. */
function numeric(operands: readonly (Shape | null)[]): Shape | null {
  if (operands.some((s) => s === null || s === "point" || s === "points")) return null;
  return operands.includes("numbers") ? "numbers" : "number";
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
 * literal or range, a list name, or a call of a function that returns a list.
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
