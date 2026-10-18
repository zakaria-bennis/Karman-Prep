# Parity increment: interface contracts

Contracts every package of this plan codes against. Names are exact; a package that needs a change
edits this file in the same commit as the code. Phase 1 contracts
(`../2026-10-16-calculator-v2-phase1/01-interfaces*.md`) still hold where not extended here.

## 1. Points of interest (`src/lib/calculator-v2/poi/`, package 02)

```ts
// poi/types.ts
export type PoiKind =
  | "zero"
  | "y-intercept"
  | "x-intercept"
  | "maximum"
  | "minimum"
  | "top"
  | "bottom"
  | "intersection";
export interface PoiPoint {
  x: number;
  y: number;
  kinds: PoiKind[]; // POI-7: coincident points merge; order as listed in PoiKind
  withRowId: string | null; // the other curve of an intersection, else null
}
export type PoiCurve = // one curve a row draws, as closures (from plotInputFor)
  | { kind: "explicit"; independent: "x" | "y"; f: (t: number) => number }
  | { kind: "implicit"; F: (x: number, y: number) => number }
  | { kind: "lines"; orientation: "vertical" | "horizontal"; f: (t: number) => number };

// poi/format.ts
export function poiDecimals(unitsPerPx: number): number; // POI-12: clamp(max(5, ceil(-log10 u) + 3), 0, 12)
export function traceDecimals(unitsPerPx: number): number; // POI-14: clamp(ceil(-log10 u) + 1, 0, 12)
export function formatPoiCoordinate(v: number, decimals: number): string; // true minus, trimmed zeros
export function formatPoiLabel(p: { x: number; y: number }, view: ViewSpec): string; // "(x, y)"
export function roundTraceX(x: number, view: ViewSpec): number;

// poi/roots.ts (1D, scale-invariant, POI-5, POI-6, POI-8, POI-11)
export interface Search1D {
  lo: number;
  hi: number;
  samples: number;
}
export function findRoots(f: (t: number) => number, s: Search1D): number[];
export function findExtrema(
  f: (t: number) => number,
  s: Search1D
): { t: number; kind: "maximum" | "minimum" }[];

// poi/find.ts
export const POI_CAP = 100; // POI-10, per kind
export function searchRange(view: ViewSpec): Viewport; // POI-9: the view widened by 10% per side
export function findPois(
  curve: PoiCurve,
  others: readonly { rowId: string; curve: PoiCurve }[],
  view: ViewSpec,
  deadline: Deadline
): PoiPoint[]; // inside the view only, merged, capped, sorted by x then y
export function poiCurvesOf(input: PlotInput): PoiCurve[]; // region boundaries become implicit curves
```

## 2. Protocol additions (`src/lib/calculator-v2/worker/protocol.ts`)

```ts
// MainToWorker gains
| { v: 1; type: "select"; rowId: string | null } // POI-1: the selected row
// WireRow becomes
interface WireRow {
  id: string;
  type: "expression" | "table";
  latex: string; // "" for a table
  columns: WireColumn[] | null; // null for an expression
  hidden: boolean;
  sliderBounds: { min: string; max: string; step: string } | null;
  logMode: boolean; // D-30, regression rows; false otherwise
}
interface WireColumn { latex: string; values: string[]; hidden: boolean }
// WorkerToMain: the reserved messages are filled in, and `table` is added
| { v: 1; type: "poi"; generation: number; rowId: string; points: PoiPoint[] }
| { v: 1; type: "regression"; generation: number; rowId: string; result: RegressionResult }
| { v: 1; type: "table"; generation: number; rowId: string; table: TableResult }
```

The executor computes POIs for the selected row after the plots of every iteration and on a
`select`, under `POI_DEADLINE_MS` (500 ms); an expired deadline posts no `poi`.

## 3. Tables (`core/data/`, package 03)

