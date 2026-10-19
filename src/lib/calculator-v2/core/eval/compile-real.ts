// The real-mode plotting compiler (NM-12, NM-27, G-6): compileExpression's rules and arithmetic on
// plain numbers, with NaN for undefined, points and lists and -0 kept. Every node's result is a
// finite number or NaN. Variables live in slots, one per name, and a user-function call saves the
// slots of its parameters on a shared stack and restores them afterwards, so an evaluation
// allocates nothing per node. Nothing here throws. Pure TypeScript: no DOM (AR-44).

import type { ConstName, Node, RelOp } from "../latex/ast";
import { isBuiltinName } from "../latex/operator-names";
import { BUILTINS } from "../lib/builtins";
import { factorial } from "../lib/gamma";
import { circular, type CircularName } from "../lib/trig";
import type { CompileScope } from "./compile";
import { linkHolds } from "./ops";
import { exponentRational, realPow, realRoot } from "./real-pow";

/** User-function calls nest at most this deep; a call past it is undefined. */
export const MAX_CALL_DEPTH = 64;

const CIRCULAR_NAMES: ReadonlySet<string> = new Set(["sin", "cos", "tan", "csc", "sec", "cot"]);

type Binary = Extract<Node, { left: Node }>;
type Call = Extract<Node, { kind: "call" }>;
type Fn = () => number;

/** A user function, compiled once per compileReal: the slots of its parameters and its body. */
interface RealFunction {
  slots: readonly number[];
  body: Fn;
}

interface Context {
  scope: CompileScope;
  slots: Map<string, number>; // a variable name's index into env and bound
  env: number[]; // each slot's current value
  bound: number[]; // 1 while the slot's name is a variable: x, y or a parameter of a call in progress
  stack: number[]; // the arguments of calls in progress, then the slot values they replaced
  boundStack: number[]; // the bound flags they replaced
  sp: number; // the first free stack index
  depth: number; // user-function calls in progress
  functions: Map<string, RealFunction>;
}

const undefinedFn: Fn = () => NaN;

/** A finite result, or NaN for an overflow or any other non-finite value (NM-12, NM-14). */
function finite(v: number): number {
  return Number.isFinite(v) ? v : NaN;
}

/** The value of a constant node: e, π, or τ = 2π. */
export function constantValue(name: ConstName): number {
  return name === "e" ? Math.E : name === "pi" ? Math.PI : 2 * Math.PI;
}

/**
 * NM-27: the `A` of a circular-trig call written `name(deg(A))`, which NM-26 evaluates exactly in
 * degrees in both angle modes; null for any other call.
 */
export function degreeArgument(name: string, args: readonly Node[]): Node | null {
  if (!CIRCULAR_NAMES.has(name) || args.length !== 1) return null;
  const [arg] = args;
  return arg.kind === "deg" ? arg.arg : null;
}

/**
 * Compiles `tree` for real mode into `(x, y) => number` (01-interfaces.md section 4): NaN means
 * undefined. A name resolves as a variable (x, y or a parameter of a call in progress), then `i`
 * as non-real in complex mode, then `scope.values` (NaN unless a number), then a zero-parameter
 * entry of `scope.functions` run with the same variables, else NaN. A call binds its parameters
 * over the caller's variables; past MAX_CALL_DEPTH nested calls, or for a name without a
 * `scope.functions` entry (a head with an error), it is NaN.
 */
export function compileReal(tree: Node, scope: CompileScope): (x: number, y: number) => number {
  const ctx: Context = {
    scope,
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
  };
  const root = compile(tree, ctx),
    env = ctx.env;
  return (x, y) => {
    env[0] = finite(x);
    env[1] = finite(y);
    return root();
  };
}

function compile(node: Node, ctx: Context): Fn {
  switch (node.kind) {
    case "num": {
      const v = finite(node.value);
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
    case "deg": {
      const a = compile(node.arg, ctx);
      return ctx.scope.settings.angleMode === "degrees" ? a : () => finite((a() * Math.PI) / 180);
    }
    case "root": {
      const a = compile(node.arg, ctx);
      if (node.index === null) return () => realRoot(a(), 2);
      const index = compile(node.index, ctx);
      return () => realRoot(a(), index());
    }
    case "call":
      return call(node, ctx);
    case "rel":
      return relation(node.operands, node.ops, ctx);
    case "fact": {
      const a = compile(node.arg, ctx);
      return () => factorial(a());
    }
    case "point": // a point is not a real number
      return undefinedFn;
  }
}

function arithmetic(node: Binary, ctx: Context): Fn {
  const a = compile(node.left, ctx),
    b = compile(node.right, ctx);
  switch (node.kind) {
    case "add":
      return () => finite(a() + b());
    case "sub":
      return () => finite(a() - b());
    case "mul":
      return () => finite(a() * b());
    default:
      return () => finite(a() / b()); // ÷ 0 is not finite, so undefined (NM-12)
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
  if (isBuiltinName(node.name)) return builtinCall(node.name, node.args, ctx);
  const fn = userFunction(node.name, ctx);
  if (fn === null || fn.slots.length !== node.args.length) return undefinedFn;
  return userCall(
    fn,
    node.args.map((arg) => compile(arg, ctx)),
    ctx
  );
}

/**
 * A built-in's real rule in the angle unit (FN-4): NaN for an unshipped name, a count outside its
 * arity or a NaN argument. `name(deg(A))` of a circular function is NM-26's exact degree path.
 * The arguments are evaluated onto the stack and then copied into this call site's buffer, so a
 * nested evaluation of the same call site cannot overwrite them.
 */
function builtinCall(name: string, argNodes: readonly Node[], ctx: Context): Fn {
  const degrees = degreeArgument(name, argNodes);
  if (degrees !== null) {
    const angle = compile(degrees, ctx);
    return () => circular(name as CircularName, angle(), "degrees");
  }
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
 * Calls a user function: the arguments are evaluated in the caller's variables onto the stack,
 * then swapped into the parameters' slots, and the replaced values are restored after the body.
 */
function userCall(fn: RealFunction, args: readonly Fn[], ctx: Context): Fn {
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
    slots: definition.params.map((param) => slotOf(param, ctx)),
    body: undefinedFn,
  };
  ctx.functions.set(name, fn);
  fn.body = compile(definition.body, ctx);
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

/** NM-22, 04 decision 6: 1 when every operand is a number and every link holds, else NaN. */
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
