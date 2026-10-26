// Prime notation (PR-28, FN-61 to FN-63): `f'(x)`, `f''(x)` and further primes of a one-parameter
// user function, as live Desmos computes them (2026-10-25): symbolically, so `f(x)=2x^2-15x+23`
// gives f'(4) = 1 exactly and `f'(b)\sim1` is a linear fit. The derivative of a user function is
// a new function definition named with its primes, `f'`, built from the body's syntax tree by the
// sum, product, quotient, power and chain rules and the derivatives of the elementary built-ins;
// other user functions are inlined. A node without a rule (a factorial, a list operation) leaves
// the derivative undefined. Pure TypeScript.

import type { FunctionDefinition } from "../analysis/index";
import { primedName, sourceChildren, withChildren, type Node, type SourceSpan } from "../latex/ast";
import { BUILTIN_ARITY } from "../lib/arity";

/** Inlined user calls nested deeper than this (a recursion) leave the derivative undefined. */
const MAX_INLINE_DEPTH = 24;
/** A derivative tree larger than this is not built (repeated primes of a long body). */
const MAX_NODES = 20000;

const SPAN: SourceSpan = { start: 0, end: 0 };
class NoRule extends Error {}

type Lookup = (name: string) => FunctionDefinition | undefined;

/**
 * `functions` with the derived definition of every primed name in `names` added (`f'`, `f''`):
 * one parameter, the derivative of the unprimed body in it. A name whose function is missing, has
 * other than one parameter or has a node without a rule gets no entry, so its calls are undefined.
 */
export function withDerivatives(
  functions: Map<string, FunctionDefinition>,
  names: Iterable<string>,
  angleMode: "radians" | "degrees"
): void {
  const busy = new Set<string>();
  const lookup: Lookup = (name) => {
    const known = functions.get(name);
    if (known !== undefined || busy.has(name)) return known;
    const primed = primedName(name);
    if (primed === null) return undefined;
    busy.add(name);
    try {
      const base = lookup(primed.primes === 1 ? primed.base : name.slice(0, -1)) ?? builtin(primed);
      if (base === undefined || base.params.length !== 1) return undefined;
      const [param] = base.params;
      const body = differentiate(base.body, param, lookup, angleMode);
      if (body === null) return undefined;
      const derived: FunctionDefinition = { name, params: [param], body, rowId: base.rowId };
      functions.set(name, derived);
      return derived;
    } finally {
      busy.delete(name);
    }
  };
  for (const name of names) lookup(name);
}

/** A one-argument built-in as a definition, `sin(x)`, so `\sin'(x)` has a derivative too. */
function builtin(primed: { base: string; primes: number }): FunctionDefinition | undefined {
  if (primed.primes !== 1 || !BUILTIN_ARITY.get(primed.base)?.includes(1)) return undefined;
  const x: Node = { kind: "id", name: "x", span: SPAN };
  return { name: primed.base, params: ["x"], body: call(primed.base, x), rowId: "" };
}

/** Every call name with primes in `tree`. */
export function primedCalls(tree: Node, out: Set<string>): void {
  const pending: Node[] = [tree];
  for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
    if (n.kind === "call" && primedName(n.name) !== null) out.add(n.name);
    pending.push(...sourceChildren(n));
  }
}

/** d/dv of `body`, or null when some node has no rule or the tree grows too large. */
export function differentiate(
  body: Node,
  v: string,
  lookup: Lookup,
  angleMode: "radians" | "degrees"
): Node | null {
  const ctx: Ctx = { v, lookup, unit: angleMode === "degrees" ? Math.PI / 180 : 1, depth: 0 };
  try {
    const d = derive(body, ctx);
    return size(d) > MAX_NODES ? null : d;
  } catch (error) {
    if (error instanceof NoRule) return null;
    throw error;
  }
}

interface Ctx {
  v: string;
  lookup: Lookup;
  unit: number; // NM-25: π/180 in degree mode for the circular functions' inputs
  depth: number;
}

// ---------- tree builders, folding 0 and 1 ----------

const num = (value: number): Node => ({ kind: "num", value, span: SPAN });
const isNum = (n: Node, value: number) => n.kind === "num" && n.value === value;
const call = (name: string, ...args: Node[]): Node => ({ kind: "call", name, args, span: SPAN });
const bin = (kind: "add" | "sub" | "mul" | "div" | "pow", left: Node, right: Node): Node => ({
  kind,
  left,
  right,
  span: SPAN,
});

