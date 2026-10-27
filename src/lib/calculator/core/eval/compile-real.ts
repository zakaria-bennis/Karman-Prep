// The real-mode plotting compiler (NM-12, G-6): compileExpression's rules and arithmetic on
// plain numbers, with NaN for undefined, points and lists and -0 kept. Every node's result is a
// finite number or NaN. Variables live in slots, one per name, and a user-function call saves the
// slots of its parameters on a shared stack and restores them afterwards, so an evaluation
// allocates nothing per node. Nothing here throws. Pure TypeScript: no DOM (AR-44).

import { NO_DEADLINE } from "../deadline";
import { sourceChildren, type ConstName, type Node, type RelOp } from "../latex/ast";
import { isBuiltinName } from "../latex/operator-names";
import { BUILTINS } from "../lib/builtins";
import { POINT_FUNCTIONS } from "../lib/geometry";
import { isDistributionName, readsDistribution } from "../lib/distributions";
import { givesList, listFunction, reduceNumbers } from "../lib/statistics";
import { factorial } from "../lib/gamma";
import type { Compiled, CompileScope } from "./compile";
import { expandDerivative } from "./derivative";
import { holdsDistribution } from "./distributions";
import { INFERENCE_FUNCTIONS } from "./inference";
import { linkHolds, toPlotNumber } from "./ops";
import { exactConstant, usesNoName } from "./exact";
import { exponentRational, realPow, realRoot } from "./real-pow";
import {
  RECURSION_BUDGET,
  realRecursiveCall,
  recursiveNames,
  type RecursionBudget,
  type RecursionRun,
} from "./recursion";
import { numberValue, type Value } from "./values";

/** User-function calls nest at most this deep; a call past it is undefined. */
export const MAX_CALL_DEPTH = 64;

type Binary = Extract<Node, { left: Node }>;
type Call = Extract<Node, { kind: "call" }>;
type Index = Extract<Node, { kind: "index" }>;
type Piecewise = Extract<Node, { kind: "piecewise" }>;
type Fn = () => number;

/** A user function, compiled once per compileReal: the slots of its parameters and its body. */
interface RealFunction {
  name: string;
  slots: readonly number[];
  body: Fn;
}

/**
 * A subtree compiled by the general evaluator (compileExpression): run with no variables, it folds
 * a tree that uses none; run with x, y and the parameters in scope, it evaluates what the real
 * rules cannot lay out (see generalNode).
 */
export type GeneralCompile = (tree: Node) => Compiled;

interface Context {
  scope: CompileScope;
  general: GeneralCompile | null;
  params: string[]; // the parameters of the user-function bodies being compiled
  slots: Map<string, number>; // a variable name's index into env and bound
  env: number[]; // each slot's current value
  bound: number[]; // 1 while the slot's name is a variable: x, y or a parameter of a call in progress
  stack: number[]; // the arguments of calls in progress, then the slot values they replaced
  boundStack: number[]; // the bound flags they replaced
  sp: number; // the first free stack index
  depth: number; // user-function calls in progress
  functions: Map<string, RealFunction>;
  recursion: RecursionRun<number> | null; // a recursion in progress (recursion.ts)
  budget: RecursionBudget;
}

const undefinedFn: Fn = () => NaN;

/**
 * A finite result, or NaN for an overflow or any other non-finite value (NM-12, NM-14): applied
 * to the inputs and the final result only, so ±∞ flows through arithmetic as in Desmos
 * (`\frac{1}{\frac{1}{x}}` is 0 at x=0).
 */
function finite(v: number): number {
  return Number.isFinite(v) ? v : NaN;
}

/** The value of a constant node: e, π, or τ = 2π. */
export function constantValue(name: ConstName): number {
  if (name === "infty") return Infinity;
  return name === "e" ? Math.E : name === "pi" ? Math.PI : 2 * Math.PI;
}

