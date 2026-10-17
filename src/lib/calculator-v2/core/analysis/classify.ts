// Row classification (RC-2): kind, uses, add-slider chips (RC-10) and the complex hint (NM-17).
// Pure TypeScript: no DOM (AR-44).

import type { RowKind } from "../corpus/types";
import type { Node } from "../latex/ast";
import { declaredHead, type ParsedRow } from "./definitions";
import type { AnalysisSettings, RowAnalysis } from "./index";
import { collectNameUses, isReservedName } from "./names";
import type { Resolution } from "./resolve";

/**
 * Classifies one parsed row. A row with an error keeps its tree and `defines` and has no chips,
 * hint or graph (04 decision 3). Until 04 Task 3 adds `shapeOf`, every error-free row that is not
 * a definition is a `value`, and no row has a relation or a graph.
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
  const scope = row.head?.body ?? row.tree,
    uses = scope === null ? [] : usedNames(scope, row.head?.params ?? [], settings);
  if (row.error !== null) return { ...analysis, kind: "error", error: row.error, uses };
  const chips = uses.filter((name) => !resolution.isDefined(name));
  const complexHint = !settings.complex && chips.length === 1 && chips[0] === "i";
  return { ...analysis, kind: kindOf(row, resolution), uses, chips, complexHint };
}

/** RC-10: the names `tree` uses that are not locals, coordinates or reserved, in first-appearance order. */
function usedNames(tree: Node, locals: readonly string[], settings: AnalysisSettings): string[] {
  const names = new Set<string>();
  for (const { name } of collectNameUses(tree))
    if (!locals.includes(name) && !isReservedName(name, settings)) names.add(name);
  return [...names];
}

/** RC-4 and RC-6: a definition's kind; every other error-free row is a `value` until Task 3. */
function kindOf(row: ParsedRow, resolution: Resolution): RowKind {
  const head = row.head;
  if (head === null) return "value";
  if (head.type === "function") return "function-definition";
  return resolution.coordinatesOf(head.body, []).size > 0 ? "dependent-definition" : "definition";
}
