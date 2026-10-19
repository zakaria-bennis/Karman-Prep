// The closure compiler and row evaluation (01-interfaces.md section 4; NM-9, NM-12, NM-21, NM-22,
// NM-27, FN-17, G-6). Trees compile once into closures over `Value`; real-mode plotting functions
// use compile-real.ts on plain numbers. Pure TypeScript: no DOM (AR-44), and no eval or Function.

import {
  analyzeRows,
  type AnalysisResult,
  type FunctionDefinition,
  type RowAnalysis,
} from "../analysis/index";
import { DeadlineExceeded, NO_DEADLINE, type Deadline } from "../deadline";
import type { Node } from "../latex/ast";
import { isBuiltinName } from "../latex/operator-names";
import { applyBuiltin } from "../lib/builtins";
import { circular, type CircularName } from "../lib/trig";
import { C_I } from "./complex";
import { compileReal, constantValue, degreeArgument, MAX_CALL_DEPTH } from "./compile-real";
import {
  absV,
  addV,
  degV,
  divV,
  factV,
  mulV,
  negV,
  pctV,
  powV,
  relationHolds,
  rootV,
  subV,
  toPlotNumber,
} from "./ops";
import { exponentRational } from "./real-pow";
import { complexValue, numberValue, UNDEFINED, type Value } from "./values";

export interface EvalSettings {
  angleMode: "radians" | "degrees";
  complex: boolean;
}
export interface CompileScope {
  functions: ReadonlyMap<string, FunctionDefinition>;
  values: ReadonlyMap<string, Value>;
  settings: EvalSettings;
}
export type Compiled = (vars: Readonly<Record<string, Value>>, deadline: Deadline) => Value;

type Binary = Extract<Node, { left: Node }>;
type Call = Extract<Node, { kind: "call" }>;

/** A user function, compiled once per compileExpression. */
interface CompiledFunction {
  params: readonly string[];
  body: Compiled;
}

interface Context {
  scope: CompileScope;
  functions: Map<string, CompiledFunction>;
  depth: number; // user-function calls in progress
}

const ONE: Value = Object.freeze(numberValue(1));
const I_VALUE: Value = Object.freeze(complexValue(C_I.re, C_I.im));
const hasOwn = (vars: Readonly<Record<string, Value>>, name: string) =>
  Object.prototype.hasOwnProperty.call(vars, name);

/**
 * Compiles `tree` into a closure over `Value`. A name resolves to `vars`, then `i` in complex mode,
 * then `scope.values`, then a zero-parameter entry of `scope.functions` (its body compiled once
 * and run with the same `vars`), else UNDEFINED. Arithmetic goes through ops.ts, built-ins through
 * applyBuiltin, and `name(deg(A))` of a circular function with a real A through NM-26's exact
 * degree path (NM-27). A user call binds its parameters over the caller's `vars`, calls
 * `deadline.check()`, and is UNDEFINED past MAX_CALL_DEPTH nested calls or when the name has no
 * `scope.functions` entry (a head with an error). 04 decision 6: a `rel` node is n(1) when every
 * link holds between real operands, else UNDEFINED.
 */
export function compileExpression(tree: Node, scope: CompileScope): Compiled {
  return compileNode(tree, { scope, functions: new Map(), depth: 0 });
}

function constant(v: Value): Compiled {
  return () => v;
}

function compileNode(node: Node, ctx: Context): Compiled {
  const { angleMode, complex } = ctx.scope.settings;
  switch (node.kind) {
    case "num":
      return constant(Object.freeze(numberValue(node.value)));
    case "const":
      return constant(Object.freeze(numberValue(constantValue(node.name))));
    case "id":
      return identifier(node.name, ctx);
    case "add":
      return binary(node, ctx, addV);
    case "sub":
      return binary(node, ctx, subV);
    case "mul":
      return binary(node, ctx, mulV);
    case "div":
      return binary(node, ctx, divV);
    case "pow":
      return power(node, ctx);
    case "neg":
      return unary(node.arg, ctx, negV);
    case "pct":
      return unary(node.arg, ctx, pctV);
    case "abs":
      return unary(node.arg, ctx, absV);
    case "deg":
      return unary(node.arg, ctx, (a) => degV(a, angleMode));
    case "fact":
      return unary(node.arg, ctx, factV);
    case "root": {
      const arg = compileNode(node.arg, ctx),
        index = node.index === null ? null : compileNode(node.index, ctx);
      return (vars, deadline) =>
        rootV(arg(vars, deadline), index === null ? null : index(vars, deadline), complex);
    }
    case "call":
      return call(node, ctx);
    case "point": {
      // 04 decision 7: an undefined or non-real coordinate is stored as NaN.
      const x = compileNode(node.x, ctx),
        y = compileNode(node.y, ctx);
      return (vars, deadline) => ({
        type: "point",
        value: [toPlotNumber(x(vars, deadline)), toPlotNumber(y(vars, deadline))],
      });
    }
    case "rel": {
      const operands = node.operands.map((operand) => compileNode(operand, ctx)),
        ops = node.ops;
      return (vars, deadline) =>
        relationHolds(
          operands.map((operand) => operand(vars, deadline)),
          ops
        )
          ? ONE
          : UNDEFINED;
    }
  }
}

