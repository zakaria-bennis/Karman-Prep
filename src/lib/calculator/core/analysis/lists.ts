// Which names and calls hold lists, read from the rows before anything evaluates (PR-34, NM-32),
// and the list errors analysis can report from that: nested lists (NM-34), literal ranges with a
// count Desmos rejects or too many elements (NM-35, NM-36) and list-valued graphs, which are deferred (G-22).
// Evaluation still reports any list error these rules cannot see. Pure TypeScript: no DOM (AR-44).

import type { RowErrorCode } from "../corpus/types";
import { sourceChildren as childNodes, type Node, type SourceSpan } from "../latex/ast";
import { DEFERRED_FEATURES } from "../latex/errors";
import { isBuiltinName } from "../latex/operator-names";
import { rangeShape } from "../lib/range";
import type { DefinitionHead } from "./definitions";
import { COORDINATE_NAMES } from "./names";

export interface ListTyping {
  names: ReadonlySet<string>; // value names that hold a list
  isList(node: Node, locals: readonly string[]): boolean; // a list, or a list of points
}
export interface ListProblem {
  code: RowErrorCode;
  names: string[];
  span: SourceSpan | null;
}

/**
 * The list typing of `heads`: a value name holds a list when its body is list-valued, and a
 * function returns one when its body is with its parameters read as numbers. `seeds` hold lists
 * whatever defines them (table columns, regression residuals) and `scalars` never do (fitted
 * parameters). Computed to a fixed point, so definitions resolve in any order and cycles end.
 */
export function inferLists(
  heads: readonly DefinitionHead[],
  seeds: Iterable<string>,
  scalars: ReadonlySet<string> = new Set()
): ListTyping {
  const names = new Set<string>(),
    functions = new Set<string>();
  for (const name of seeds) if (!COORDINATE_NAMES.includes(name)) names.add(name);
  const typing: ListTyping = {
    names,
    isList: (node, locals) => listValued(node, locals, names, functions),
  };
  for (let changed = true; changed; ) {
    changed = false;
    for (const head of heads) {
      const set = head.type === "value" ? names : functions;
      if (set.has(head.name) || scalars.has(head.name)) continue;
      if (typing.isList(head.body, head.params)) {
        set.add(head.name);
        changed = true;
      }
    }
  }
  return typing;
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
      case "id":
        if (!locals.includes(n.name) && names.has(n.name)) return true;
        break;
      case "call":
        if (!isBuiltinName(n.name) && functions.has(n.name)) return true;
        pending.push(...n.args);
        break;
      default:
        pending.push(...childNodes(n));
    }
  }
  return false;
}

/**
 * NM-34 to NM-36: the first nested list in `tree` (a list-valued item or range bound, at the
 * item's span), then the first literal range that is not an arithmetic sequence (rangeShape) or holds more than 10,000
 * elements (over the range). `locals` are a function head's parameters.
 */
export function listProblem(
  tree: Node,
  locals: readonly string[],
  typing: ListTyping
): ListProblem | null {
  const lists = listNodes(tree);
  for (const list of lists) {
    const item = list.items.find((i) => typing.isList(i, locals));
    if (item !== undefined) return { code: "nested-list", names: [], span: item.span };
  }
  for (const list of lists) {
    if (list.range !== true) continue;
    const code = literalRangeError(list.items);
    if (code !== null) return { code, names: [], span: list.span };
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

/** Every list node in `tree`, in source order. */
function listNodes(tree: Node): Extract<Node, { kind: "list" }>[] {
  const found: Extract<Node, { kind: "list" }>[] = [],
    pending: Node[] = [tree];
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    if (n.kind === "list") found.push(n);
    pending.push(...childNodes(n));
  }
  return found.sort((a, b) => a.span.start - b.span.start);
}

/** NM-35, NM-36 for a range whose bounds are all number literals; null otherwise or when valid. */
function literalRangeError(bounds: readonly Node[]): RowErrorCode | null {
  const values = bounds.map(literal);
  if (values.some((v) => v === null)) return null;
  const [a, b, c] = values as number[];
  const shape = values.length === 2 ? rangeShape(a, null, b) : rangeShape(a, b, c);
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