/**
 * Compiles `tree` for real mode into `(x, y) => number`: NaN means
 * undefined. A name resolves as a variable (x, y or a parameter of a call in progress), then `i`
 * as non-real in complex mode, then `scope.values` (NaN unless a number), then a zero-parameter
 * entry of `scope.functions` run with the same variables, else NaN. A call binds its parameters
 * over the caller's variables; past MAX_CALL_DEPTH nested calls, or for a name without a
 * `scope.functions` entry (a head with an error), it is NaN.
 */
export function compileReal(
  tree: Node,
  scope: CompileScope,
  general: GeneralCompile | null = null
): (x: number, y: number) => number {
  const ctx: Context = {
    scope,
    general,
    params: [],
    slots: new Map([
      ["x", 0],
      ["y", 1],
    ]),
    env: [NaN, NaN],
    bound: [1, 1],
    stack: [],
    boundStack: [],
    sp: 0,
    depth: 0,
    functions: new Map(),
    recursion: null,
    budget: { left: RECURSION_BUDGET },
  };
  const root = compile(tree, ctx),
    env = ctx.env;
  return (x, y) => {
    env[0] = finite(x);
    env[1] = finite(y);
    return finite(root());
  };
}

function compile(node: Node, ctx: Context): Fn {
  const exact = exactConstant(node); // MATHS-CORE-1 (exact.ts)
  if (exact !== null) return () => exact;
  // NM-32: arithmetic and |…| on points give points or numbers the plain-number rules cannot
  // carry, so `y=\left|A-(x,0)\right|` and `y=(x,1)\cdot(1,1)` go to the general evaluator.
  if (POINT_OPERATIONS.has(node.kind) && sourceChildren(node).some((n) => mayBePoint(n, ctx))) {
    return generalNode(node, ctx);
  }
  switch (node.kind) {
    case "num": {
      const v = node.value;
      return () => v;
    }
    case "const": {
      const v = constantValue(node.name);
      return () => v;
    }
    case "id":
      return identifier(node.name, ctx);
    case "add":
    case "sub":
    case "mul":
    case "div":
      return arithmetic(node, ctx);
    case "pow":
      return power(node, ctx);
    case "neg": {
      const a = compile(node.arg, ctx);
      return () => -a();
    }
    case "pct": {
      const a = compile(node.arg, ctx);
      return () => a() / 100;
    }
    case "abs": {
      const a = compile(node.arg, ctx);
      return () => Math.abs(a());
    }
    case "root": {
      const a = compile(node.arg, ctx);
      if (node.index === null) return () => realRoot(a(), 2);
      const index = compile(node.index, ctx);
      return () => realRoot(a(), index());
    }
    case "call":
      return call(node, ctx);
    case "deriv": {
      // FN-61: its symbolic derivative (derivative.ts), NaN without a rule
      const d = expandDerivative(node, ctx.scope.functions, ctx.scope.settings.angleMode);
      return d === null ? undefinedFn : compile(d, ctx);
    }
    case "rel":
      return relation(node.operands, node.ops, ctx);
    case "fact": {
      const a = compile(node.arg, ctx);
      return () => factorial(a());
    }
    case "index":
      return indexed(node, ctx);
    case "piecewise":
      return piecewise(node, ctx);
    case "point": // a point is not a real number
    case "list": // nor is a list
    case "for": // nor a comprehension (branches.ts picks its elements)
    case "sim": // a regression row is fitted by the values pass (D-2)
      return undefinedFn;
  }
}

/**
 * NM-30: `T[i]` with one index item, when T is a list literal, a name whose value is a list, or any
 * other list that uses no variable (`L[2...][x]`, `[1...5][x]`, `L[L>3][x]`), so these graph a
 * step function; the index is rounded down and out of range is NaN. A slice, a filter or a list of
 * indices is a list, so NaN; any other target (`\sin([1,2]x)[1]`) is evaluated by generalNode.
 */