function add(a: Node, b: Node): Node {
  if (isNum(a, 0)) return b;
  if (isNum(b, 0)) return a;
  if (a.kind === "num" && b.kind === "num") return num(a.value + b.value);
  return bin("add", a, b);
}
function sub(a: Node, b: Node): Node {
  if (isNum(b, 0)) return a;
  if (isNum(a, 0)) return neg(b);
  if (a.kind === "num" && b.kind === "num") return num(a.value - b.value);
  return bin("sub", a, b);
}
function mul(a: Node, b: Node): Node {
  if (isNum(a, 0) || isNum(b, 0)) return num(0);
  if (isNum(a, 1)) return b;
  if (isNum(b, 1)) return a;
  if (a.kind === "num" && b.kind === "num") return num(a.value * b.value);
  return bin("mul", a, b);
}
function div(a: Node, b: Node): Node {
  if (isNum(a, 0)) return num(0);
  if (isNum(b, 1)) return a;
  return bin("div", a, b);
}
function pow(a: Node, b: Node): Node {
  if (isNum(b, 1)) return a;
  if (isNum(b, 0)) return num(1);
  return bin("pow", a, b);
}
function neg(a: Node): Node {
  if (a.kind === "num") return num(-a.value);
  if (a.kind === "neg") return a.arg;
  return { kind: "neg", arg: a, span: SPAN };
}
const square = (a: Node) => pow(a, num(2));
/** 0 where `gap` is not 0 and undefined where it is: a step function's derivative (FN-62). */
const zeroUnless = (gap: Node): Node => bin("div", num(0), { kind: "abs", arg: gap, span: SPAN });

// ---------- the rules ----------

/** Whether `n` uses the variable (through user functions too). */
function uses(n: Node, ctx: Ctx, seen: Set<string> = new Set()): boolean {
  if (n.kind === "id") {
    if (n.name === ctx.v) return true;
    const fn = ctx.lookup(n.name);
    if (fn === undefined || fn.params.length > 0 || seen.has(n.name)) return false;
    seen.add(n.name);
    return uses(fn.body, ctx, seen);
  }
  if (n.kind === "for" && n.bindings.some((b) => b.name === ctx.v)) {
    return n.bindings.some((b) => uses(b.list, ctx, seen));
  }
  if (n.kind === "call" && n.member === undefined && !seen.has(n.name)) {
    const fn = ctx.lookup(n.name);
    if (fn !== undefined) {
      seen.add(n.name);
      if (uses(fn.body, ctx, seen)) return true;
    }
  }
  return sourceChildren(n).some((c) => uses(c, ctx, seen));
}

function derive(n: Node, ctx: Ctx): Node {
  if (!uses(n, ctx)) return num(0);
  const d = (m: Node) => derive(m, ctx);
  switch (n.kind) {
    case "id": {
      if (n.name === ctx.v) return num(1);
      return inline(ctx, () => d(ctx.lookup(n.name)!.body)); // a dependent definition
    }
    case "add":
      return add(d(n.left), d(n.right));
    case "sub":
      return sub(d(n.left), d(n.right));
    case "neg":
      return neg(d(n.arg));
    case "pct":
      return div(d(n.arg), num(100));
    case "mul":
      return add(mul(d(n.left), n.right), mul(n.left, d(n.right)));
    case "div": {
      const [u, w] = [n.left, n.right];
      if (!uses(w, ctx)) return div(d(u), w);
      return sub(div(d(u), w), div(mul(u, d(w)), square(w)));
    }
    case "pow":
      return power(n.left, n.right, ctx);
    case "abs": // |u|' = u'·u/|u|: undefined where u is 0 (FN-61: d/dx |x| at 0)
      return mul(d(n.arg), div(n.arg, n));
    case "root": {
      // ⁿ√u' = ⁿ√u·u'/(n·u); √u' = u'/(2√u)
      if (n.index === null) return div(d(n.arg), mul(num(2), n));
      if (uses(n.index, ctx)) throw new NoRule();
      return div(mul(n, d(n.arg)), mul(n.index, n.arg));
    }
    case "piecewise":
      return {
        ...n,
        span: SPAN,
        branches: n.branches.map((b) => ({
          cond: b.cond,
          value: b.value === null ? num(0) : d(b.value),
        })),
        otherwise: n.otherwise === null ? null : d(n.otherwise),
      };
    case "point":
      return { kind: "point", x: d(n.x), y: d(n.y), span: SPAN };
    case "list":
      if (n.range !== undefined) throw new NoRule();
      return { kind: "list", items: n.items.map(d), span: SPAN };
    case "call":
      return callDerivative(n, ctx);
    default:
      throw new NoRule();
  }
}

