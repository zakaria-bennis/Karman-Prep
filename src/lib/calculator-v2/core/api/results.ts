// The engine's views (07 Decisions 4, 5 and 14): the RowView and EngineSnapshot types, which
// engine.ts re-exports (01-interfaces-runtime.md section 8), each row's view built from the
// main-thread analysis (AR-51) and its latest accepted worker result, and API-9's
// expressionAnalysis. Package-internal apart from the two re-exported types.

import type { Geometry } from "../../plot/geometry";
import type { PoiPoint } from "../../poi/types";
import type { Viewport, ViewSpec } from "../../plot/viewport";
import { rowErrorMessage, type AnalysisResult, type RowAnalysis, type RowError } from "../analysis";
import type { RowKind } from "../corpus/types";
import { formatValue } from "../eval/format";
import type { Value } from "../eval/values";
import type { TableResult } from "../data/evaluate";
import type { TableAnalysis } from "../data/table-analysis";
import type { StoredColumn, StoredRow } from "./document";
import type { RowResult } from "./inbox";
import { regressionValues, type RegressionOutcome } from "../data/evaluate-regression";
import { regressionDefinitionId, type RegressionAnalysis } from "../data/regression-analysis";
import type { ApiEvaluation, CalculatorSettings, ExpressionAnalysis } from "./types";

export interface RowView {
  id: string;
  latex: string;
  hidden: boolean;
  color: string; // stored slot id or hex; the UI resolves it with resolveRowColor(color, skin)
  kind: RowKind;
  error: RowError | null;
  chips: string[];
  complexHint: boolean;
  value: Value | null; // null until the worker reports
  valueText: string | null; // formatValue, only when the row shows a value (R-5)
  overrun: boolean; // AR-48/AR-49 message showing
  type: "expression" | "table"; // D-1
  columns: readonly StoredColumn[] | null; // a table's stored columns
  table: TableView | null; // D-10, D-11: a table's analysis and latest results
  regression: RegressionView | null; // D-22: a regression row's analysis and latest fit
}
export interface RegressionView {
  analysis: RegressionAnalysis;
  result: RegressionOutcome | null; // null until the worker reports
}
export interface TableView {
  analysis: TableAnalysis;
  result: TableResult | null; // null until the worker reports
}
export interface EngineSnapshot {
  revision: number;
  rows: readonly RowView[];
  settings: CalculatorSettings;
  viewport: Viewport;
  view: ViewSpec | null; // null until the graph reports its size
  geometry: ReadonlyMap<string, Geometry>; // each row's latest accepted plot; dropped at once when the row is deleted, edited, hidden or no longer graphable; region geometry dropped on every view send; at done only rows plotted in that generation are kept
  focusedRowId: string | null; // DOM-focused row (KB-4)
  activeRowId: string | null; // API-12 active row (L-3 styling, keypad target)
  selectedRowId: string | null; // POI-17: the row whose curve is selected (heavier, with POI dots)
  poi: { rowId: string; points: readonly PoiPoint[] } | null; // POI-1: the selected row's points
  canUndo: boolean;
  canRedo: boolean;
  backendKind: "worker" | "main-thread";
}

/** AR-48: the error an overrun row shows instead of its analysis error. */
function timeoutError(): RowError {
  return { code: "timeout", message: rowErrorMessage("timeout", []), names: [], span: null };
}

/** Freezes `value` and every object or array inside it. */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

/**
 * API-9: a value as its public evaluation. A non-finite number or complex part is undefined (NM-6);
 * a point keeps NaN for an undefined coordinate (04 decision 7); a list of numbers is a list, with
 * NaN for an undefined item. Any other value, such as a later phase's distribution, inference test,
 * matrix, colour or tone, is `{ type: "other", display }` with the row's R-5 text (OI-24).
 */
export function toApiEvaluation(value: Value, display: string | null): ApiEvaluation {
  const other: ApiEvaluation = { type: "other", display: display ?? "" };
  switch (value.type) {
    case "number":
      return Number.isFinite(value.value)
        ? { type: "number", value: value.value }
        : { type: "undefined" };
    case "complex": {
      const { re, im } = value.value;
      if (!Number.isFinite(re) || !Number.isFinite(im)) return { type: "undefined" };
      return { type: "complex", value: { re, im } };
    }
    case "point":
      return { type: "point", value: [value.value[0], value.value[1]] };
    case "list": {
      const items = value.value.map((item) =>
        item.type === "number" ? item.value : item.type === "undefined" ? Number.NaN : null
      );
      return items.includes(null) ? other : { type: "list", value: items as number[] };
    }
    case "undefined":
      return { type: "undefined" };
    default:
      return other;
  }
}

