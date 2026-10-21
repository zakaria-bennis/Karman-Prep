// The executor's units of work (AR-47, AR-48, AR-54, API-10): one values pass (analyzeRows then
// evaluateRows under per-row 250 ms deadlines), one row's plot, one helper job. Errors become
// `fault` messages and UNDEFINED values, never throws. Pure TypeScript: no DOM (AR-44).

import {
  analyzeRows,
  userFunctionNames,
  type AnalysisResult,
  type RowAnalysis,
} from "../core/analysis/index";
import {
  DeadlineExceeded,
  POI_DEADLINE_MS,
  ROW_VALUE_DEADLINE_MS,
  type Deadline,
} from "../core/deadline";
import { compileExpression, evaluateRows, type CompileScope } from "../core/eval/compile";
import type { DataSink, TableResult } from "../core/data/evaluate";
import { UNDEFINED, type Value } from "../core/eval/values";
import { parseLatex, type ParseResult } from "../core/latex/index";
import { buildCompileScope, plotInputFor } from "../plot/from-analysis";
import { geometryTransferables } from "../plot/geometry";
import { plotRow } from "../plot/index";
import { plotTable, tableRegressionCurve } from "../plot/table";
import { findRowPois } from "../poi/index";
import type { ViewSpec } from "../plot/viewport";
import type { RegressionOutcome } from "../core/data/evaluate-regression";
import type { WireRow, WireSettings, WorkerToMain } from "./protocol";
import { createWorkDeadline, type SliceClock } from "./slice";

/** What a unit needs from the executor: the generation it posts under, the clock and the port. */
export interface PassContext {
  generation: number;
  clock: SliceClock;
  now: () => number;
  post(message: WorkerToMain, transfer?: ArrayBuffer[]): void;
}

/** The compute functions a unit calls; tests swap one to inject an expiry or a throw. */
export interface ComputeFns {
  analyzeRows: typeof analyzeRows;
  evaluateRows: typeof evaluateRows;
  plotInputFor: typeof plotInputFor;
  plotRow: typeof plotRow;
}

export const DEFAULT_COMPUTE: ComputeFns = Object.freeze({
  analyzeRows,
  evaluateRows,
  plotInputFor,
  plotRow,
});

/** A values pass's result: the final round's analysis, values and compile scope, and the overrun rows. */
export interface ValuesOutcome {
  analysis: AnalysisResult;
  values: ReadonlyMap<string, Value>;
  tables: ReadonlyMap<string, TableResult>; // D-11, by table row id
  scope: CompileScope;
  overrun: ReadonlySet<string>;
}

/** AR-54: a fault names only the error type, never its message (which may echo the student's input). */
function postFault(ctx: PassContext, thrown: unknown): void {
  const message = thrown instanceof Error ? thrown.name : typeof thrown;
  ctx.post({ v: 1, type: "fault", generation: ctx.generation, message });
}

/**
 * One evaluation round's `deadlineFor`: the first call for a row id starts its 250 ms deadline
 * (AR-48), whose expiry adds the row to `overrun`, and posts `begin`; later calls for that id in
 * the same round return the same deadline and post nothing.
 */
function roundDeadlines(ctx: PassContext, overrun: Set<string>): (rowId: string) => Deadline {
  const cache = new Map<string, Deadline>();
  return (rowId) => {
    const cached = cache.get(rowId);
    if (cached !== undefined) return cached;
    const deadline = createWorkDeadline({
      clock: ctx.clock,
      now: ctx.now,
      limitMs: ROW_VALUE_DEADLINE_MS,
      rowId,
      onExpire: () => overrun.add(rowId),
    });
    ctx.post({ v: 1, type: "begin", generation: ctx.generation, rowId });
    cache.set(rowId, deadline);
    return deadline;
  };
}

/**
 * The values unit (AR-48). Analyses every row and evaluates them; when a row's DeadlineExceeded
 * propagates, that row joins `overrun` and the rows not in `overrun` are analysed and evaluated
 * again, each round removing at least one row. Any other throw posts a fault and leaves every
 * value UNDEFINED (AR-54). Then posts, in list order and from the full-list analysis, each row's
 * `analysis` and its `value` (UNDEFINED when it has none) or `overrun`.
 */
export function runValuesPass(
  rows: readonly WireRow[],
  settings: WireSettings,
  ctx: PassContext,
  fns: ComputeFns = DEFAULT_COMPUTE
): ValuesOutcome {
  const sources = rows.map(({ id, latex, hidden, columns, logMode, regression }) =>
    columns === null
      ? { id, latex, hidden, logMode }
      : { id, latex, hidden, columns, ...(regression ? { regression } : {}) }
  );
  const full = fns.analyzeRows(sources, settings),
    overrun = new Set<string>();
  let analysis = full,
    values: ReadonlyMap<string, Value> = new Map(),
    tables = new Map<string, TableResult>(),
    regressions = new Map<string, RegressionOutcome>();
  for (;;) {
    try {
      tables = new Map();
      regressions = new Map();
      const sink: DataSink = {
        table: (rowId, table) => tables.set(rowId, table),
        regression: (rowId, result) => regressions.set(rowId, result),
      };
      values = fns.evaluateRows(analysis, settings, roundDeadlines(ctx, overrun), sink);
      break;
    } catch (thrown) {
      if (thrown instanceof DeadlineExceeded && thrown.rowId !== null) {
        const { rowId } = thrown;
        if (analysis.byId.has(rowId)) {
          overrun.add(rowId);
          const remaining = sources.filter((row) => !overrun.has(row.id));
          analysis = fns.analyzeRows(remaining, settings);
          continue;
        }
      }
      postFault(ctx, thrown);
      values = new Map();
      break;
    }
  }
  const { generation } = ctx;
  for (const row of full.rows) {
    const { id: rowId, kind, error, isGraphable } = row;
    ctx.post({ v: 1, type: "analysis", generation, rowId, analysis: { kind, error, isGraphable } });
    if (overrun.has(rowId)) {
      ctx.post({ v: 1, type: "overrun", generation, rowId });
    } else {
      const value = values.get(rowId) ?? UNDEFINED;
      ctx.post({ v: 1, type: "value", generation, rowId, jobId: null, value });
      const table = tables.get(rowId);
      if (table !== undefined) ctx.post({ v: 1, type: "table", generation, rowId, table });
      const result = regressions.get(rowId);
      if (result !== undefined) ctx.post({ v: 1, type: "regression", generation, rowId, result });
    }
  }
  const scope = buildCompileScope(analysis, values, settings);
  return { analysis, values, tables, scope, overrun };
}

