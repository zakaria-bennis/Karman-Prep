// List-valued graphs as several curves (G-3, G-22, NM-33). A curve, line set or region whose tree
// evaluates to a list draws one branch per element, as Desmos does (captured 2026-10-20:
// `y=[1,2,3]x` is three lines, `y=[1,2]x+[1,2,3]` two, `y=[]x` none). branchTrees rewrites such a
// tree into one tree per element that evaluates to a number, so each branch compiles through the
// fast real-mode path: operators, built-ins, relations and piecewise parts broadcast element by
// element, truncating to the shortest list; a list name gives its elements; a user function
// called with a list, or whose body gives one, is inlined; and anything else that gives a list
// (a list operation such as sort, a distribution read, a list index) is picked element by
// element with `T[k]`, folded once when it uses no coordinate. Pure TypeScript: no DOM (AR-44).

import { NO_DEADLINE } from "../deadline";
import { sourceChildren, type Node, type RelOp, type SourceSpan } from "../latex/ast";
import { isBuiltinName } from "../latex/operator-names";
import { isDistributionName, readsDistribution } from "../lib/distributions";
import { POINT_FUNCTIONS } from "../lib/geometry";
import { MAX_LIST_ELEMENTS } from "../lib/range";
import { givesList, listFunction } from "../lib/statistics";
import { compileExpression, type CompileScope } from "./compile";
import { MAX_CALL_DEPTH } from "./compile-real";
import { numberValue, type Value } from "./values";

/** A graph draws at most this many branches, Desmos's list limit (`y=[1...10000]x` draws). */
export const MAX_PLOT_BRANCHES = MAX_LIST_ELEMENTS;

/** One tree per element, or null for a tree that evaluates to a single value. */
type Split = Node[] | null;

interface Context {
  scope: CompileScope;
  locals: ReadonlySet<string>; // parameters of a body being read, numbers here
  open: ReadonlySet<string>; // user functions being inlined, so a cycle ends
  depth: number;
  scalarBodies: Map<string, boolean>; // whether a function's body gives one value
}

/**
 * The trees `tree` draws: one per element when it evaluates to a list (none for an empty list),
 * capped at MAX_PLOT_BRANCHES; otherwise `[tree]`.
 */
export function branchTrees(tree: Node, scope: CompileScope): Node[] {
  const ctx: Context = {
    scope,
    locals: new Set(),
    open: new Set(),
    depth: 0,
    scalarBodies: new Map(),
  };
  const split = splitNode(tree, ctx);
  return split === null ? [tree] : split.slice(0, MAX_PLOT_BRANCHES);
}

/**
 * G-22: the operands of each branch of the chain `operands[0] ops[0] operands[1] …`, its lists
 * broadcast together as one relation (`1<y<[2,3]` is two bands).
 */
export function chainBranches(
  operands: readonly Node[],
  ops: readonly RelOp[],
  scope: CompileScope
): Node[][] {
  const span = operands[0]?.span ?? { start: 0, end: 0 };
  const chain: Node = { kind: "rel", ops: [...ops], operands: [...operands], span };
  return branchTrees(chain, scope).map((branch) =>
    branch.kind === "rel" ? branch.operands : [...operands]
  );
}

function splitNode(node: Node, ctx: Context): Split {
  switch (node.kind) {
    case "num":
    case "const":
    case "sim":
      return null;
    case "id":
      return splitName(node, ctx);
    case "list":
      if (node.range !== undefined) return opaque(node, ctx);
      return node.items.length === 0 ? [] : [...node.items];
    case "for": // NM-37: picked element by element
      return opaque(node, ctx);
    case "index": {
      // NM-30: one number item picks one element (`L[x]` is a step curve); anything else is a list
      const [item] = node.items;
      const picksOne =
        node.range === undefined &&
        node.items.length === 1 &&
        item.kind !== "rel" &&
        splitNode(item, ctx) === null;
      return picksOne ? null : opaque(node, ctx);
    }
    case "call":
      return splitCall(node, ctx);
    default:
      return broadcast(node, ctx);
  }
}

/** x, y and parameters are numbers; a list value gives its elements; a dependent body is read. */
function splitName(node: Extract<Node, { kind: "id" }>, ctx: Context): Split {
  const { name } = node;
  if (name === "x" || name === "y" || ctx.locals.has(name)) return null;
  const { scope } = ctx;
  if (scope.settings.complex && name === "i") return null;
  const value = scope.values.get(name);
  if (value !== undefined) return value.type === "list" ? elementsOf(value.value, node) : null;
  const definition = scope.functions.get(name);
  if (definition === undefined || definition.params.length > 0) return null;
  return inline(name, definition.body, ctx);
}

type Call = Extract<Node, { kind: "call" }>;

/**
 * Built-ins broadcast; list functions give a list when they broadcast (FN-23) or are list
 * operations, and distributions, coordinates and point functions when an argument is a list, all
 * picked element by element; a user function is inlined when an argument or its body is a list.
 */
function splitCall(node: Call, ctx: Context): Split {
  const { name } = node;
  const special =
    node.member !== undefined ||
    POINT_FUNCTIONS.has(name) ||
    isDistributionName(name) ||
    readsDistribution(name) ||
    listFunction(name) !== undefined;
  if (special) {
    const lists = node.args.map((arg) => splitNode(arg, ctx) !== null);
    const list =
      listFunction(name) !== undefined && node.member === undefined
        ? givesList(name, lists)
        : lists.includes(true);
    return list ? opaque(node, ctx) : null;
  }
  if (isBuiltinName(name)) return broadcast(node, ctx);
  const definition = ctx.scope.functions.get(name);
  if (definition === undefined || definition.params.length !== node.args.length) return null;
  const listArgument = node.args.some((arg) => splitNode(arg, ctx) !== null);
  if (!listArgument && scalarBody(name, ctx)) return null;
  const bound = new Map(definition.params.map((param, k) => [param, node.args[k]]));
  return inline(name, substitute(definition.body, bound), ctx);
}

