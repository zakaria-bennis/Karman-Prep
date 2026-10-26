// Row classification (RC-2): kind, uses, add-slider chips (RC-10), the complex hint (NM-17), the
// relation, the graph descriptor (RC-5, RC-11 to RC-15, RC-17) and the errors between rows
// (RC-7, RC-8, RC-20). Pure TypeScript: no DOM (AR-44).

import type { RowErrorCode } from "../corpus/types";
import { primedName, sourceChildren, type Node, type SourceSpan } from "../latex/ast";
import { isBuiltinName } from "../latex/operator-names";
import { arityText, BUILTIN_ARITY } from "../lib/arity";
import { POINT_FUNCTIONS } from "../lib/geometry";
import { listFunction } from "../lib/statistics";
import { declaredHead, rowFunctionName, type DefinitionHead, type ParsedRow } from "./definitions";
import { functionGraph, isPointShaped, POLAR_NAMES, shapeOf, type RowShape } from "./graph";
import type { AnalysisSettings, RowAnalysis, RowError, RowGraph } from "./index";
import type { ListTyping } from "./lists";
import { displayName, rowErrorMessage } from "./messages";
import { collectNameUses, isReservedName } from "./names";
import type { Resolution } from "./resolve";

type Call = Extract<Node, { kind: "call" }>;

/** The complex-number built-ins, which Desmos offers only in complex mode. */
const COMPLEX_ONLY: ReadonlySet<string> = new Set(["real", "imag", "conj", "arg"]);

/**
 * Classifies one parsed row: a definition by its head (RC-4, RC-5, RC-6), every other row by
 * `shapeOf`, with 's error order. A row with an error keeps its tree, `defines` and
 * `uses` and has no chips, hint, relation or graph. The graph survives only on a
 * graphable row: no error, no chips and not hidden.
 */
export function classifyRow(
  row: ParsedRow,
  resolution: Resolution,
  settings: AnalysisSettings,
  typing: ListTyping
): RowAnalysis {
  const analysis: RowAnalysis = {
    id: row.source.id,
    kind: "empty",
    tree: row.tree,
    error: null,
    defines: declaredHead(row),
    uses: [],
    chips: [],
    isGraphable: false,
    relation: null,
    graph: null,
  };
  if (row.empty) return analysis;
  const locals = row.head?.params ?? [],
    scope = row.head?.body ?? row.tree,
    uses = scope === null ? [] : usedNames(scope, locals, settings);
  // A non-empty row without a parse or head error always has a tree (parseRows).
  if (row.error !== null || row.tree === null || scope === null) {
    return { ...analysis, kind: "error", error: row.error, uses };
  }
  // PR-30, D-2: a regression row; regression-analysis.ts adds its parameters and errors.
  if (row.tree.kind === "sim") return { ...analysis, kind: "regression", uses };
  // Desmos: "The 'real' function is only available in complex mode." (captured 2026-10-20)
  // (with one argument: `\operatorname{real}()` is the arity error first)
  const complexOnly = settings.complex
    ? undefined
    : callsOf(scope).find((c) => COMPLEX_ONLY.has(c.name) && c.args.length === 1);
  if (complexOnly !== undefined) {
    const error = rowError("complex-only", [complexOnly.name], complexOnly.span);
    return { ...analysis, kind: "error", error, uses };
  }
  const conflict = conflictError(row, scope, locals, resolution);
  if (conflict !== null) return { ...analysis, kind: "error", error: conflict, uses };
  const shape =
    row.head === null
      ? shapeOf(
          row.tree,
          (node) => resolution.coordinatesOf(node, []),
          unboundT(row.tree, resolution, typing),
          pointValued(row.tree, typing)
        )
      : headShape(row.head, row.tree.span, resolution, typing, row.source.id);
  const chips = uses.filter((name) => !resolution.isDefined(name));
  // a bare expression's undefined names speak before its coordinates (Desmos: `\theta+a` asks
  // for 'a'); RC-17: one undefined name and no coordinate asks for "y=" (Desmos, 2026-10-20)
  const bare = row.head === null && row.tree.kind !== "rel" && !pointValued(row.tree, typing);
  if (shape.error !== null && !(bare && chips.length > 0)) {
    const { code, names } = shape.error,
      span = code === "unsupported" ? firstUseShown(scope, names[0], locals, resolution) : null;
    return { ...analysis, kind: "error", error: rowError(code, names, span), uses };
  }
  // a curve whose value is a point or points (`y=(1,2)x`) is neither graphed nor marked (Desmos,
  // 2026-10-20)
  const pointCurve = shape.graph?.kind === "explicit" && pointValued(shape.graph.expr, typing);
  const baseCase = row.head !== null && resolution.baseCaseRecursion.has(row.head.name);
  const isGraphable =
    shape.graph !== null && !pointCurve && !baseCase && chips.length === 0 && !row.source.hidden;
  const coordinates = resolution.coordinatesOf(row.tree, []).size > 0;
  return {
    ...analysis,
    ...(bare && chips.length === 1 && !coordinates && { asksForEquation: true }),
    kind:
      shape.error !== null
        ? "value"
        : shape.kind === "constant-relation" && chips.length > 0
          ? "unsolved-relation"
          : shape.kind,
    uses,
    chips,
    isGraphable,
    relation: shape.relation,
    graph: isGraphable ? shape.graph : null,
  };
}