```ts
// core/api/document.ts: StoredRow gains
readonly type?: "table"; // absent for an expression row
readonly columns?: readonly StoredColumn[];
readonly logMode?: boolean; // D-30
export interface StoredColumn {
  readonly latex: string; // header
  readonly values: readonly string[]; // cell latex; "" is blank
  readonly color: string; // "c1".."c6" or "#rrggbb"
  readonly hidden: boolean; // points off
  readonly lines?: boolean; // D-12 lines on
  readonly lineStyle?: LineStyle;
  readonly pointStyle?: PointStyle;
}
export const MAX_TABLE_ROWS = 1000; // D-8
export const MAX_TABLE_COLUMNS = 10; // D-9

// core/analysis/index.ts: RowSource gains `columns?: readonly { latex: string; values: readonly string[] }[]`
// RowKind gains "table" and "regression"; RowGraph gains { kind: "table" } and
// { kind: "regression"; expr: Node; predictor: string }
// RowAnalysis gains
table: TableAnalysis | null;
regression: RegressionAnalysis | null;

// core/data/table-analysis.ts
export type ColumnRole = "variable" | "data" | "computed" | "blank" | "error";
export interface ColumnAnalysis {
  index: number;
  role: ColumnRole;
  name: string | null; // variable and data columns: the header name
  tree: Node | null; // the header tree
  error: RowError | null; // header warning (D-10)
  cellErrors: (RowError | null)[]; // per cell, analysis-time (D-6)
}
export interface TableAnalysis { columns: ColumnAnalysis[]; rows: number } // rows: data rows (trailing blank rows excluded)

// core/data/evaluate.ts
export interface TableColumnResult {
  values: (number | null)[]; // null: blank or not a real number
  display: (string | null)[]; // computed columns: the formatted values; data columns: null
  cellErrors: (string | null)[]; // evaluation-time messages (D-6)
}
export interface TableResult { columns: TableColumnResult[] }
export interface DataSink { table(rowId: string, t: TableResult): void; regression(rowId: string, r: RegressionResult): void }
// evaluateRows(analysis, settings, deadlineFor, sink?: DataSink): the fourth argument is new
```

Synthetic definitions: each data or variable column defines its header name as a list whose
`byId` entry has the id `${tableId}#${index}`; each fitted parameter `p` of regression row `r` has
`${r}#p:${p}` and its residual list `${r}#e`. Synthetic rows are in `byId` and `valueOrder`, never
in `rows`. `buildCompileScope` reads every `byId` entry.

## 4. Regression (`src/lib/calculator-v2/regression/`, package 04)

```ts
// core/latex/ast.ts gains { kind: "sim"; left: Node; right: Node; span } (top level only, PR-30)
export interface RegressionAnalysis {
  params: string[]; // D-22 order of first appearance in the model
  residual: string; // e_{k}, D-33
  observed: Node; // L
  model: Node; // M
  predictors: string[]; // list names M uses
  logForm: LogForm | null; // D-27
}
export type LogForm = "exponential" | "power" | "logarithmic";
export interface RegressionResult {
  ok: boolean;
  error: string | null; // D-24 Desmos messages
  params: { name: string; value: number }[];
  r2: number | null; // null when undefined (D-31)
  r: number | null;
  rmse: number | null; // only when r2 is null (D-32)
  residuals: number[];
  logMode: { available: boolean; on: boolean };
  approximate: boolean; // D-26 nonlinear without convergence
}
// regression/least-squares.ts
export function solveLeastSquares(
  a: Float64Array,
  rows: number,
  cols: number,
  b: Float64Array
): Float64Array; // min-norm, Jacobi SVD
// regression/levenberg.ts
export function fitNonlinear(
  model: (p: Float64Array, i: number) => number,
  y: Float64Array,
  start: Float64Array,
  opts?: { maxIterations?: number }
): { params: Float64Array; sse: number; converged: boolean };
// regression/fit.ts
export function fitRegression(input: FitInput): RegressionResult;
// regression/format.ts
export function formatParameter(v: number): string; // 6 significant digits, trimmed (D-45)
export function formatStatistic(v: number): string; // 4 decimals, trimmed (D-45)
```

## 5. Engine and snapshot additions (`core/api/`)