/** Whether the body of user function `name` gives one value with its parameters as numbers. */
function scalarBody(name: string, ctx: Context): boolean {
  const known = ctx.scalarBodies.get(name);
  if (known !== undefined) return known;
  ctx.scalarBodies.set(name, true); // a body reaching its own name reads it as a number
  const definition = ctx.scope.functions.get(name)!;
  const inner = { ...ctx, locals: new Set([...ctx.locals, ...definition.params]) };
  const scalar = inline(name, definition.body, inner) === null;
  ctx.scalarBodies.set(name, scalar);
  return scalar;
}

/** The split of a function body, null past MAX_CALL_DEPTH nested inlines or for a cycle. */
function inline(name: string, body: Node, ctx: Context): Split {
  if (ctx.open.has(name) || ctx.depth >= MAX_CALL_DEPTH) return null;
  return splitNode(body, { ...ctx, open: new Set([...ctx.open, name]), depth: ctx.depth + 1 });
}

/** `tree` with every name in `bound` replaced by its tree. */
function substitute(tree: Node, bound: ReadonlyMap<string, Node>): Node {
  if (tree.kind === "id") return bound.get(tree.name) ?? tree;
  const children = sourceChildren(tree);
  if (children.length === 0) return tree;
  return withChildren(
    tree,
    children.map((child) => substitute(child, bound))
  );
}

/**
 * NM-32, NM-33: a node whose children apply element by element: one tree per element of its
 * shortest list child, the other children shared; null when no child is a list.
 */
function broadcast(node: Node, ctx: Context): Split {
  const children = sourceChildren(node);
  const splits = children.map((child) => splitNode(child, ctx));
  let count = Infinity;
  for (const split of splits) if (split !== null) count = Math.min(count, split.length);
  if (count === Infinity) return null;
  return Array.from({ length: count }, (_, k) =>
    withChildren(
      node,
      children.map((child, i) => splits[i]?.[k] ?? child)
    )
  );
}

/**
 * A list the rules above cannot take apart (a range, a list operation, a slice, a distribution
 * read): folded once when it uses no coordinate, else each element picked with `T[k]`, the count
 * read from one evaluation (NM-31: a list's length never depends on x or y). Null when it is not
 * a list after all.
 */
function opaque(node: Node, ctx: Context): Split {
  const run = compileExpression(node, ctx.scope);
  if (!usesCoordinates(node, ctx)) {
    const value = run({}, NO_DEADLINE);
    return value.type === "list" ? elementsOf(value.value, node) : null;
  }
  const vars: Record<string, Value> = { x: numberValue(0), y: numberValue(0) };
  for (const local of ctx.locals) vars[local] = numberValue(0);
  const value = run(vars, NO_DEADLINE);
  if (value.type !== "list") return null;
  return value.value.map((_, k) => pick(node, k, node.span));
}

/** A list value's elements as trees: a real number as itself, anything else picked from `source`. */
function elementsOf(items: readonly Value[], source: Node): Node[] {
  return items.map((item, k) =>
    item.type === "number"
      ? { kind: "num", value: item.value, span: source.span }
      : pick(source, k, source.span)
  );
}

/** `T[k+1]`, the element at zero-based `k`. */
function pick(target: Node, k: number, span: SourceSpan): Node {
  return { kind: "index", target, items: [{ kind: "num", value: k + 1, span }], span };
}

/**
 * Whether `tree` may change with x or y: it names x, y, a parameter being read or a dependent
 * definition, or calls a user function.
 */
function usesCoordinates(tree: Node, ctx: Context): boolean {
  const pending: Node[] = [tree];
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    if (n.kind === "id") {
      const { name } = n;
      if (name === "x" || name === "y" || ctx.locals.has(name)) return true;
      if (!ctx.scope.values.has(name) && ctx.scope.functions.has(name)) return true;
    }
    if (n.kind === "call" && n.member === undefined && !isBuiltinName(n.name)) return true;
    pending.push(...sourceChildren(n));
  }
  return false;
}

/** `node` with its sourceChildren replaced by `kids`, in sourceChildren's order. */
function withChildren(node: Node, kids: readonly Node[]): Node {
  switch (node.kind) {
    case "num":
    case "id":
    case "const":
      return node;
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
    case "sim":
      return { ...node, left: kids[0], right: kids[1] };
    case "neg":
    case "pct":
    case "deg":
    case "fact":
    case "abs":
      return { ...node, arg: kids[0] };
    case "root":
      return node.index === null
        ? { ...node, arg: kids[0] }
        : { ...node, index: kids[0], arg: kids[1] };
    case "call":
      return { ...node, args: [...kids] };
    case "point":
      return { ...node, x: kids[0], y: kids[1] };
    case "rel":
      return { ...node, operands: [...kids] };
    case "list":
      return { ...node, items: [...kids] };
    case "index":
      return { ...node, target: kids[0], items: kids.slice(1) };
    case "piecewise": {
      let at = 0;
      const branches = node.branches.map(({ value }) => {
        const cond = kids[at++] as Extract<Node, { kind: "rel" }>;
        return { cond, value: value === null ? null : kids[at++] };
      });
      return { ...node, branches, otherwise: node.otherwise === null ? null : kids[at] };
    }
    case "for": {
      const bindings = node.bindings.map((b, k) => ({ ...b, list: kids[k + 1] }));
      return { ...node, body: kids[0], bindings };
    }
  }
}