/**
 * 's errors after the head errors and before the shape errors, in order: a function's name
 * used without a call; a row in a cycle
 * (RC-8); the first call, in source order, with a count its function does not take (RC-20); the
 * first use of a name defined twice, in a cycle, or defined through one of those (RC-7, RC-8),
 * with that name's error. As in Desmos, the rows that define a name twice are not marked: only
 * the rows that use it (captured 2026-10-20). `scope` is the row's body, or its tree when it
 * defines nothing; `locals` are its parameters.
 */
function conflictError(
  row: ParsedRow,
  scope: Node,
  locals: readonly string[],
  resolution: Resolution
): RowError | null {
  // Desmos: a function's name used as a value, `f`, `f+1`, `f 3`, `f^{2}(3)` or `f(x)=f`, is
  // "'f' is a function. Try using parentheses." (captured 2026-10-20), before any cycle
  const bare = collectNameUses(scope).find(
    ({ name, call }) => !call && !locals.includes(name) && resolution.isFunction(name)
  );
  if (bare !== undefined) {
    return rowError("function-parentheses", [displayName(bare.name)], bare.span);
  }
  const cycle = resolution.cycles.get(row.source.id);
  if (cycle !== undefined) return rowError(cycle.code, cycle.names, null);
  const arity = arityError(scope, resolution);
  if (arity !== null) return arity;
  const use = collectNameUses(scope).find(
    ({ name }) => !locals.includes(name) && resolution.blocked.has(name)
  );
  if (use === undefined) return null;
  const blocked = resolution.blocked.get(use.name)!;
  return rowError(blocked.code, blocked.names, use.span);
}

/**
 * RC-20: the first call in `tree`, in source order, with a count its function does not take, as
 * Desmos words it; a table cell or header shows the same error (Desmos, 2026-10-20).
 */
export function arityError(
  tree: Node,
  resolution: Pick<Resolution, "functionArity">
): RowError | null {
  for (const call of callsOf(tree)) {
    if (call.member !== undefined) continue; // FN-47 to FN-51: distributions.ts counts these
    if (POINT_FUNCTIONS.has(call.name)) continue; // FN-70, FN-71: points.ts gives Desmos's texts
    const written = call.args.length - (call.base ? 1 : 0);
    // FN-63: a derivative takes one argument, Desmos's "Prime notation can only be used for
    // functions of a single argument." for `g'(1,2)` with g(x,y) and `f'(1,2)` with f(x) alike
    // (live 2026-10-25); `f'(2)` with f(x,y) is f's own arity error (captured 2026-10-20).
    const primed = primedName(call.name);
    if (primed !== null && written !== 1 && resolution.functionArity(primed.base) !== null) {
      return rowError("prime-arity", [], call.span);
    }
    const name = primed?.base ?? call.name;
    const arity = expectedArity(name, resolution);
    const list = listFunction(call.name);
    if (list?.minArguments !== undefined && written < list.minArguments) {
      // FN-35: Desmos's "Function 'join' requires 2 arguments.", for none or one
      const names = [displayName(call.name), String(list.minArguments), String(written)];
      return rowError("arity", names, call.span);
    }
    if ((list?.kind === "reducer" || list?.kind === "length") && written === 0) {
      // FN-23: Desmos's "Function 'mean' requires at least one argument.", and min, max and
      // length's "Function 'min' requires an argument."
      const shown = displayName(call.name);
      if (list?.oneArgument) return rowError("arity", [shown, "1", "0"], call.span);
      return rowError("reducer-arguments", [shown], call.span);
    }
    if (arity !== null && !arity.includes(written)) {
      const names = [displayName(name), arityText(arity), String(written)];
      return rowError("arity", names, call.span);
    }
  }
  return null;
}

/**
 * RC-20: the written argument counts a call accepts: a built-in's from `BUILTIN_ARITY` (none for a
 * variadic one), except `log`, whose base is written only as a subscript (PR-27), so it takes one;
 * a user function's parameter count from its error-free head. A call to a function whose head has
 * an error, is duplicated or is in a cycle is not checked.
 */
function expectedArity(
  name: string,
  resolution: Pick<Resolution, "functionArity">
): readonly number[] | null {
  if (name === "log") return [1];
  if (isBuiltinName(name)) return BUILTIN_ARITY.get(name) ?? null;
  const count = resolution.functionArity(name);
  return count === null ? null : [count];
}