function indexed(node: Index, ctx: Context): Fn {
  const [item] = node.items;
  if (node.range !== undefined || node.items.length !== 1 || item.kind === "rel")
    return undefinedFn;
  const elements = listElements(node.target, ctx);
  if (elements === null) return generalNode(node, ctx);
  const index = compile(item, ctx);
  return () => {
    const k = Math.floor(index());
    return k >= 1 && k <= elements.length ? elements[k - 1]() : NaN;
  };
}

/**
 * The elements of a list literal, or of the list value of a name or of a tree that uses no
 * variable and no user function (NaN for a non-number), or of a negation or the four operations
 * with a list operand, element by element with numbers repeated and lists cut to the shorter
 * (NM-32, NM-33: `[1,2,3]x`); else null.
 */
function listElements(target: Node, ctx: Context): Fn[] | null {
  if (target.kind === "list" && target.range === undefined) {
    return target.items.map((item) => compile(item, ctx));
  }
  const foldable = ctx.general !== null && isConstantTree(target, ctx);
  if (target.kind === "neg" && !foldable) {
    return listElements(target.arg, ctx)?.map((f) => () => -f()) ?? null;
  }
  if (isArithmetic(target) && !foldable) {
    const left = listElements(target.left, ctx),
      right = listElements(target.right, ctx);
    if (left === null && right === null) return null;
    const a = left ?? compile(target.left, ctx),
      b = right ?? compile(target.right, ctx),
      n = Math.min(left?.length ?? Infinity, right?.length ?? Infinity);
    return Array.from({ length: n }, (_, k) =>
      combined(target.kind, Array.isArray(a) ? a[k] : a, Array.isArray(b) ? b[k] : b)
    );
  }
  let value: Value | undefined;
  if (target.kind === "id") {
    if (isConstantName(target.name, ctx)) value = ctx.scope.values.get(target.name);
  } else if (foldable && ctx.general !== null) {
    value = ctx.general(target)({}, NO_DEADLINE);
  }
  if (value?.type !== "list") return null;
  return value.value.map((v) => {
    const n = v.type === "number" ? v.value : NaN;
    return () => n;
  });
}

/** A name of a scope value that is not x, y or a parameter of a body being compiled. */
function isConstantName(name: string, ctx: Context): boolean {
  return name !== "x" && name !== "y" && !ctx.params.includes(name) && ctx.scope.values.has(name);
}

/**
 * True when every name in `tree` is a value of the scope, not x, y or a parameter of a body being
 * compiled, and `tree` calls no user function.
 */
function isConstantTree(tree: Node, ctx: Context): boolean {
  const pending: Node[] = [tree];
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    if (n.kind === "id" && !isConstantName(n.name, ctx)) return false;
    if (n.kind === "call" && !isBuiltinName(n.name)) return false;
    pending.push(...sourceChildren(n));
  }
  return true;
}

function arithmetic(node: Binary, ctx: Context): Fn {
  return combined(node.kind, compile(node.left, ctx), compile(node.right, ctx));
}

const isArithmetic = (node: Node): node is Binary =>
  node.kind === "add" || node.kind === "sub" || node.kind === "mul" || node.kind === "div";

function combined(kind: Binary["kind"], a: Fn, b: Fn): Fn {
  switch (kind) {
    case "add":
      return () => a() + b();
    case "sub":
      return () => a() - b();
    case "mul":
      return () => a() * b();
    default:
      return () => a() / b(); // ÷ 0 is ±∞, which the root shows as undefined (NM-12)
  }
}

/** a^b by realPow with the exponent's tree rational fixed here (NM-10); e^B is exp(B). */
function power(node: Binary, ctx: Context): Fn {
  if (node.left.kind === "const" && node.left.name === "e") {
    return builtinCall("exp", [node.right], ctx);
  }
  const a = compile(node.left, ctx),
    b = compile(node.right, ctx),
    rational = exponentRational(node.right);
  return () => realPow(a(), b(), rational);
}