/** u^w by the power rule, the exponential rule or, with both varying, u^w·(w'·ln u + w·u'/u). */
function power(u: Node, w: Node, ctx: Ctx): Node {
  const d = (m: Node) => derive(m, ctx);
  const n = pow(u, w);
  if (!uses(w, ctx)) return mul(mul(w, pow(u, sub(w, num(1)))), d(u));
  if (!uses(u, ctx)) return mul(mul(n, call("ln", u)), d(w));
  return mul(n, add(mul(d(w), call("ln", u)), div(mul(w, d(u)), u)));
}

type CallNode = Extract<Node, { kind: "call" }>;

/** The chain rule through a built-in, or a user function inlined. */
function callDerivative(n: CallNode, ctx: Ctx): Node {
  if (n.member !== undefined) throw new NoRule();
  const fn = ctx.lookup(n.name);
  if (fn !== undefined) {
    if (fn.params.length !== n.args.length) throw new NoRule();
    const bound = new Map(fn.params.map((p, k) => [p, n.args[k]]));
    return inline(ctx, () => derive(substitute(fn.body, bound), ctx));
  }
  const [u] = n.args;
  if (n.name === "log" && n.args.length === 2) {
    // log_b u = ln u / ln b
    return derive(bin("div", call("ln", u), call("ln", n.args[1])), ctx);
  }
  if (n.args.length !== 1) throw new NoRule();
  const du = derive(u, ctx);
  const outer = elementary(n.name, u, ctx.unit);
  return mul(outer, du);
}

/** f′(u) for a one-argument built-in f, in the angle unit (NM-25). */
function elementary(name: string, u: Node, unit: number): Node {
  const k = (e: Node) => (unit === 1 ? e : mul(num(unit), e));
  const inverse = (e: Node) => (unit === 1 ? e : div(e, num(unit)));
  const one = num(1);
  const f = (fn: string) => call(fn, u);
  switch (name) {
    case "sin":
      return k(f("cos"));
    case "cos":
      return k(neg(f("sin")));
    case "tan":
      return k(square(f("sec")));
    case "sec":
      return k(mul(f("sec"), f("tan")));
    case "csc":
      return k(neg(mul(f("csc"), f("cot"))));
    case "cot":
      return k(neg(square(f("csc"))));
    case "arcsin":
      return inverse(div(one, { kind: "root", arg: sub(one, square(u)), index: null, span: SPAN }));
    case "arccos":
      return inverse(
        neg(div(one, { kind: "root", arg: sub(one, square(u)), index: null, span: SPAN }))
      );
    case "arctan":
      return inverse(div(one, add(one, square(u))));
    case "arccot":
      return inverse(neg(div(one, add(one, square(u)))));
    case "arcsec":
    case "arccsc": {
      const r = div(
        one,
        mul(
          { kind: "abs", arg: u, span: SPAN },
          {
            kind: "root",
            arg: sub(square(u), one),
            index: null,
            span: SPAN,
          }
        )
      );
      return inverse(name === "arcsec" ? r : neg(r));
    }
    case "sinh":
      return f("cosh");
    case "cosh":
      return f("sinh");
    case "tanh":
      return div(one, square(f("cosh")));
    case "exp":
      return f("exp");
    case "ln":
      return div(one, u);
    case "log":
      return div(one, mul(u, num(Math.LN10)));
    case "floor":
      return zeroUnless(sub(u, f("floor")));
    case "ceil":
      return zeroUnless(sub(f("ceil"), u));
    case "round":
      return zeroUnless(sub(num(0.5), { kind: "abs", arg: sub(u, f("round")), span: SPAN }));
    case "sign":
      return zeroUnless(u);
    default:
      throw new NoRule();
  }
}

/** Runs `body` one inlined call deeper; a recursion past MAX_INLINE_DEPTH has no derivative. */
function inline(ctx: Ctx, body: () => Node): Node {
  if (ctx.depth >= MAX_INLINE_DEPTH) throw new NoRule();
  ctx.depth += 1;
  try {
    return body();
  } finally {
    ctx.depth -= 1;
  }
}

/** `n` with each free name of `bound` replaced by its tree (a comprehension's names stay local). */
function substitute(n: Node, bound: ReadonlyMap<string, Node>): Node {
  if (bound.size === 0) return n;
  if (n.kind === "id") return bound.get(n.name) ?? n;
  if (n.kind === "for") {
    const inner = new Map(bound);
    for (const b of n.bindings) inner.delete(b.name);
    return {
      ...n,
      body: substitute(n.body, inner),
      bindings: n.bindings.map((b) => ({ ...b, list: substitute(b.list, bound) })),
    };
  }
  return withChildren(
    n,
    sourceChildren(n).map((c) => substitute(c, bound))
  );
}

function size(n: Node): number {
  let count = 0;
  const pending = [n];
  for (let m = pending.pop(); m !== undefined; m = pending.pop()) {
    count += 1;
    pending.push(...sourceChildren(m));
  }
  return count;
}
