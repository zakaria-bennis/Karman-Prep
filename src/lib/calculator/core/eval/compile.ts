// The closure compiler and row evaluation (NM-9, NM-12, NM-21, NM-22,
// NM-27, FN-17, G-6). Trees compile once into closures over `Value`; real-mode plotting functions
// use compile-real.ts on plain numbers. Pure TypeScript: no DOM (AR-44), and no eval or Function.

import {
  analyzeRows,
  type AnalysisResult,
  type FunctionDefinition,
  type RowAnalysis,
} from "../analysis/index";
import { DeadlineExceeded, NO_DEADLINE, type Deadline } from "../deadline";
import { evaluateTable, type DataSink } from "../data/evaluate";
import { evaluateRegression, regressionValues } from "../data/evaluate-regression";
import { regressionDefinitionId, regressionOf } from "../data/regression-analysis";
import { coordinateAxis, sourceChildren, type Node } from "../latex/ast";
import { isBuiltinName } from "../latex/operator-names";
import { applyBuiltin } from "../lib/builtins";
import { applyPointFunction, coordinate, POINT_FUNCTIONS } from "../lib/geometry";
import { isDistributionName, readsDistribution } from "../lib/distributions";
import { applyListFunction, listFunction } from "../lib/statistics";
import { circular, type CircularName } from "../lib/trig";
import { C_I } from "./complex";
import {
  compileReal,
  constantValue,
  degreeArgument,
  MAX_CALL_DEPTH,
  type GeneralCompile,
} from "./compile-real";
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
import {
  ListError,
  listErrorValue,
  makeList,
  map1,
  map2,
  mapN,
  pointValue,
  rangeValue,
} from "./lists";
import { holdsDistribution, makeDistribution, readDistribution } from "./distributions";
import { conditionAt, filterValue, lengthOf, pickValue } from "./index-list";
import { comprehensionValue } from "./comprehension";
import { piecewiseValue } from "./piecewise";
import { exponentRational } from "./real-pow";
import {
  RECURSION_BUDGET,
  cachedOrMissing,
  recursiveNames,
  trampoline,
  type Frame,
  type RecursionBudget,
  type RecursionRun,
} from "./recursion";
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
type Index = Extract<Node, { kind: "index" }>;
type Piecewise = Extract<Node, { kind: "piecewise" }>;
type Relation = Extract<Node, { kind: "rel" }>;

/** A user function, compiled once per compileExpression. */
interface CompiledFunction {
  name: string;
  params: readonly string[];
  body: Compiled;
}