function call(node: Call, ctx: Context): Fn {
  if (readsOrMakesDistribution(node, ctx)) return generalNode(node, ctx);
  // FN-70, FN-71: distance and midpoint read points, which are not numbers
  if (POINT_FUNCTIONS.has(node.name)) return generalNode(node, ctx);
  if (listFunction(node.name) !== undefined) return listFunctionCall(node, ctx);
  if (node.name === "random" || node.name === "shuffle") return generalNode(node, ctx);
  if (isBuiltinName(node.name)) return builtinCall(node.name, node.args, ctx);
  // NM-32: a point argument is not a number, so the general evaluator binds it (`g((x,0))`).
  if (node.args.some((arg) => mayBePoint(arg, ctx))) return generalNode(node, ctx);
  const fn = userFunction(node.name, ctx);
  if (fn === null || fn.slots.length !== node.args.length) return undefinedFn;
  return userCall(
    fn,
    node.args.map((arg) => compile(arg, ctx)),
    ctx
  );
}

/**
 * FN-45 to FN-51: a call generalNode evaluates, since a distribution is not a number: a
 * constructor, a dot (a point's coordinate `P.x` too, PR-45), pdf or cdf, or a statistic or quantile whose first argument holds a
 * constructor, a name whose value is a distribution (`y=\operatorname{mean}(N)x`) or a call of
 * a user function whose body, or a function it calls, does (`y=\operatorname{mean}(f(2))x` with
 * `f(x)=\operatorname{normaldist}(x,1)`).
 */
function readsOrMakesDistribution(node: Call, ctx: Context): boolean {
  if (node.member !== undefined || isDistributionName(node.name)) return true;
  if (INFERENCE_FUNCTIONS.has(node.name)) return true; // FN-53 to FN-56: an inference value
  if (node.name === "pdf" || node.name === "cdf") return true;
  if (!readsDistribution(node.name) || node.args.length === 0) return false;
  const pending: Node[] = [node.args[0]],
    opened = new Set<string>();
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    if (n.kind === "call" && isDistributionName(n.name)) return true;
    const v = n.kind === "id" && isConstantName(n.name, ctx) ? ctx.scope.values.get(n.name) : null;
    if (v !== undefined && v !== null && holdsDistribution(v)) return true;
    const name = n.kind === "call" || n.kind === "id" ? n.name : null,
      called = name === null || opened.has(name) ? undefined : ctx.scope.functions.get(name);
    if (name !== null && called !== undefined) {
      opened.add(name);
      pending.push(called.body);
    }
    pending.push(...sourceChildren(n));
  }
  return false;
}

/**
 * A built-in's real rule in the angle unit (FN-4): NaN for an unshipped name, a count outside its
 * arity or a NaN argument.
 * The arguments are evaluated onto the stack and then copied into this call site's buffer, so a
 * nested evaluation of the same call site cannot overwrite them.
 */
function builtinCall(name: string, argNodes: readonly Node[], ctx: Context): Fn {
  const fn = BUILTINS.get(name);
  if (fn === undefined || !fn.arity.includes(argNodes.length)) return undefinedFn;
  const args = argNodes.map((arg) => compile(arg, ctx)),
    buffer = args.map(() => NaN),
    count = args.length,
    angleMode = ctx.scope.settings.angleMode,
    stack = ctx.stack;
  return () => {
    const base = ctx.sp;
    for (let k = 0; k < count; k++) {
      const v = args[k]();
      if (Number.isNaN(v)) {
        ctx.sp = base;
        return NaN;
      }
      stack[base + k] = v;
      ctx.sp = base + k + 1;
    }
    for (let k = 0; k < count; k++) buffer[k] = stack[base + k];
    ctx.sp = base;
    return fn.real(buffer, angleMode);
  };
}