/**
 * One row's plot unit: nothing for an overrun row or when `plotInputFor` gives null; otherwise
 * `begin`, then `plot` with the geometry's buffers as transferables (AR-45). Plot sampling has no
 * total limit (AR-48), only heartbeats. A throw posts a fault naming its type (AR-54).
 */
export function runPlot(
  row: RowAnalysis,
  outcome: ValuesOutcome,
  view: ViewSpec,
  ctx: PassContext,
  fns: ComputeFns = DEFAULT_COMPUTE
): void {
  if (outcome.overrun.has(row.id)) return;
  const { generation } = ctx,
    rowId = row.id;
  if (row.kind === "table") {
    const result = outcome.tables.get(rowId);
    if (row.table === undefined || result === undefined) return;
    const geometry = plotTable(rowId, row.table, result); // D-11
    const curve = tableRegressionCurve(row.table, result);
    if (curve !== null) {
      try {
        const deadline = createWorkDeadline({
          clock: ctx.clock,
          now: ctx.now,
          limitMs: null,
          rowId,
        });
        const plotted = fns.plotRow(
          { rowId, kind: "explicit", independent: "x", fs: [curve] },
          view,
          deadline
        );
        if (plotted.kind === "curve") geometry.regression = plotted;
      } catch (thrown) {
        postFault(ctx, thrown);
      }
    }
    ctx.post({ v: 1, type: "plot", generation, rowId, geometry }, geometryTransferables(geometry));
    return;
  }
  try {
    const input = fns.plotInputFor(row, outcome.scope, outcome.values.get(rowId) ?? null);
    if (input === null) return;
    ctx.post({ v: 1, type: "begin", generation, rowId });
    const deadline = createWorkDeadline({ clock: ctx.clock, now: ctx.now, limitMs: null, rowId });
    const geometry = fns.plotRow(input, view, deadline);
    ctx.post({ v: 1, type: "plot", generation, rowId, geometry }, geometryTransferables(geometry));
  } catch (thrown) {
    postFault(ctx, thrown);
  }
}

/**
 * Parses helper LaTeX as a row is parsed (PR-23): only functions with parameters
 * are callable, so after `a=2x` the helper `a(x+1)` is a product, as the row `a(x+1)` is.
 */
export function parseHelper(latex: string, analysis: AnalysisResult): ParseResult {
  return parseLatex(latex, { userFunctions: userFunctionNames(analysis.functions) });
}

/**
 * One helper job (API-10): evaluated against the row scope under a 250 ms deadline. A failed
 * parse, a relation or an expired deadline gives UNDEFINED; any other throw also posts a fault.
 * Always posts exactly one `value` for the job.
 */
export function runHelper(
  job: { jobId: number; latex: string },
  outcome: ValuesOutcome,
  ctx: PassContext
): void {
  let value: Value = UNDEFINED;
  try {
    const parsed = parseHelper(job.latex, outcome.analysis);
    if (parsed.ok && parsed.tree.kind !== "rel") {
      const deadline = createWorkDeadline({
        clock: ctx.clock,
        now: ctx.now,
        limitMs: ROW_VALUE_DEADLINE_MS,
        rowId: null,
      });
      value = compileExpression(parsed.tree, outcome.scope)({}, deadline);
    }
  } catch (thrown) {
    if (!(thrown instanceof DeadlineExceeded)) postFault(ctx, thrown);
  }
  const { generation } = ctx;
  ctx.post({ v: 1, type: "value", generation, rowId: null, jobId: job.jobId, value });
}

/**
 * POI-1: the points of interest of the selected row in `view` under POI_DEADLINE_MS. A row that is
 * not graphable (hidden, an error, chips) or overran posts an empty list, so its dots go; an
 * expired deadline posts nothing; any other throw posts a fault (AR-54).
 */
export function runPoi(
  rowId: string,
  outcome: ValuesOutcome,
  view: ViewSpec,
  ctx: PassContext
): void {
  const { generation } = ctx;
  try {
    const deadline = createWorkDeadline({
      clock: ctx.clock,
      now: ctx.now,
      limitMs: POI_DEADLINE_MS,
      rowId,
    });
    const points = outcome.overrun.has(rowId)
      ? []
      : findRowPois(rowId, outcome.analysis, outcome.scope, view, deadline, {
          result: (id) => ({ table: outcome.tables.get(id) }),
        });
    ctx.post({ v: 1, type: "poi", generation, rowId, points });
  } catch (thrown) {
    if (!(thrown instanceof DeadlineExceeded)) postFault(ctx, thrown);
  }
}