/**
 * Decision 5, R-5: a row shows its value when its kind is `value` or `definition`, with no error,
 * no chips and no overrun, once a value has arrived.
 */
export function rowShowsValue(row: RowAnalysis, value: Value | null, overrun: boolean): boolean {
  return (
    (row.kind === "value" || row.kind === "definition") &&
    row.error === null &&
    row.chips.length === 0 &&
    !overrun &&
    value !== null
  );
}

/**
 * A row's view: kind, error, chips and complex hint from the main-thread analysis (AR-51), and the
 * value from its latest accepted result. An overrun row shows the AR-48 timeout error.
 */
export function buildRowView(row: StoredRow, analysis: RowAnalysis, result: RowResult): RowView {
  const { value, overrun } = result;
  return {
    id: row.id,
    latex: row.latex,
    hidden: row.hidden,
    color: row.color,
    kind: analysis.kind,
    error: overrun ? timeoutError() : (analysis.error ?? fitError(result.regression)),
    chips: [...analysis.chips],
    complexHint: analysis.complexHint,
    value,
    valueText:
      value !== null && rowShowsValue(analysis, value, overrun) ? formatValue(value) : null,
    overrun,
    type: row.type === "table" ? "table" : "expression",
    columns: row.type === "table" ? (row.columns ?? []) : null,
    table:
      analysis.table === undefined
        ? null
        : { analysis: analysis.table, result: result.table ?? null },
    regression:
      analysis.regression === undefined
        ? null
        : { analysis: analysis.regression, result: result.regression ?? null },
  };
}

/**
 * Every row's latest accepted value by row id, and each regression's fitted names by their
 * synthetic definition ids (D-22), as buildCompileScope reads them.
 */
export function latestValues(
  rows: readonly StoredRow[],
  result: (id: string) => RowResult
): Map<string, Value> {
  const values = new Map<string, Value>();
  for (const { id } of rows) {
    const { value, regression } = result(id);
    if (value !== null) values.set(id, value);
    if (regression === undefined) continue;
    for (const [name, v] of regressionValues(regression))
      values.set(regressionDefinitionId(id, name), v);
  }
  return values;
}

/** D-22, D-24: a failed fit is the row's error, shown in place of its results. */
function fitError(fit: RegressionOutcome | undefined): RowView["error"] {
  if (fit === undefined || fit.ok || fit.error === null) return null;
  const code =
    fit.error === rowErrorMessage("regression-data", []) ? "regression-data" : "regression-fit";
  return { code, message: fit.error, names: [], span: null };
}

/**
 * API-9: each row id mapped to its analysis, deep-frozen. `isGraphable` comes from the main-thread
 * analysis; `isError` and `errorMessage` from the view's error, which is the timeout error for an
 * overrun row; `evaluation` only when the row shows its value.
 */
export function buildExpressionAnalysis(
  views: readonly RowView[],
  analysis: AnalysisResult
): Record<string, ExpressionAnalysis> {
  const entries = views.map((view): [string, ExpressionAnalysis] => {
    const row = analysis.byId.get(view.id)!;
    const shown = view.value !== null && rowShowsValue(row, view.value, view.overrun);
    return [
      view.id,
      {
        isGraphable: row.isGraphable,
        isError: view.error !== null,
        ...(view.error !== null && { errorMessage: view.error.message }),
        evaluationDisplayed: shown,
        ...(shown && { evaluation: toApiEvaluation(view.value!, view.valueText) }),
      },
    ];
  });
  return deepFreeze(Object.fromEntries(entries));
}

const snapshotAnalyses = new WeakMap<
  EngineSnapshot,
  Readonly<Record<string, ExpressionAnalysis>>
>();

/**
 * API-9 for one snapshot: built with buildExpressionAnalysis on first use and then reused, so the
 * engine hands out the same object until its snapshot changes. `analysis` must be the analysis the
 * snapshot's rows were built from.
 */
export function snapshotAnalysis(
  snapshot: EngineSnapshot,
  analysis: AnalysisResult
): Readonly<Record<string, ExpressionAnalysis>> {
  let record = snapshotAnalyses.get(snapshot);
  if (record === undefined) {
    record = buildExpressionAnalysis(snapshot.rows, analysis);
    snapshotAnalyses.set(snapshot, record);
  }
  return record;
}