/**
 * FN-2, FN-23 to FN-29, FN-75: a list function whose result is a number (statistics.ts), its list
 * arguments laid out by listElements and its other arguments taken as numbers, so `y=\max(x,2)`
 * and `\operatorname{mean}([1,2,3]x)` graph; a call that gives a list (a broadcast) is NaN. An
 * argument listElements cannot lay out that may still be a list (`[1,2,3]^x`, `\sin([1,2]x)`, a
 * name defined from x) sends the call to generalNode, as does every two-list statistic and list
 * operation (FN-30 to FN-38), which take their lists whole. The values are evaluated onto the
 * stack and copied into this call site's buffer, as builtinCall does.
 */
function listFunctionCall(node: Call, ctx: Context): Fn {
  const { name, args: argNodes } = node,
    kind = listFunction(name)?.kind;
  if (kind === "double" || kind === "operation") return generalNode(node, ctx);
  const parts = argNodes.map((arg) => listElements(arg, ctx));
  if (argNodes.some((arg, k) => parts[k] === null && mayBeList(arg, ctx.params, ctx, new Set()))) {
    return generalNode(node, ctx);
  }
  if (
    argNodes.length === 0 ||
    givesList(
      name,
      parts.map((part) => part !== null)
    )
  ) {
    return undefinedFn;
  }
  const parameterized = listFunction(name)?.kind === "parameterized";
  if (parameterized && (argNodes.length !== 2 || parts[0] === null)) return undefinedFn;
  if (
    listFunction(name)?.kind === "length" &&
    argNodes.length > 1 &&
    parts.some((part) => part !== null)
  )
    return undefinedFn;
  const fns = parameterized
      ? (parts[0] as Fn[])
      : argNodes.flatMap((arg, k) => parts[k] ?? [compile(arg, ctx)]),
    parameter = parameterized ? compile(argNodes[1], ctx) : () => NaN,
    buffer = fns.map(() => NaN),
    count = fns.length,
    stack = ctx.stack;
  return () => {
    const p = parameter(),
      base = ctx.sp;
    for (let k = 0; k < count; k++) {
      stack[base + k] = fns[k]();
      ctx.sp = base + k + 1;
    }
    for (let k = 0; k < count; k++) buffer[k] = stack[base + k];
    ctx.sp = base;
    return reduceNumbers(name, buffer, p);
  };
}

/**
 * `node` by the general evaluator, for a list the real rules cannot lay out: each run passes x, y
 * and the parameters of the bodies being compiled, while bound, as numbers, so it allocates where
 * the rest of this file does not. NaN unless the result is a real number, and without
 * `ctx.general`.
 */
function generalNode(node: Node, ctx: Context): Fn {
  if (ctx.general === null) return undefinedFn;
  const run = ctx.general(node);
  let folded: number | null = null; // a constant subtree runs once, not at every sample
  if (usesNoName(node)) return () => (folded ??= toPlotNumber(run({}, NO_DEADLINE)));
  const names = [...new Set(["x", "y", ...ctx.params])],
    slots = names.map((name) => slotOf(name, ctx)),
    { env, bound } = ctx;
  return () => {
    const vars: Record<string, Value> = {};
    for (let k = 0; k < names.length; k++) {
      if (bound[slots[k]] === 1) vars[names[k]] = numberValue(env[slots[k]]);
    }
    return toPlotNumber(run(vars, NO_DEADLINE));
  };
}

/**
 * Whether `node` may evaluate to a list, read from its tree: a list; a slice, a filter or a list
 * of indices; a name whose value is a list, or a function whose body may give one; a list function
 * that broadcasts; or any other node with an operand that may be a list. x, y and `locals` are
 * numbers; `seen` holds the functions being read, so a cycle ends.
 */
