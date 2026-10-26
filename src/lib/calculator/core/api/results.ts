// The engine's views: the RowView and EngineSnapshot types, which
// engine.ts re-exports, each row's view built from the
// main-thread analysis (AR-51) and its latest accepted worker result, and API-9's
// expressionAnalysis. Package-internal apart from the two re-exported types.

import type { Geometry } from "../../plot/geometry";
import type { PoiPoint } from "../../poi/types";
import type { Viewport, ViewSpec } from "../../plot/viewport";
import {
  displayName,
  rowErrorMessage,
  type AnalysisResult,
  type RowAnalysis,
  type RowError,
} from "../analysis";
import type { RowKind } from "../corpus/types";
import type { Node } from "../latex/ast";
import { formatValue } from "../eval/format";
import { displayFraction, type DisplayFraction } from "../eval/fraction";
import { lineConstantSide } from "../eval/line-value";
import type { Value } from "../eval/values";
import { holdsInference } from "../eval/inference";
import type { TableResult } from "../data/evaluate";
import type { TableAnalysis } from "../data/table-analysis";
import type { StoredColumn, StoredRow } from "./document";
import type { InferenceSettings } from "./inference-state";
import type { RowResult } from "./inbox";
import { regressionValues, type RegressionOutcome } from "../data/evaluate-regression";
import { regressionDefinitionId, type RegressionAnalysis } from "../data/regression-analysis";
import type { SliderView } from "../../sliders/slider";
import type { ApiEvaluation, CalculatorSettings, ExpressionAnalysis } from "./types";

export interface RowView {
  id: string;
  latex: string;
  hidden: boolean;
  color: string; // stored slot id or hex; the UI resolves it with resolveRowColor(color, skin)
  kind: RowKind;
  error: ViewError | null;
  chips: string[]; // RC-10 names, or a slider's undefined limit names (SLIDERS-10)
  value: Value | null; // null until the worker reports
  valueText: string | null; // formatValue, only when the row shows a value (R-5)
  fraction: DisplayFraction | null; // NM-7: the value's fraction form, when the row offers the toggle
  asFraction: boolean; // R-5: the row's value shows as `fraction` (the toggle is on and applies)
  overrun: boolean; // AR-48/AR-49 message showing
  type: "expression" | "table"; // D-1
  columns: readonly StoredColumn[] | null; // a table's stored columns
  table: TableView | null; // D-10, D-11: a table's analysis and latest results
  regression: RegressionView | null; // D-22: a regression row's analysis and latest fit
  slider?: SliderView | null; // SLIDERS-1: a slider row's limits, range and shown value
  inference?: InferenceSettings; // FN-59: an inference row's settings; absent for the defaults
}
/** A row's error: an analysis error, or a slider's limit error (SLIDERS-18). */
export type ViewError = Omit<RowError, "code"> & { code: RowError["code"] | "slider-limits" };
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
 * a point keeps NaN for an undefined coordinate; a list of numbers is a list, with
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
 * Decision 5, R-5, RC-6, RC-15: a row shows its value (a number, point or list) when its kind is
 * `value`, `definition` or `point`, with no error, no chips and no overrun, once a value without a
 * list error has arrived. As in Desmos, a literal shows none: a point or list of points written
 * with numerals (`(2,3)`, `A=(1,2)`, `[(1,2),(3,4)]`), a numeral (`2`, `-1.5`, `2\frac{1}{2}`) and
 * a list of numerals (`[1,-2]`, `[]`, `L=[]`), while every other result does (`2(1,2)`, `P`,
 * `(1)`, `--1`, `[1,1+1]`; captures 2026-10-19 and 2026-10-20).
 */
export function rowShowsValue(row: RowAnalysis, value: Value | null, overrun: boolean): boolean {
  return rowHasValue(row, value, overrun) && !literalRow(row.tree, false);
}

/**
 * True when a row has a value to report, shown or not: Desmos's `expressionAnalysis` gives a
 * literal's and a slider's evaluation without showing it (`1`, `a=1`; captured 2026-10-20).
 */