function unary(argNode: Node, ctx: Context, op: (a: Value) => Value): Compiled {
  const arg = compileNode(argNode, ctx);
  return (vars, deadline) => op(arg(vars, deadline));
}

function binary(node: Binary, ctx: Context, op: (a: Value, b: Value) => Value): Compiled {
  const a = compileNode(node.left, ctx),
    b = compileNode(node.right, ctx);
  return (vars, deadline) => op(a(vars, deadline), b(vars, deadline));
}

/** a^b by powV with the exponent's tree rational fixed here (NM-10, NM-19); e^B is exp(B). */
function power(node: Binary, ctx: Context): Compiled {
  if (node.left.kind === "const" && node.left.name === "e") {
    return builtinCall("exp", [node.right], ctx);
  }
  const a = compileNode(node.left, ctx),
    b = compileNode(node.right, ctx),
    rational = exponentRational(node.right),
    { complex } = ctx.scope.settings;
  return (vars, deadline) => powV(a(vars, deadline), b(vars, deadline), rational, complex);
}

function call(node: Call, ctx: Context): Compiled {
  if (isBuiltinName(node.name)) return builtinCall(node.name, node.args, ctx);
  const fn = userFunction(node.name, ctx);
  if (fn === null || fn.params.length !== node.args.length) return constant(UNDEFINED);
  return userCall(
    fn,
    node.args.map((arg) => compileNode(arg, ctx)),
    ctx
  );
}

/**
 * A built-in through applyBuiltin (FN-4, FN-6, FN-17). NM-27: a circular function of `deg(A)` with
 * a real A is evaluated exactly in degrees (NM-26) whatever the angle unit; a non-real A takes the
 * general path, so its complex rule stays in radians (NM-25).
 */
function builtinCall(name: string, argNodes: readonly Node[], ctx: Context): Compiled {
  const { angleMode, complex } = ctx.scope.settings,
    degrees = degreeArgument(name, argNodes);
  if (degrees !== null) {
    const angle = compileNode(degrees, ctx);
    return (vars, deadline) => {
      const a = angle(vars, deadline);
      if (a.type === "number") {
        return numberValue(circular(name as CircularName, a.value, "degrees"));
      }
      return applyBuiltin(name, [degV(a, angleMode)], angleMode, complex);
    };
  }
  const args = argNodes.map((arg) => compileNode(arg, ctx));
  return (vars, deadline) =>
    applyBuiltin(
      name,
      args.map((arg) => arg(vars, deadline)),
      angleMode,
      complex
    );
}

/**
 * Calls a user function: its parameters are bound over the caller's `vars`, the deadline is
 * checked (04 decision 5), and a call past MAX_CALL_DEPTH nested calls is UNDEFINED.
 */
function userCall(fn: CompiledFunction, args: readonly Compiled[], ctx: Context): Compiled {
  return (vars, deadline) => {
    const values = args.map((arg) => arg(vars, deadline));
    deadline.check();
    if (ctx.depth >= MAX_CALL_DEPTH) return UNDEFINED;
    const inner: Record<string, Value> = { ...vars };
    fn.params.forEach((param, k) => {
      inner[param] = values[k];
    });
    ctx.depth += 1;
    try {
      return fn.body(inner, deadline);
    } finally {
      ctx.depth -= 1;
    }
  };
}

/**
 * The function `name` of `scope.functions`, compiled once per compileExpression. It is cached
 * before its body compiles, and calls read `body` when they run, so a body reaching its own name
 * compiles (and is cut off at run time by MAX_CALL_DEPTH).
 */
function userFunction(name: string, ctx: Context): CompiledFunction | null {
  const known = ctx.functions.get(name);
  if (known !== undefined) return known;
  const definition = ctx.scope.functions.get(name);
  if (definition === undefined) return null;
  const fn: CompiledFunction = { params: definition.params, body: constant(UNDEFINED) };
  ctx.functions.set(name, fn);
  fn.body = compileNode(definition.body, ctx);
  return fn;
}

function identifier(name: string, ctx: Context): Compiled {
  const fallback = unboundName(name, ctx);
  return (vars, deadline) => (hasOwn(vars, name) ? vars[name] : fallback(vars, deadline));
}

/** A name not in `vars`: `i` in complex mode, a value, a zero-parameter function or UNDEFINED. */
function unboundName(name: string, ctx: Context): Compiled {
  const { scope } = ctx;
  if (scope.settings.complex && name === "i") return constant(I_VALUE);
  const value = scope.values.get(name);
  if (value !== undefined) return constant(value);
  const fn = userFunction(name, ctx);
  return fn !== null && fn.params.length === 0 ? userCall(fn, [], ctx) : constant(UNDEFINED);
}

/**
 * NM-21, FN-17: `tree` as a function of one coordinate, NaN where it is undefined or, in complex
 * mode, not real (|Im| > 1e-12·max(1, |Re|)); the other coordinate is undefined. Real mode uses
 * compileReal, complex mode the Value closure through toPlotNumber.
 */