function mayBeList(
  node: Node,
  locals: readonly string[],
  ctx: Context,
  seen: Set<string>
): boolean {
  const of = (n: Node) => mayBeList(n, locals, ctx, seen);
  switch (node.kind) {
    case "list":
      return true;
    case "index":
      return (
        node.range !== undefined ||
        node.items.length !== 1 ||
        node.items.some((item) => item.kind === "rel" || of(item))
      );
    case "id": {
      if (node.name === "x" || node.name === "y" || locals.includes(node.name)) return false;
      const value = ctx.scope.values.get(node.name);
      return value !== undefined ? value.type === "list" : bodyMayBeList(node.name, ctx, seen);
    }
    case "call":
      if (listFunction(node.name) !== undefined) return givesList(node.name, node.args.map(of));
      if (node.args.some(of)) return true;
      return !isBuiltinName(node.name) && bodyMayBeList(node.name, ctx, seen);
    default:
      return sourceChildren(node).some(of);
  }
}

/** The nodes compile hands to generalNode when an operand may be a point (NM-32). */
const POINT_OPERATIONS: ReadonlySet<Node["kind"]> = new Set([
  "add",
  "sub",
  "mul",
  "div",
  "neg",
  "abs",
]);

/**
 * Whether `node` may evaluate to a point or a list of points, read from its tree: a point; a name
 * whose value holds one, or whose definition may give one; midpoint; an index, piecewise or
 * arithmetic with such an operand; or a call of a user function whose body may give one. x, y and
 * parameters are numbers, and a coordinate (`P.x`), distance and |P| are numbers.
 */
function mayBePoint(node: Node, ctx: Context, seen: Set<string> = new Set()): boolean {
  const of = (n: Node) => mayBePoint(n, ctx, seen);
  switch (node.kind) {
    case "point":
      return true;
    case "id": {
      if (node.name === "x" || node.name === "y" || ctx.params.includes(node.name)) return false;
      const value = ctx.scope.values.get(node.name);
      if (value !== undefined) return holdsPoint(value);
      return bodyMayBePoint(node.name, ctx, seen);
    }
    case "abs":
      return false;
    case "call":
      if (node.member !== undefined || node.name === "distance") return false;
      if (node.name === "midpoint") return true;
      if (isBuiltinName(node.name)) return node.args.some(of);
      return bodyMayBePoint(node.name, ctx, seen);
    case "index":
      return of(node.target);
    default:
      return sourceChildren(node).some(of);
  }
}

const holdsPoint = (v: Value): boolean =>
  v.type === "point" || (v.type === "list" && v.value.some((item) => item.type === "point"));

/** Whether the body of the user function `name` may give a point, its parameters read as numbers. */
function bodyMayBePoint(name: string, ctx: Context, seen: Set<string>): boolean {
  const definition = ctx.scope.functions.get(name);
  if (definition === undefined || seen.has(name)) return false;
  seen.add(name);
  const outer = ctx.params.length;
  ctx.params.push(...definition.params);
  const result = mayBePoint(definition.body, ctx, seen);
  ctx.params.length = outer;
  return result;
}

/** Whether the body of the user function `name` may give a list, its parameters read as numbers. */
function bodyMayBeList(name: string, ctx: Context, seen: Set<string>): boolean {
  const definition = ctx.scope.functions.get(name);
  if (definition === undefined || seen.has(name)) return false;
  seen.add(name);
  return mayBeList(definition.body, definition.params, ctx, seen);
}

/**
 * Calls a user function: the arguments are evaluated in the caller's variables onto the stack,
 * then swapped into the parameters' slots, and the replaced values are restored after the body.
 */
function userCall(fn: RealFunction, args: readonly Fn[], ctx: Context): Fn {
  if (recursiveNames(ctx.scope.functions).has(fn.name)) {
    return realRecursiveCall(ctx, fn.name, args, (name) => userFunction(name, ctx));
  }
  const { env, bound, stack, boundStack } = ctx,
    count = args.length;
  return () => {
    if (ctx.depth >= MAX_CALL_DEPTH) return NaN;
    const base = ctx.sp;
    for (let k = 0; k < count; k++) {
      stack[base + k] = args[k]();
      ctx.sp = base + k + 1;
    }
    for (let k = 0; k < count; k++) {
      const slot = fn.slots[k],
        held = env[slot];
      env[slot] = stack[base + k];
      stack[base + k] = held;
      boundStack[base + k] = bound[slot];
      bound[slot] = 1;
    }
    ctx.depth += 1;
    const result = fn.body();
    ctx.depth -= 1;
    for (let k = count - 1; k >= 0; k--) {
      const slot = fn.slots[k];
      env[slot] = stack[base + k];
      bound[slot] = boundStack[base + k];
    }
    ctx.sp = base;
    return result;
  };
}