/** The calls in `tree` in source order; an outer call starts before the calls in its arguments. */
function callsOf(tree: Node): Call[] {
  const calls: Call[] = [],
    pending: Node[] = [tree];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (node.kind === "call") calls.push(node);
    pending.push(...sourceChildren(node));
  }
  return calls.sort((a, b) => a.span.start - b.span.start);
}

function rowError(code: RowErrorCode, names: string[], span: SourceSpan | null): RowError {
  return { code, message: rowErrorMessage(code, names), names, span };
}

/** RC-10: the names `tree` uses that are not locals, coordinates or reserved, in first-appearance order. */
function usedNames(tree: Node, locals: readonly string[], settings: AnalysisSettings): string[] {
  const names = new Set<string>();
  for (const { name } of collectNameUses(tree))
    if (!locals.includes(name) && !isReservedName(name, settings)) names.add(name);
  return [...names];
}

/**
 * RC-15, G-3, NM-32: a tree that plots as a point or points: one as written (isPointShaped), or
 * one whose shape is a point or a list of points, by list typing (`(1,2)+(3,4)`, `P` defined as
 * a point, `\operatorname{midpoint}((0,0),(2,4))`), as Desmos graphs them (captured 2026-10-19).
 */
function pointValued(tree: Node, typing: ListTyping): boolean {
  if (isPointShaped(tree)) return true;
  const shape = typing.shape(tree, []);
  return shape === "point" || shape === "points";
}

/**
 * Desmos draws a constant `r=c` as the polar curve r = c, the circle x²+y² = c² (live 2026-10-25),
 * while other rows read r as the defined number.
 */
function polarCircle(body: Node, span: SourceSpan): RowGraph {
  const two: Node = { kind: "num", value: 2, span },
    sq = (left: Node): Node => ({ kind: "pow", left, right: two, span }),
    id = (name: string): Node => ({ kind: "id", name, span });
  const sum: Node = { kind: "add", left: sq(id("x")), right: sq(id("y")), span };
  return { kind: "implicit", expr: { kind: "sub", left: sum, right: sq(body), span } };
}

/**
 * A definition row's shape: a value head is a definition, or a dependent definition when its body
 * reaches a coordinate (RC-6), and a definition whose body plots as points graphs them, as Desmos
 * draws `A=(1,2)` and `P=[(1,2),(3,4)]` (M5, captured 2026-10-19); a function head is a function definition with RC-5's graph, and,
 * not being an RC-6 definition, `unsupported` when its body reaches r or θ (RC-2).
 */
function headShape(
  head: DefinitionHead,
  span: SourceSpan,
  resolution: Resolution,
  typing: ListTyping,
  id: string
): RowShape {
  const coordinates = resolution.coordinatesOf(head.body, head.params),
    shape: RowShape = { kind: "definition", graph: null, error: null, relation: null };
  if (head.type === "value") {
    if (coordinates.size > 0) return { ...shape, kind: "dependent-definition" };
    if (head.name === "r" && typing.shape(head.body, []) === "number") {
      return { ...shape, graph: polarCircle(head.body, span) };
    }
    return pointValued(head.body, typing) ? { ...shape, graph: { kind: "point" } } : shape;
  }
  const polar = [...coordinates].find((name) => POLAR_NAMES.includes(name));
  if (polar !== undefined) {
    return { ...shape, kind: "error", error: { code: "unsupported", names: [displayName(polar)] } };
  }
  return {
    ...shape,
    kind: "function-definition",
    // a function defined twice or under a reserved name graphs its own body (Desmos, 2026-10-20)
    graph: functionGraph(
      head.anonymous === true || resolution.duplicates.has(head.name)
        ? rowFunctionName(id)
        : head.name,
      head.params,
      span
    ),
  };
}

/** RC-2, RC-3: a `t` inside a point-shaped row (a restricted one too) while no row defines `t`. */
function unboundT(tree: Node, resolution: Resolution, typing: ListTyping): boolean {
  return (
    pointValued(tree, typing) &&
    !resolution.isDefined("t") &&
    collectNameUses(tree).some((use) => use.name === "t" && use.inPoint)
  );
}

/**
 * The span of the first use, locals aside, that is the name shown as `shown` or
 * reaches it through definitions (`A` in `y=A` after `A=\pi r^{2}`).
 */
function firstUseShown(
  tree: Node,
  shown: string,
  locals: readonly string[],
  resolution: Resolution
): SourceSpan | null {
  for (const use of collectNameUses(tree)) {
    if (locals.includes(use.name)) continue;
    const id: Node = { kind: "id", name: use.name, span: use.span },
      reached = [use.name, ...resolution.coordinatesOf(id, [])];
    if (reached.some((name) => displayName(name) === shown)) return use.span;
  }
  return null;
}