export function compileRealFunction1(
  tree: Node,
  variable: "x" | "y",
  scope: CompileScope
): (t: number) => number {
  if (!scope.settings.complex) {
    const g = compileReal(tree, scope);
    return variable === "x" ? (t) => g(t, NaN) : (t) => g(NaN, t);
  }
  const f = compileExpression(tree, scope);
  return variable === "x"
    ? (t) => toPlotNumber(f({ x: numberValue(t), y: UNDEFINED }, NO_DEADLINE))
    : (t) => toPlotNumber(f({ x: UNDEFINED, y: numberValue(t) }, NO_DEADLINE));
}

/** NM-21: `tree` as a function of x and y, by compileRealFunction1's rule. */
export function compileRealFunction2(
  tree: Node,
  scope: CompileScope
): (x: number, y: number) => number {
  if (!scope.settings.complex) return compileReal(tree, scope);
  const f = compileExpression(tree, scope);
  return (x, y) => toPlotNumber(f({ x: numberValue(x), y: numberValue(y) }, NO_DEADLINE));
}

/** decision 5: the rows evaluateRows gives a value, by kind; and only without an error or chips. */
function evaluable(row: RowAnalysis, kinds: readonly RowAnalysis["kind"][]): boolean {
  return kinds.includes(row.kind) && row.error === null && row.chips.length === 0;
}

/** The body of a definition row `name=body`. */
function definitionBody(row: RowAnalysis): Node | null {
  const { tree } = row;
  return tree !== null && tree.kind === "rel" && tree.operands.length === 2
    ? tree.operands[1]
    : null;
}

/**
 * 04 decision 5: entries only for error-free, chip-free rows of kind `value`, `definition` and
 * `point`; definitions first in `valueOrder` (filling the name-to-value map later rows read),
 * then value and point rows in list order. `deadlineFor(id)` is called once per evaluated row,
 * checked before the row and passed to its closure, which checks it at every user-function call.
 * A row whose check throws DeadlineExceeded is omitted, and its dependants evaluate to UNDEFINED.
 */
export function evaluateRows(
  analysis: AnalysisResult,
  settings: EvalSettings,
  deadlineFor: (rowId: string) => Deadline
): Map<string, Value> {
  const byRow = new Map<string, Value>(),
    values = new Map<string, Value>(),
    scope: CompileScope = { functions: analysis.functions, values, settings };
  const evaluate = (id: string, tree: Node): Value | null => {
    const deadline = deadlineFor(id);
    try {
      deadline.check();
      const v = compileExpression(tree, scope)({}, deadline);
      byRow.set(id, v);
      return v;
    } catch (error) {
      if (error instanceof DeadlineExceeded) return null;
      throw error;
    }
  };
  for (const id of analysis.valueOrder) {
    const row = analysis.byId.get(id),
      body = row === undefined ? null : definitionBody(row);
    if (row === undefined || body === null || row.defines === null) continue;
    if (!evaluable(row, ["definition"])) continue;
    const v = evaluate(id, body);
    if (v !== null) values.set(row.defines.name, v);
  }
  for (const row of analysis.rows) {
    if (evaluable(row, ["value", "point"]) && row.tree !== null) evaluate(row.id, row.tree);
  }
  return byRow;
}

/**
 * The value of `latex` as a row after `context.rows` (tests and the 04 corpus runner; never UI
 * values, AR-51). A row with an error or chips is UNDEFINED; a value, definition or point row is
 * its evaluateRows entry; a constant relation is compileExpression of its tree (04 decision 6);
 * every other kind is UNDEFINED.
 */
export function evaluateLatex(
  latex: string,
  context: { rows?: string[]; settings?: Partial<EvalSettings> } = {}
): Value {
  const settings: EvalSettings = {
      angleMode: context.settings?.angleMode ?? "radians",
      complex: context.settings?.complex ?? false,
    },
    rows = [
      ...(context.rows ?? []).map((l, k) => ({ id: `row-${k + 1}`, latex: l, hidden: false })),
      { id: "case", latex, hidden: false },
    ],
    analysis = analyzeRows(rows, settings),
    byRow = evaluateRows(analysis, settings, () => NO_DEADLINE),
    c = analysis.byId.get("case");
  if (c === undefined || c.error !== null || c.chips.length > 0) return UNDEFINED;
  if (c.kind === "value" || c.kind === "definition" || c.kind === "point") {
    return byRow.get("case") ?? UNDEFINED;
  }
  if (c.kind !== "constant-relation" || c.tree === null) return UNDEFINED;
  const values = new Map<string, Value>();
  for (const row of analysis.rows) {
    const v = byRow.get(row.id);
    if (row.kind === "definition" && row.defines !== null && v !== undefined) {
      values.set(row.defines.name, v);
    }
  }
  const scope: CompileScope = { functions: analysis.functions, values, settings };
  return compileExpression(c.tree, scope)({}, NO_DEADLINE);
}