export function rowHasValue(row: RowAnalysis, value: Value | null, overrun: boolean): boolean {
  const line =
    (row.kind === "horizontal-lines" || row.kind === "vertical-lines") &&
    lineConstantSide(row.tree) !== null;
  return (
    (line || row.kind === "value" || row.kind === "definition" || row.kind === "point") &&
    row.error === null &&
    row.chips.length === 0 &&
    !overrun &&
    value !== null &&
    valueError(value) === null &&
    !holdsInference(value) // FN-59: a test shows its footer, and Desmos reports no evaluation
  );
}

/**
 * RC-10, EL-34: a row whose only problem is undefined names shows the reference's "Too many
 * variables" warning beside its add-slider chips. In real mode `i` is such a name, as in Desmos.
 */
export function chipsError(row: RowAnalysis): RowError | null {
  if (row.chips.length === 0) return null;
  const names = row.chips.map(displayName);
  if (row.asksForEquation === true) {
    // RC-17: Desmos's "Try adding 'y=' to the beginning of this equation." for one undefined name
    // in an expression; a lone name offers no slider (captured 2026-10-20)
    const message = rowErrorMessage("equation-required", ["y="]);
    const lone = row.tree?.kind === "id";
    return { code: lone ? "equation-required" : "too-many-variables", message, names, span: null };
  }
  return {
    code: "too-many-variables",
    message: rowErrorMessage("too-many-variables", names),
    names,
    span: null,
  };
}

/**
 * RC-15: a row, or a definition's body, whose value Desmos leaves unshown: a point whose
 * coordinates are numerals (a sign allowed), a list of such points, a list of numerals, and, as a
 * whole row, a numeral. A definition `a=2\frac{1}{2}` is no slider and shows its value. Desmos
 * shows a list of numerals as an "N element list" chip, so the row keeps its value text for the
 * list's own display and only the API reports it undisplayed (`numberLists`).
 */
function literalRow(tree: Node | null, numberLists: boolean): boolean {
  if (tree?.kind === "rel" && tree.ops.length === 1 && tree.ops[0] === "=") {
    const [name, body] = tree.operands;
    const mixed = body.kind === "num" && body.mixed !== undefined;
    return name.kind === "id" && !mixed && literalRow(body, numberLists);
  }
  const plain = (n: Node) => n.kind === "num" && n.grouped === undefined;
  const numeral = (n: Node) => plain(n) || (n.kind === "neg" && plain(n.arg));
  const point = (n: Node) => n.kind === "point" && numeral(n.x) && numeral(n.y);
  if (tree?.kind === "list") {
    if (tree.range !== undefined) return false;
    if (tree.items.length > 0 && tree.items.every(point)) return true;
    // a mixed number in a list shows its value, `[2\frac{1}{2}]` "= 2.5"
    const whole = (n: Node) => {
      const m = n.kind === "neg" ? n.arg : n;
      return numeral(n) && m.kind === "num" && m.mixed === undefined;
    };
    return numberLists && tree.items.every(whole);
  }
  return tree !== null && (point(tree) || numeral(tree));
}

/**
 * NM-7: the toggle's fraction for an expression row, or null when it offers none. As in Desmos it
 * is offered for a row that does not graph and whose value is one real number with a fraction
 * form: a computed value, a definition, a literal (`0.75`, whose value is otherwise unshown) and a
 * slider (whose gutter has no room for the icon; Alt+Shift+A still switches it). Lists, points,
 * complex numbers, graphed rows, tables and regressions offer none (captured 2026-10-21).
 */
function rowFraction(
  row: RowAnalysis,
  value: Value | null,
  overrun: boolean
): DisplayFraction | null {
  if (row.kind !== "value" && row.kind !== "definition") return null;
  if (value?.type !== "number" || !rowHasValue(row, value, overrun)) return null;
  return displayFraction(value.value);
}

/** NM-34 to NM-36, NM-42: the list error a row's value carries, as its row error (R-2). */
function valueError(value: Value | null): RowError | null {
  if (value === null || value.type !== "undefined" || value.error === undefined) return null;
  const code = value.error;
  return { code, message: rowErrorMessage(code, []), names: [], span: null };
}

