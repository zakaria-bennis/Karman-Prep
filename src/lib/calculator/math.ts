import {
  parse,
  OperatorNode,
  SymbolNode,
  type MathNode,
  sin,
  cos,
  tan,
  asin,
  acos,
  atan,
  sqrt,
  abs,
  exp,
  log,
  pow,
  multiply,
  divide,
  complex,
  isComplex,
  isMatrix,
  format,
} from "mathjs";
import { plainMath } from "./syntax";

export type Scope = Map<string, unknown>;
export interface MathSettings {
  degrees: boolean;
  complex: boolean;
}
const scalarMap =
  (fn: (n: number) => unknown) =>
  (value: unknown): unknown => {
    const v = unwrap(value);
    return Array.isArray(v) ? v.map(scalarMap(fn)) : fn(v as number);
  };
export function unwrap(value: unknown): unknown {
  return isMatrix(value) ? value.toArray() : value;
}
function numbers(args: unknown[]): number[] {
  const values = args
    .flatMap((v) => (Array.isArray(unwrap(v)) ? unwrap(v) : [v]) as unknown[])
    .map(real);
  if (!values.length) throw new Error("Add at least one value.");
  return values;
}
export function real(v: unknown): number {
  if (typeof v === "number") return v;
  if (isComplex(v) && Math.abs(v.im) < 1e-12) return v.re;
  return NaN;
}
function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 170)
    throw new Error("Factorial requires an integer from 0 to 170.");
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n || n > 10000)
    throw new Error("Use integers with 0 ≤ k ≤ n ≤ 10,000.");
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - i + 1)) / i;
  return r;
}
export function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return NaN;
  const mx = x.reduce((a, b) => a + b, 0) / n,
    my = y.reduce((a, b) => a + b, 0) / n;
  const xx = x.reduce((a, b) => a + (b - mx) ** 2, 0),
    yy = y.reduce((a, b) => a + (b - my) ** 2, 0);
  return x.reduce((a, b, i) => a + (b - mx) * (y[i] - my), 0) / Math.sqrt(xx * yy);
}
export function makeScope(settings: MathSettings): Scope {
  const angle = settings.degrees ? Math.PI / 180 : 1;
  const trig = (fn: typeof sin) => scalarMap((n) => fn(multiply(n, angle) as number));
  const inverse = (fn: typeof asin) => scalarMap((n) => divide(fn(n), angle));
  const mean = (...args: unknown[]) => {
    const a = numbers(args);
    return a.reduce((x, y) => x + y, 0) / a.length;
  };
  const variance = (sample: boolean, ...args: unknown[]) => {
    const a = numbers(args),
      m = mean(a);
    return a.reduce((s, n) => s + (n - m) ** 2, 0) / (a.length - (sample ? 1 : 0));
  };
  const fns: Record<string, unknown> = {
    pi: Math.PI,
    e: Math.E,
    tau: 2 * Math.PI,
    NaN,
    sin: trig(sin),
    cos: trig(cos),
    tan: scalarMap((n) =>
      typeof n === "number" && Math.abs(Math.cos(n * angle)) < 1e-14
        ? NaN
        : tan(multiply(n, angle) as number)
    ),
    asin: inverse(asin),
    acos: inverse(acos),
    atan: inverse(atan),
    sec: scalarMap((n) => divide(1, cos(multiply(n, angle) as number))),
    csc: scalarMap((n) => divide(1, sin(multiply(n, angle) as number))),
    cot: scalarMap((n) => divide(1, tan(multiply(n, angle) as number))),
    sinh: scalarMap(Math.sinh),
    cosh: scalarMap(Math.cosh),
    tanh: scalarMap(Math.tanh),
    sqrt: scalarMap((n) => sqrt(n)),
    abs: scalarMap((n) => abs(n)),
    exp: scalarMap((n) => exp(n)),
    ln: scalarMap((n) => log(n)),
    log: (n: number, base = 10) => scalarMap((v) => log(v, base))(n),
    floor: scalarMap(Math.floor),
    ceil: scalarMap(Math.ceil),
    round: (n: number, p = 0) => scalarMap((v) => Math.round(v * 10 ** p) / 10 ** p)(n),
    sign: scalarMap(Math.sign),
    factorial,
    nCr: choose,
    nPr: (n: number, k: number) => choose(n, k) * factorial(k),
    mod: (n: number, d: number) => ((n % d) + d) % d,
    min: (...args: unknown[]) => Math.min(...numbers(args)),
    max: (...args: unknown[]) => Math.max(...numbers(args)),
    mean,
    total: (...args: unknown[]) => numbers(args).reduce((a, b) => a + b, 0),
    count: (...args: unknown[]) => numbers(args).length,
    median: (...args: unknown[]) => {
      const a = numbers(args).sort((x, y) => x - y);
      return (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2;
    },
    stdev: (...args: unknown[]) => Math.sqrt(variance(true, ...args)),
    stdevp: (...args: unknown[]) => Math.sqrt(variance(false, ...args)),
    var: (...args: unknown[]) => variance(true, ...args),
    varp: (...args: unknown[]) => variance(false, ...args),
    corr: (x: unknown, y: unknown) => pearson(numbers([x]), numbers([y])),
    quantile: (x: unknown, q: number) => {
      const a = numbers([x]).sort((a, b) => a - b);
      if (q < 0 || q > 1) return NaN;
      const i = (a.length - 1) * q;
      return a[Math.floor(i)] + (a[Math.ceil(i)] - a[Math.floor(i)]) * (i % 1);
    },
    cbrt: scalarMap(Math.cbrt),
  };
  const scope = new Map(Object.entries(fns));
  if (settings.complex) scope.set("i", complex(0, 1));
  return scope;
}
const ALLOWED_NODES = new Set([
  "ConstantNode",
  "SymbolNode",
  "OperatorNode",
  "ParenthesisNode",
  "FunctionNode",
  "ArrayNode",
  "ConditionalNode",
  "RelationalNode",
  "AccessorNode",
  "IndexNode",
]);

export interface CompiledMath {
  symbols: string[];
  references: string[];
  evaluate(scope?: Scope): unknown;
  tex: string;
}
export function compileMath(input: string, base: Scope, normalized = false): CompiledMath {
  const text = normalized ? input : plainMath(input);
  if (!text) throw new Error("Enter an expression.");
  let node = parse(text);
  let count = 0;
  node.traverse((n) => {
    if (++count > 1500 || !ALLOWED_NODES.has(n.type))
      throw new Error("Use a numeric expression, function, or list.");
    if (n.type === "ConstantNode" && typeof (n as unknown as { value: unknown }).value !== "number")
      throw new Error("Only numeric constants are supported.");
    if (
      n.type === "AccessorNode" &&
      (n as unknown as { index: { dotNotation: boolean } }).index.dotNotation
    )
      throw new Error("Object properties are not supported.");
    if (
      n.type === "IndexNode" &&
      (n as unknown as { dimensions: MathNode[] }).dimensions.length !== 1
    )
      throw new Error("Use one list index.");
    if (n.type === "FunctionNode") {
      const fn = (n as unknown as { fn: MathNode }).fn;
      if (
        fn.type !== "SymbolNode" ||
        typeof base.get((fn as unknown as { name: string }).name) !== "function"
      )
        throw new Error(`Unknown function ${(fn as unknown as { name?: string }).name ?? ""}.`);
    }
  });
  node = node.transform((n, _path, parent) => {
    if (n.type === "OperatorNode") {
      const op = n as unknown as { fn: string; args: MathNode[]; implicit: boolean };
      if (op.fn === "multiply") return new OperatorNode(".*", "dotMultiply", op.args, op.implicit);
      if (op.fn === "divide") return new OperatorNode("./", "dotDivide", op.args);
      if (op.fn === "pow") return new OperatorNode(".^", "dotPow", op.args);
    }
    if (n.type === "SymbolNode") {
      const name = (n as SymbolNode).name;
      // Standard algebra writes mx as m·x. Named values/functions and subscripts stay intact.
      if (
        /^[a-z]{2,5}$/.test(name) &&
        !base.has(name) &&
        name !== "theta" &&
        !(parent?.type === "FunctionNode" && (parent as unknown as { fn: MathNode }).fn === n)
      ) {
        return [...name]
          .map<MathNode>((c) => new SymbolNode(c))
          .reduce((a, b) => new OperatorNode(".*", "dotMultiply", [a, b]));
      }
    }
    return n;
  });
  const symbols = new Set<string>();
  const references = new Set<string>();
  node.traverse((n, _path, parent) => {
    if (
      n.type === "SymbolNode" &&
      !(parent?.type === "FunctionNode" && (parent as unknown as { fn: MathNode }).fn === n)
    ) {
      const name = (n as SymbolNode).name;
      references.add(name);
      if (!base.has(name)) symbols.add(name);
    }
  });
  const compiled = node.compile();
  return {
    symbols: [...symbols],
    references: [...references],
    tex: node.toTex(),
    evaluate: (scope = base) => unwrap(compiled.evaluate(scope)),
  };
}
export function resultText(value: unknown, complex: boolean): string {
  value = unwrap(value);
  if (Array.isArray(value))
    return `[${value
      .slice(0, 30)
      .map((v) => resultText(v, complex))
      .join(", ")}${value.length > 30 ? ", …" : ""}]`;
  if (isComplex(value)) {
    if (!complex && Math.abs(value.im) > 1e-12)
      throw new Error("Enable complex mode to use imaginary numbers.");
    if (Math.abs(value.im) < 1e-12) return resultText(value.re, complex);
    return format(value, { precision: 10 });
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value !== "number" || !Number.isFinite(value)) return "undefined";
  return format(Math.abs(value) < 1e-14 ? 0 : value, { precision: 10 });
}
export function at(
  compiled: CompiledMath,
  scope: Scope,
  variables: Record<string, number>
): number {
  const local = new Map(scope);
  for (const [key, value] of Object.entries(variables)) local.set(key, value);
  try {
    return real(compiled.evaluate(local));
  } catch {
    return NaN;
  }
}
// Keep a typed numeric power available to the regression layer without exposing parser imports.
export const numericPower = (a: number, b: number): number => real(pow(a, b));
