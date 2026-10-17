// Row classification (RC-2): kind, uses, add-slider chips (RC-10), the complex hint (NM-17), the
// relation and the graph descriptor (RC-5, RC-11 to RC-15, RC-17). Pure TypeScript: no DOM (AR-44).

import type { Node, SourceSpan } from "../latex/ast";
import { declaredHead, type DefinitionHead, type ParsedRow } from "./definitions";
import { functionGraph, POLAR_NAMES, shapeOf, type RowShape } from "./graph";
import type { AnalysisSettings, RowAnalysis } from "./index";
import { displayName, rowErrorMessage } from "./messages";
import { collectNameUses, isReservedName } from "./names";
import type { Resolution } from "./resolve";

/**
 * Classifies one parsed row: a definition by its head (RC-4, RC-5, RC-6), every other row by
 * `shapeOf`. A row with an error keeps its tree, `defines` and `uses` and has no chips, hint,
 * relation or graph (04 decision 3). The graph survives only on a graphable row: no error, no
 * chips and not hidden.
 */
export function classifyRow(
  row: ParsedRow,
  resolution: Resolution,
  settings: AnalysisSettings
): RowAnalysis {
  const analysis: RowAnalysis = {
    id: row.source.id,
    kind: "empty",
    tree: row.tree,
    error: null,
    defines: declaredHead(row),
    uses: [],
    chips: [],
    complexHint: false,
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
  const shape =
    row.head === null
      ? shapeOf(
          row.tree,
          (node) => resolution.coordinatesOf(node, []),
          unboundT(row.tree, resolution)
        )
      : headShape(row.head, row.tree.span, resolution);
  if (shape.error !== null) {
    const { code, names } = shape.error,
      span = code === "unsupported" ? firstUseShown(scope, names[0], locals, resolution) : null;
    const error = { code, message: rowErrorMessage(code, names), names, span };
    return { ...analysis, kind: "error", error, uses };
  }
  const chips = uses.filter((name) => !resolution.isDefined(name)),
    isGraphable = shape.graph !== null && chips.length === 0 && !row.source.hidden;
  return {
    ...analysis,
    kind: shape.kind === "constant-relation" && chips.length > 0 ? "unsolved-relation" : shape.kind,
    uses,
    chips,
    complexHint: !settings.complex && chips.length === 1 && chips[0] === "i",
    isGraphable,
    relation: shape.relation,
    graph: isGraphable ? shape.graph : null,
  };
}

/** RC-10: the names `tree` uses that are not locals, coordinates or reserved, in first-appearance order. */
function usedNames(tree: Node, locals: readonly string[], settings: AnalysisSettings): string[] {
  const names = new Set<string>();
  for (const { name } of collectNameUses(tree))
    if (!locals.includes(name) && !isReservedName(name, settings)) names.add(name);
  return [...names];
}

/**
 * A definition row's shape: a value head is a definition, or a dependent definition when its body
 * reaches a coordinate (RC-6); a function head is a function definition with RC-5's graph, and,
 * not being an RC-6 definition, `unsupported` when its body reaches r or θ (RC-2).
 */
function headShape(head: DefinitionHead, span: SourceSpan, resolution: Resolution): RowShape {
  const coordinates = resolution.coordinatesOf(head.body, head.params),
    shape: RowShape = { kind: "definition", graph: null, error: null, relation: null };
  if (head.type === "value") {
    return coordinates.size > 0 ? { ...shape, kind: "dependent-definition" } : shape;
  }
  const polar = [...coordinates].find((name) => POLAR_NAMES.includes(name));
  if (polar !== undefined) {
    return { ...shape, kind: "error", error: { code: "unsupported", names: [displayName(polar)] } };
  }
  return {
    ...shape,
    kind: "function-definition",
    graph: functionGraph(head.name, head.params, span),
  };
}

/** RC-2, RC-3: a `t` inside a point while no row defines `t`. */
function unboundT(tree: Node, resolution: Resolution): boolean {
  return (
    tree.kind === "point" &&
    !resolution.isDefined("t") &&
    collectNameUses(tree).some((use) => use.name === "t" && use.inPoint)
  );
}

/**
 * 04 decision 3: the span of the first use, locals aside, that is the name shown as `shown` or
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