```ts
// CalculatorEngine internal UI surface gains
setSelectedRow(id: string | null): void; // POI-1, posts `select`
insertTableAfter(afterId: string | null, init?: { columns: StoredColumn[] }): { id: string } | EditRefusal;
replaceWithTable(rowId: string): { id: string } | EditRefusal; // empty row → table in place (S-12, D-5)
editCell(rowId: string, column: number, row: number, latex: string, source: EditSource): EditRefusal | null;
editHeader(rowId: string, column: number, latex: string, source: EditSource): EditRefusal | null;
deleteTableRow(rowId: string, row: number): void;
setColumnStyle(rowId: string, column: number, style: Partial<StoredColumn>): void;
setLogMode(rowId: string, on: boolean): void;
addResidualColumn(regressionRowId: string): void;
createTableFromRow(rowId: string): { id: string } | EditRefusal | null; // D-13
insertRegressionBelow(tableRowId: string): { id: string } | EditRefusal | null; // D-3
// EngineSnapshot gains
selectedRowId: string | null;
poi: { rowId: string; points: readonly PoiPoint[] } | null;
// RowView gains
type: "expression" | "table";
columns: readonly StoredColumn[] | null;
table: TableView | null; // analysis plus the latest TableResult
regression: RegressionView | null;
```

## 6. Rendering (`src/lib/calculator-v2/render/`)

```ts
// RenderRow gains
selected: boolean; // POI-17: heavier stroke, CURVE_SELECTED_LINE_PX
pointStyle: PointStyle; lineStyle: LineStyle; lines: boolean; // tables (D-12)
// Geometry gains
interface TableGeometry { kind: "table"; rowId: string; evaluations: number; series: { column: number; coords: Float64Array }[] }
// RenderFrame gains
poi: { color: string; points: readonly { x: number; y: number; open: boolean }[] } | null;
// constants.ts (G-25): CURVE_LINE_PX 2.5, CURVE_SELECTED_LINE_PX 4, POINT_RADIUS_PX 5,
// POI_RADIUS_PX 4, POI_OPEN_RADIUS_PX 5.5, DASH_PX [12, 6], AXIS_LINE_PX 1.5
```

## 7. UI modules (`src/components/calculator-v2/ui/`)

```ts
// graph/hit-test.ts
export const POI_HIT_PX = { fine: 12, coarse: 14 }; // POI-18
export const CURVE_HIT_PX = { fine: 8, coarse: 16 };
export function hitPoi(
  points: readonly PoiPoint[],
  view: ViewSpec,
  at: [number, number],
  pointer: Pointer
): number | null;
export function hitCurve(
  rows: readonly RenderRow[],
  view: ViewSpec,
  at: [number, number],
  pointer: Pointer
): string | null;
// graph/poi-labels.ts — the open-label state (POI-13)
export type LabelState = { rowId: string | null; open: readonly { x: number; y: number }[] };
export type LabelEvent =
  | { type: "click-poi"; rowId: string; point: PoiPoint }
  | { type: "click-curve"; rowId: string }
  | { type: "click-empty" }
  | { type: "view-changed" }
  | { type: "row-focused"; rowId: string }
  | { type: "row-edited" }
  | { type: "poi-updated"; rowId: string | null; points: readonly PoiPoint[] };
export function reduceLabels(state: LabelState, event: LabelEvent): LabelState;
// graph/trace.ts (POI-14)
export function traceAt(
  row: TraceSource,
  view: ViewSpec,
  at: [number, number],
  pois: readonly PoiPoint[],
  pointer: Pointer
): { x: number; y: number; label: string } | null;
// graph/keyboard-trace.ts (POI-20)
export function poiAnnouncement(point: PoiPoint, rowNumbers: ReadonlyMap<string, number>): string;
// list/AddItemMenu.tsx, list/TableItem.tsx, list/RegressionPanel.tsx, list/ColumnStyleMenu.tsx
// focus/focus-controller.ts: field keys are row ids or cell keys `${rowId}:${column}:${row}`
// ("h" in place of the row for a header): cellKey(rowId, column, row | "h")
```