interface Context {
  scope: CompileScope;
  functions: Map<string, CompiledFunction>;
  depth: number; // user-function calls in progress
  recursion: RecursionRun<Value> | null; // a recursion in progress (recursion.ts)
  budget: RecursionBudget;
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
 * `scope.functions` entry (a head with an error). : a `rel` node is n(1) when every
 * link holds between real operands, else UNDEFINED. NM-32, NM-33: operators and built-ins apply
 * element by element with scalar broadcast, truncating to the shorter list, and a user function
 * takes a list argument whole, so its body broadcasts. A list error (NM-34 to NM-36) makes the
 * whole result an undefined value carrying its code; the closure never throws it (AR-54).
 */
export function compileExpression(tree: Node, scope: CompileScope): Compiled {
  const root = compileNode(tree, {
    scope,
    functions: new Map(),
    depth: 0,
    recursion: null,
    budget: { left: RECURSION_BUDGET },
  });
  // NM-34 to NM-36: a list error anywhere below is the root's value, an undefined that names it.
  return (vars, deadline) => {
    try {
      return root(vars, deadline);
    } catch (error) {
      if (error instanceof ListError) return listErrorValue(error.code);
      throw error;
    }
  };
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
      if (index === null)
        return (vars, deadline) => map1(arg(vars, deadline), (a) => rootV(a, null, complex));
      return (vars, deadline) =>
        map2(arg(vars, deadline), index(vars, deadline), (a, k) => rootV(a, k, complex));
    }
    case "call":
      return call(node, ctx);
    case "for": {
      // NM-37: the body runs with each combination of the definitions' elements over `vars`
      const lists = node.bindings.map((b) => compileNode(b.list, ctx));
      const body = compileNode(node.body, ctx);
      const names = node.bindings.map((b) => b.name);
      return (vars, deadline) =>
        comprehensionValue(
          names,
          lists.map((list) => list(vars, deadline)),
          (bound) => body({ ...vars, ...bound }, deadline),
          deadline
        );
    }
    case "list": {
      // PR-34, NM-36: a literal (or a D-11 table column) or a range; each item evaluates on its own
      const items = node.items.map((item) => compileNode(item, ctx));
      if (node.range === undefined) {
        return (vars, deadline) => makeList(items.map((item) => item(vars, deadline)));
      }
      const [starts, ends] = [items.slice(0, node.range), items.slice(node.range)];
      return (vars, deadline) =>
        rangeValue(
          starts.map((start) => start(vars, deadline)),
          ends.map((end) => end(vars, deadline))
        );
    }
    case "index":
      return indexed(node, ctx);
    case "piecewise":
      return piecewise(node, ctx);
    case "sim": // D-2: a regression row is fitted by the values pass, never compiled
      return constant(UNDEFINED);
    case "point": {
      // An undefined or non-real coordinate is stored as NaN; G-3: list parts pair up.
      const x = compileNode(node.x, ctx),
        y = compileNode(node.y, ctx);
      return (vars, deadline) => pointValue(x(vars, deadline), y(vars, deadline));
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

/**
 * PR-34, NM-30, NM-31: `T[…]`. One condition filters T by its element-wise mask; one item picks
 * by its value; several items pick by their list (makeList's rules); a range picks by its
 * elements, an empty start side reading 1 and an empty end side the length of T.
 */
function indexed(node: Index, ctx: Context): Compiled {
  const target = compileNode(node.target, ctx);
  const [first] = node.items;
  if (node.range === undefined && node.items.length === 1 && first.kind === "rel") {
    const mask = condition(first, ctx);
    return (vars, deadline) => filterValue(target(vars, deadline), mask(vars, deadline));
  }
  const items = node.items.map((item) => compileNode(item, ctx));
  const { range } = node;
  if (range === undefined) {
    if (items.length === 1)
      return (vars, deadline) => pickValue(target(vars, deadline), items[0](vars, deadline));
    return (vars, deadline) =>
      pickValue(target(vars, deadline), makeList(items.map((item) => item(vars, deadline))));
  }
  const [starts, ends] = [items.slice(0, range), items.slice(range)];
  return (vars, deadline) => {
    const t = target(vars, deadline);
    if (t.type !== "list") return UNDEFINED;
    const from = starts.length === 0 ? [ONE] : starts.map((start) => start(vars, deadline)),
      to = ends.length === 0 ? [lengthOf(t)] : ends.map((end) => end(vars, deadline));
    return pickValue(t, rangeValue(from, to));
  };
}

/** NM-31, PR-31: a condition, 1 where it holds and undefined elsewhere, element by element. */
function condition(rel: Relation, ctx: Context): Compiled {
  const operands = rel.operands.map((operand) => compileNode(operand, ctx)),
    { ops } = rel;
  return (vars, deadline) =>
    mapN(
      operands.map((operand) => operand(vars, deadline)),
      (at) => conditionAt(at, ops)
    );
}

/**
 * PR-31, PR-32: a piecewise by piecewiseValue; a value that calls a user function is not safe, so
 * it runs only when picked.
 */
function piecewise(node: Piecewise, ctx: Context): Compiled {
  const compiled = (value: Node) => ({
    run: compileNode(value, ctx),
    safe: !callsUserFunction(value),
  });
  const branches = node.branches.map(({ cond, value }) => ({
      test: condition(cond, ctx),
      value: value === null ? null : compiled(value),
    })),
    otherwise = node.otherwise === null ? null : compiled(node.otherwise);
  return (vars, deadline) => {
    const bind = ({ run, safe }: { run: Compiled; safe: boolean }) => ({
      run: () => run(vars, deadline),
      safe,
    });
    return piecewiseValue(
      branches.map(({ test, value }) => ({
        test: () => test(vars, deadline),
        value: value === null ? null : bind(value),
      })),
      otherwise === null ? null : bind(otherwise)
    );
  };
}

/** True when `node` calls a function that is not a built-in. */
function callsUserFunction(node: Node): boolean {
  if (node.kind === "call" && !isBuiltinName(node.name)) return true;
  return sourceChildren(node).some(callsUserFunction);
}

/** NM-32: a one-operand operator, element by element on a list. */
function unary(argNode: Node, ctx: Context, op: (a: Value) => Value): Compiled {
  const arg = compileNode(argNode, ctx);
  return (vars, deadline) => map1(arg(vars, deadline), op);
}

/** NM-32, NM-33: a two-operand operator with scalar broadcast and truncation to the shorter list. */
function binary(node: Binary, ctx: Context, op: (a: Value, b: Value) => Value): Compiled {
  const a = compileNode(node.left, ctx),
    b = compileNode(node.right, ctx);
  return (vars, deadline) => map2(a(vars, deadline), b(vars, deadline), op);
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
  return (vars, deadline) =>
    map2(a(vars, deadline), b(vars, deadline), (x, y) => powV(x, y, rational, complex));
}

function call(node: Call, ctx: Context): Compiled {
  const axis = coordinateAxis(node);
  if (axis !== null) {
    // PR-45: `P.x`, element by element on a list of points (`L.x`)
    const target = compileNode(node.args[0], ctx);
    return (vars, deadline) => map1(target(vars, deadline), (v) => coordinate(v, axis));
  }
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
    return (vars, deadline) =>
      map1(angle(vars, deadline), (a) =>
        a.type === "number"
          ? numberValue(circular(name as CircularName, a.value, "degrees"))
          : applyBuiltin(name, [degV(a, angleMode)], angleMode, complex)
      );
  }
  const args = argNodes.map((arg) => compileNode(arg, ctx));
  // FN-70, FN-71: distance and midpoint broadcast over lists of points.
  if (POINT_FUNCTIONS.has(name)) {
    return (vars, deadline) =>
      mapN(
        args.map((arg) => arg(vars, deadline)),
        (values) => applyPointFunction(name, values)
      );
  }
  // FN-45: a constructor broadcasts into a list of distributions.
  if (isDistributionName(name)) {
    return (vars, deadline) =>
      mapN(
        args.map((arg) => arg(vars, deadline)),
        (values) => makeDistribution(name, values)
      );
  }
  // FN-47 to FN-51: a distribution first is read element by element; pdf and cdf read nothing
  // else, and the statistics of anything else are the list functions'.
  const reader = readsDistribution(name);
  // FN-2, FN-23 to FN-29, FN-75: list functions reduce lists (statistics.ts).
  if (reader || listFunction(name) !== undefined) {
    return (vars, deadline) => {
      const values = args.map((arg) => arg(vars, deadline));
      if (reader && values.length > 0 && holdsDistribution(values[0])) {
        return mapN(values, (scalars) => readDistribution(name, scalars));
      }
      return listFunction(name) === undefined ? UNDEFINED : applyListFunction(name, values);
    };
  }
  // NM-32: every other built-in applies element by element.
  return (vars, deadline) =>
    mapN(
      args.map((arg) => arg(vars, deadline)),
      (values) => applyBuiltin(name, values, angleMode, complex)
    );
}

/**
 * Calls a user function: its parameters are bound over the caller's `vars`, the deadline is
 * checked, and a call past MAX_CALL_DEPTH nested calls is UNDEFINED.
 */
function userCall(fn: CompiledFunction, args: readonly Compiled[], ctx: Context): Compiled {
  if (recursiveNames(ctx.scope.functions).has(fn.name)) return recursiveCall(fn, args, ctx);
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
 * A call of a recursive function (recursion.ts): inside a recursion its cached result, else a new
 * recursion from this call, each frame run with the entry's variables and its own parameters.
 */
function recursiveCall(fn: CompiledFunction, args: readonly Compiled[], ctx: Context): Compiled {
  return (vars, deadline) => {
    const frame = { fn: fn.name, args: args.map((arg) => arg(vars, deadline)) };
    const cached = cachedOrMissing(ctx.recursion, frame);
    if (cached !== null) return cached;
    const invoke = (f: Frame<Value>): Value => {
      deadline.check();
      const called = userFunction(f.fn, ctx);
      if (called === null) return UNDEFINED;
      const inner: Record<string, Value> = { ...vars };
      called.params.forEach((param, k) => (inner[param] = f.args[k]));
      const depth = ctx.depth;
      ctx.depth = 0;
      try {
        return called.body(inner, deadline);
      } finally {
        ctx.depth = depth;
      }
    };
    ctx.recursion = { cache: new Map() };
    try {
      return trampoline(frame, invoke, UNDEFINED, ctx.recursion, ctx.budget);
    } finally {
      ctx.recursion = null;
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
  const fn: CompiledFunction = { name, params: definition.params, body: constant(UNDEFINED) };
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
    const g = compileReal(tree, scope, generalWith(scope));
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
  if (!scope.settings.complex) return compileReal(tree, scope, generalWith(scope));
  const f = compileExpression(tree, scope);
  return (x, y) => toPlotNumber(f({ x: numberValue(x), y: numberValue(y) }, NO_DEADLINE));
}

/** compileReal's GeneralCompile: compileExpression in the same scope. */
function generalWith(scope: CompileScope): GeneralCompile {
  return (tree) => compileExpression(tree, scope);
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
 * Entries only for error-free, chip-free rows of kind `value`, `definition` and
 * `point`; definitions first in `valueOrder` (filling the name-to-value map later rows read),
 * then value and point rows in list order. `deadlineFor(id)` is called once per evaluated row,
 * checked before the row and passed to its closure, which checks it at every user-function call.
 * A row whose check throws DeadlineExceeded is omitted, and its dependants evaluate to UNDEFINED.
 */
export function evaluateRows(
  analysis: AnalysisResult,
  settings: EvalSettings,
  deadlineFor: (rowId: string) => Deadline,
  sink?: DataSink
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
  const fitted = new Set<string>();
  for (const id of analysis.valueOrder) {
    // D-22, D-46: a regression fits once, at its first synthetic definition in dependency order.
    const regression = regressionOf(id);
    if (regression !== null) {
      const r = analysis.byId.get(regression)?.regression;
      if (r === undefined || fitted.has(regression)) continue;
      fitted.add(regression);
      const deadline = deadlineFor(regression);
      deadline.check();
      const outcome = evaluateRegression(r, scope, deadline);
      for (const [name, v] of regressionValues(outcome)) {
        values.set(name, v);
        byRow.set(regressionDefinitionId(regression, name), v); // buildCompileScope reads these
      }
      sink?.regression(regression, outcome);
      continue;
    }
    const row = analysis.byId.get(id),
      body = row === undefined ? null : definitionBody(row);
    if (row === undefined || body === null || row.defines === null) continue;
    if (!evaluable(row, ["definition"])) continue;
    const v = evaluate(id, body);
    // A list error stays on its own row (R-2); rows that use the name read it as undefined.
    if (v !== null) values.set(row.defines.name, v.type === "undefined" ? UNDEFINED : v);
  }
  const ordered = new Set(analysis.valueOrder);
  for (const row of analysis.rows) {
    if (evaluable(row, ["value", "point"]) && row.tree !== null) evaluate(row.id, row.tree);
    // A name defined twice: each defining row still shows its own value, as in Desmos, but binds
    // no name (the rows that use it are marked).
    const body = definitionBody(row);
    if (!ordered.has(row.id) && evaluable(row, ["definition"]) && body !== null) {
      evaluate(row.id, body);
    }
  }
  if (sink !== undefined) {
    // D-11: tables after every value they can use; a row's deadline covers its whole table.
    for (const row of analysis.rows) {
      if (row.kind !== "table" || row.table === undefined) continue;
      const deadline = deadlineFor(row.id);
      deadline.check();
      sink.table(row.id, evaluateTable(row, scope, deadline));
    }
  }
  return byRow;
}

/**
 * The value of `latex` as a row after `context.rows` (tests and the 04 corpus runner; never UI
 * values, AR-51). A row with an error or chips is UNDEFINED; a value, definition or point row is
 * its evaluateRows entry; a constant relation is compileExpression of its tree;
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