/**
 * The function `name` of `scope.functions`, compiled once per compileReal. It is cached before its
 * body compiles, and calls read `body` when they run, so a body reaching its own name compiles.
 */
function userFunction(name: string, ctx: Context): RealFunction | null {
  const known = ctx.functions.get(name);
  if (known !== undefined) return known;
  const definition = ctx.scope.functions.get(name);
  if (definition === undefined) return null;
  const fn: RealFunction = {
    name,
    slots: definition.params.map((param) => slotOf(param, ctx)),
    body: undefinedFn,
  };
  ctx.functions.set(name, fn);
  const outer = ctx.params.length;
  ctx.params.push(...definition.params);
  fn.body = compile(definition.body, ctx);
  ctx.params.length = outer;
  return fn;
}

function identifier(name: string, ctx: Context): Fn {
  const slot = slotOf(name, ctx),
    { env, bound } = ctx,
    fallback = unboundName(name, ctx);
  return () => (bound[slot] === 1 ? env[slot] : fallback());
}

/** A name that is not a variable: `i` in complex mode, a value, a zero-parameter function or NaN. */
function unboundName(name: string, ctx: Context): Fn {
  const { scope } = ctx;
  if (scope.settings.complex && name === "i") return undefinedFn; // i is not real
  const value = scope.values.get(name);
  if (value !== undefined) {
    const v = value.type === "number" ? value.value : NaN;
    return () => v;
  }
  const fn = userFunction(name, ctx);
  return fn !== null && fn.slots.length === 0 ? userCall(fn, [], ctx) : undefinedFn;
}

function slotOf(name: string, ctx: Context): number {
  const known = ctx.slots.get(name);
  if (known !== undefined) return known;
  const slot = ctx.env.length;
  ctx.slots.set(name, slot);
  ctx.env.push(NaN);
  ctx.bound.push(0);
  return slot;
}

/**
 * PR-31, PR-32: the value of the first condition that holds (1 for a bare condition), else the
 * otherwise value or NaN; `\{\}` is 1. A list condition gives a list, which a graph splits into
 * one branch per element first (G-22, branches.ts), so here it never holds.
 */
function piecewise(node: Piecewise, ctx: Context): Fn {
  const tests = node.branches.map(({ cond }) => relation(cond.operands, cond.ops, ctx)),
    values = node.branches.map(({ value }) => (value === null ? one : compile(value, ctx))),
    otherwise =
      node.otherwise !== null
        ? compile(node.otherwise, ctx)
        : node.branches.length === 0
          ? one
          : undefinedFn,
    count = tests.length;
  return () => {
    for (let k = 0; k < count; k++) if (tests[k]() === 1) return values[k]();
    return otherwise();
  };
}

const one: Fn = () => 1;

/** NM-22, : 1 when every operand is a number and every link holds, else NaN. */
function relation(operandNodes: readonly Node[], ops: readonly RelOp[], ctx: Context): Fn {
  const operands = operandNodes.map((operand) => compile(operand, ctx)),
    links = ops.length;
  return () => {
    let previous = operands[0]();
    if (Number.isNaN(previous)) return NaN;
    for (let k = 0; k < links; k++) {
      const next = operands[k + 1]();
      if (Number.isNaN(next) || !linkHolds(previous, ops[k], next)) return NaN;
      previous = next;
    }
    return 1;
  };
}