/**
 * A row's view: kind, error, chips and complex hint from the main-thread analysis (AR-51), and the
 * value from its latest accepted result. An overrun row shows the AR-48 timeout error, and a value
 * carrying a list error shows that error (NM-34 to NM-36).
 */
function buildRowView(
  row: StoredRow,
  analysis: RowAnalysis,
  result: RowResult,
  sliders?: ReadonlyMap<string, SliderView>
): RowView {
  const { value, overrun } = result;
  const slider = sliders?.get(row.id) ?? null;
  const limitError: ViewError | null =
    slider?.error == null
      ? null
      : { code: "slider-limits", message: slider.error, names: [], span: null };
  const fraction =
    row.type === "table" || limitError !== null ? null : rowFraction(analysis, value, overrun);
  // R-5: a toggled literal or slider shows its value too, as the fraction (as in Desmos)
  const asFraction = fraction !== null && row.fraction === true;
  return {
    id: row.id,
    latex: row.latex,
    hidden: row.hidden,
    color: row.color,
    kind: analysis.kind,
    error: overrun
      ? timeoutError()
      : (analysis.error ??
        limitError ??
        chipsError(analysis) ??
        valueError(value) ??
        fitError(result.regression)),
    chips: slider === null ? [...analysis.chips] : [...slider.limitNames],
    value,
    // SLIDERS-12: a slider row has no value readout
    valueText:
      asFraction || (slider === null && value !== null && rowShowsValue(analysis, value, overrun))
        ? formatValue(value!)
        : null,
    fraction,
    asFraction,
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
    slider,
    ...(row.inference !== undefined && { inference: row.inference }),
  };
}

/**
 * Every row's view, in order. R-5 (owner decision, 2026-10-21): a row that is a bare reference to
 * a fitted regression parameter (`m` after `y_1~mx_1+b`) offers no decimal/fraction toggle, so its
 * view carries no fraction and never shows one; Alt+Shift+A leaves it alone, as on any row
 * without the toggle.
 */
export function buildRowViews(
  rows: readonly StoredRow[],
  analysis: ReadonlyMap<string, RowAnalysis>,
  result: (id: string) => RowResult,
  sliders?: ReadonlyMap<string, SliderView>
): RowView[] {
  const views = rows.map((row) =>
    buildRowView(row, analysis.get(row.id)!, result(row.id), sliders)
  );
  const fitted = new Set<string>();
  for (const v of views) {
    const fit = v.regression?.result;
    if (fit?.ok === true) for (const p of fit.params) fitted.add(p.name);
  }
  if (fitted.size === 0) return views;
  return views.map((v) =>
    v.fraction !== null && fitted.has(v.latex.trim())
      ? { ...v, fraction: null, asFraction: false }
      : v
  );
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
 * overrun row; `evaluation` whenever the row has a value, and `evaluationDisplayed` when it shows
 * it, so a literal (`1`) or a slider (`a=1`) has an evaluation it does not display, as in Desmos.
 */
export function buildExpressionAnalysis(
  views: readonly RowView[],
  analysis: AnalysisResult
): Record<string, ExpressionAnalysis> {
  const entries = views.map((view): [string, ExpressionAnalysis] => {
    const row = analysis.byId.get(view.id)!;
    const evaluated =
      view.error === null && view.value !== null && rowHasValue(row, view.value, view.overrun);
    // a slider shows no value (SLIDERS-12), nor does a list of numerals (literalRow); a toggled
    // literal's fraction does not count either, as in Desmos (R-5)
    const shown =
      evaluated &&
      view.slider == null &&
      rowShowsValue(row, view.value, view.overrun) &&
      !literalRow(row.tree, true);
    return [
      view.id,
      {
        isGraphable: row.isGraphable,
        isError: view.error !== null,
        ...(view.error !== null && { errorMessage: view.error.message }),
        evaluationDisplayed: shown,
        ...(evaluated && { evaluation: toApiEvaluation(view.value!, view.valueText) }),
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
