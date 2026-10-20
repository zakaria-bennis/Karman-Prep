// Regression rows in analysis (D-2, D-22, D-33, D-44; appendix F decisions): each row `L ~ M`
// fits the names of M that nothing else defines (its parameters, 0 to 8, in order of appearance)
// and defines them, with its residual list e_k (the lowest k free in row order), through synthetic
// definition rows that depend on every list the fit reads, so other rows can use them and the
// values pass fits each regression before anything that uses its names. Pure TypeScript.

import type { RowErrorCode } from "../corpus/types";
import type { Node } from "../latex/ast";
import type { DefinitionHead, ParsedRow } from "../analysis/definitions";
import type { AnalysisSettings, RowError } from "../analysis/index";
import { rowErrorMessage } from "../analysis/messages";
import { collectNameUses, isReservedName } from "../analysis/names";
import { matchLogForm } from "../../regression/log-forms";
import type { LogFormMatch } from "../../regression/fit";

export const MAX_REGRESSION_PARAMS = 8;

export interface RegressionAnalysis {
  rowId: string;
  observed: Node; // L
  model: Node; // M
  params: string[]; // the fitted names, in order of appearance in M
  predictors: string[]; // the lists M reads, in order; the first is the curve's x (D-36)
  residual: string; // e_k (D-33)
  logForm: LogFormMatch | null; // D-27
  logMode: boolean; // the row's checkbox (D-30)
}
export interface RegressionPlan {
  analysis: RegressionAnalysis | null;
  error: RowError | null;
}

const ZERO = { start: 0, end: 0 };
const error = (code: RowErrorCode, names: string[] = []): RowError => ({
  code,
  message: rowErrorMessage(code, names),
  names,
  span: null,
});
const unique = (names: readonly string[]) => [...new Set(names)];

/** The synthetic definition id of `name` fitted by regression row `rowId`. */
export const regressionDefinitionId = (rowId: string, name: string) => `${rowId}#~${name}`;
/** The regression row a synthetic definition id belongs to, or null. */
export function regressionOf(id: string): string | null {
  const at = id.indexOf("#~");
  return at < 0 ? null : id.slice(0, at);
}

/**
 * The plan of every regression row in `parsed`: `defined` holds the names expression rows and
 * table data columns define, `lists` the list names tables define. Residual names come first, in
 * row order, so a later regression's model can read an earlier one's residuals.
 */
export function planRegressions(
  parsed: readonly ParsedRow[],
  defined: ReadonlySet<string>,
  lists: ReadonlySet<string>,
  settings: AnalysisSettings
): Map<string, RegressionPlan> {
  const rows = parsed.filter((r) => r.error === null && r.tree?.kind === "sim");
  // RT-25: a table regression's stored residual name is held too.
  const taken = new Set([
    ...defined,
    ...parsed.flatMap(
      (r) => (r.source as { regression?: { residual?: string } }).regression?.residual ?? []
    ),
  ]);
  const residuals = new Map<string, string>();
  for (const row of rows) {
    const name = residualFor(row.tree as Extract<Node, { kind: "sim" }>, taken);
    taken.add(name);
    residuals.set(row.source.id, name);
  }
  const allLists = new Set([...lists, ...residuals.values()]);
  const plans = new Map<string, RegressionPlan>();
  for (const row of rows) {
    const tree = row.tree as Extract<Node, { kind: "sim" }>;
    const names = unique(collectNameUses(tree.right).map((u) => u.name));
    // The first of x and y the model reads is named (live 2026-10-20).
    const coordinate = names.find((n) => n === "x" || n === "y");
    if (coordinate !== undefined) {
      plans.set(row.source.id, {
        analysis: null,
        error: error("regression-predictor", [coordinate]),
      });
      continue;
    }
    const free = (n: string) => !isReservedName(n, settings) && !defined.has(n) && !allLists.has(n);
    const params = names.filter(free);
    if (params.length > MAX_REGRESSION_PARAMS) {
      plans.set(row.source.id, { analysis: null, error: error("regression-params") });
      continue;
    }
    const predictors = names.filter((n) => allLists.has(n));
    plans.set(row.source.id, {
      error: null,
      analysis: {
        rowId: row.source.id,
        observed: tree.left,
        model: tree.right,
        params,
        predictors,
        residual: residuals.get(row.source.id)!,
        logForm: predictors.length === 0 ? null : matchLogForm(tree.right, params, predictors[0]),
        logMode: row.source.logMode === true,
      },
    });
  }
  return plans;
}

/**
 * RT-25 (REG-CUSTOM-12): e_<subscript> of each subscripted name the row reads, left side first in
 * order of appearance (`y_7\sim mx_4+b` → e_7; with e_1 held, `y_1\sim mx_5+b` → e_5), else the
 * lowest free e_k.
 */
function residualFor(tree: Extract<Node, { kind: "sim" }>, taken: ReadonlySet<string>): string {
  const names = unique(
    [tree.left, tree.right].flatMap((t) => collectNameUses(t).map((u) => u.name))
  );
  for (const name of names) {
    const sub = /^[a-zA-Z]+_\{?([0-9a-zA-Z]+)\}?$/.exec(name)?.[1];
    if (sub !== undefined && !taken.has(`e_{${sub}}`)) return `e_{${sub}}`;
  }
  let k = 1;
  while (taken.has(`e_{${k}}`)) k++;
  return `e_{${k}}`;
}

/**
 * The synthetic definitions `name = [every name the fit reads]` of one regression: one per
 * parameter and one for its residual list. Their bodies only order the values pass; the pass
 * fills their values from the fit (evaluateRows).
 */
export function regressionSyntheticRows(r: RegressionAnalysis): ParsedRow[] {
  const own = new Set([...r.params, r.residual]);
  const reads = unique(
    [r.observed, r.model].flatMap((t) => collectNameUses(t).map((u) => u.name))
  ).filter((n) => !own.has(n) && n !== "x" && n !== "y");
  const body: Node = {
    kind: "list",
    items: reads.map((name) => ({ kind: "id", name, span: ZERO })),
    span: ZERO,
  };
  return [...r.params, r.residual].map((name) => {
    const head: DefinitionHead = { name, type: "value", params: [], body, span: ZERO };
    return {
      source: { id: regressionDefinitionId(r.rowId, name), latex: "", hidden: true },
      empty: false,
      tree: {
        kind: "rel",
        ops: ["="],
        operands: [{ kind: "id", name, span: ZERO }, body],
        span: ZERO,
      },
      error: null,
      head,
    };
  });
}

/** D-36: the regression curve y = M with its first predictor read as x, or null when it has none. */
export function regressionCurve(r: RegressionAnalysis): Node | null {
  if (r.predictors.length !== 1) return null;
  const predictor = r.predictors[0];
  const walk = (n: Node): Node => {
    if (n.kind === "id") return n.name === predictor ? { ...n, name: "x" } : n;
    const copy: Record<string, unknown> = { ...n };
    for (const [key, value] of Object.entries(n)) {
      if (key === "span") continue;
      if (Array.isArray(value)) copy[key] = value.map((v) => walk(v as Node));
      else if (value !== null && typeof value === "object" && "kind" in value)
        copy[key] = walk(value as Node);
    }
    return copy as Node;
  };
  return walk(r.model);
}
