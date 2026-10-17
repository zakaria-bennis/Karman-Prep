// The headless calculator engine (01-interfaces-runtime.md section 8; 07 Decision 14): the public
// API that KarmanCalculator forwards and the internal surface the React UI drives. Rows, ids and
// history live in document.ts and wire conversion in state.ts; this facade validates, runs the
// commit pipeline and posts to the compute backend. Pure TypeScript: no DOM, no React (AR-44).

import type { Geometry } from "../../plot/geometry";
import { defaultViewport, type Viewport, type ViewSpec } from "../../plot/viewport";
import { nextSlot } from "../../theme/roles";
import type { ComputeBackend } from "../../worker/backend";
import { analyzeRows, type AnalysisResult, type RowError } from "../analysis";
import type { RowKind } from "../corpus/types";
import type { Value } from "../eval/values";
import { MAX_ROW_CHARACTERS, MAX_ROWS } from "../latex";
import {
  INITIAL_GRAPH_SIZE,
  RowDocument,
  sameRows,
  type HistoryStep,
  type StoredRow,
} from "./document";
import { KarmanCalculatorError } from "./errors";
import { toExpressionState, toWireRows, toWireSettings, upsertRows } from "./state";
import {
  DEFAULT_SETTINGS,
  type CalculatorOptions,
  type CalculatorSettings,
  type ExpressionState,
} from "./types";
import { validateExpressionState, validateOptions, validateRowRefs } from "./validate";

export interface EngineDeps {
  backend: ComputeBackend;
  scheduleFrame: (callback: () => void) => void; // requestAnimationFrame in browsers, setTimeout(…, 16) in node
  now: () => number;
  randomSeed: () => number; // crypto.getRandomValues; replaced by options.seed (API-1)
}
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
  canUndo: boolean;
  canRedo: boolean;
  backendKind: "worker" | "main-thread";
}
export type EditSource = "typing" | "keypad" | "paste" | "api";
export type EditRefusal = "row-limit" | "char-limit";

const NO_GEOMETRY: ReadonlyMap<string, Geometry> = new Map();
const STEP: HistoryStep = { kind: "step" };

export class CalculatorEngine {
  private readonly deps: EngineDeps;
  private readonly options: CalculatorOptions;
  private readonly doc = new RowDocument();
  private readonly listeners = new Set<() => void>();
  private currentSettings: CalculatorSettings = DEFAULT_SETTINGS;
  private viewport: Viewport = defaultViewport(INITIAL_GRAPH_SIZE);
  private analysis: AnalysisResult;
  private revision = 0;
  /** AR-46: one counter, incremented on every state and view send. */
  private generation = 0;
  /** The current snapshot; null once a change makes it stale, rebuilt by getSnapshot(). */
  private snapshot: EngineSnapshot | null = null;

  /** Validates the options (API-1) before anything is posted, then posts hello and state 1. */
  constructor(options: CalculatorOptions | undefined, deps: EngineDeps) {
    this.options = validateOptions(options);
    this.deps = deps;
    this.analysis = this.analyze();
    deps.backend.post({ v: 1, type: "hello", seed: this.options.seed ?? deps.randomSeed() });
    this.postState();
  }

  // ── public API (API-2 to API-13) ──

  /** API-2: upserts one row by id; a new row takes nextSlot(rowIndex) (TH-10). */
  setExpression(state: ExpressionState): void {
    this.upsert("setExpression", [validateExpressionState(state)]);
  }

  /** API-2: upserts several rows as one undo step; every state is validated before any change. */
  setExpressions(list: ExpressionState[]): void {
    if (!Array.isArray(list)) invalid("setExpressions: list must be an array");
    const states = list.map((state) => validateExpressionState(state));
    this.upsert("setExpressions", states);
  }

  /** API-4: deletes one row as an undo step; an unknown id changes nothing. */
  removeExpression(ref: { id: string }): void {
    this.remove(validateRowRefs([ref]));
  }

  /** API-4: deletes rows as one undo step; removing every row leaves one empty row. */
  removeExpressions(list: { id: string }[]): void {
    this.remove(validateRowRefs(list));
  }

  /** API-4: deep copies of the rows in list order. */
  getExpressions(): ExpressionState[] {
    return this.doc.rows.map((row) => toExpressionState(row));
  }

  /** API-11: one history stack shared by the API, the toolbar and the KB- shortcuts. */
  undo(): void {
    if (this.doc.undo()) this.afterCommit();
  }

  redo(): void {
    if (this.doc.redo()) this.afterCommit();
  }

  clearHistory(): void {
    const had = this.doc.canUndo() || this.doc.canRedo();
    this.doc.clearHistory();
    if (had) this.changed();
  }

  canUndo(): boolean {
    return this.doc.canUndo();
  }

  canRedo(): boolean {
    return this.doc.canRedo();
  }

  // ── internal UI surface (not forwarded by KarmanCalculator) ──

  /** Listeners run synchronously after every commit made by a method call (Decision 13). */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** The same object until something changes, so useSyncExternalStore sees no spurious change. */
  getSnapshot(): EngineSnapshot {
    this.snapshot ??= this.buildSnapshot();
    return this.snapshot;
  }

  /**
   * One row's new latex. Over MAX_ROW_CHARACTERS it is refused with "char-limit" (NM-42); an
   * unknown id or unchanged latex changes nothing. "typing" and "keypad" edits to one row coalesce
   * into one undo step (KB-2, Decision 6); "paste" and "api" edits are one step each.
   */
  editRow(id: string, latex: string, source: EditSource): EditRefusal | null {
    const row = this.doc.rows.find((r) => r.id === id);
    if (row === undefined) return null;
    if (latex.length > MAX_ROW_CHARACTERS) return "char-limit";
    if (latex === row.latex) return null;
    const step: HistoryStep =
      source === "typing" || source === "keypad"
        ? { kind: "group", rowId: id, at: this.deps.now() }
        : STEP;
    this.commitRows(this.withRow(id, { latex }), step);
    return null;
  }

  endEditGroup(): void {
    this.doc.endGroup();
  }

  /**
   * A new empty row after `afterId` (at the end for null or an unknown id) with the next decimal
   * id and nextSlot(its index) (Decision 7); refused with "row-limit" at MAX_ROWS (NM-42).
   */
  insertRowAfter(afterId: string | null): { id: string } | EditRefusal {
    const rows = this.doc.rows;
    if (rows.length >= MAX_ROWS) return "row-limit";
    const after = afterId === null ? -1 : rows.findIndex((r) => r.id === afterId);
    const index = after < 0 ? rows.length : after + 1;
    const color = nextSlot(index);
    const row: StoredRow = { id: this.doc.nextId(), latex: "", color, hidden: false };
    this.commitRows([...rows.slice(0, index), row, ...rows.slice(index)], STEP);
    return { id: row.id };
  }

  /** R-9: deletes a row as one step; the last remaining row is never deleted, only emptied. */
  deleteRow(id: string): void {
    const rows = this.doc.rows;
    if (!rows.some((r) => r.id === id)) return;
    const next = rows.length === 1 ? [{ ...rows[0], latex: "" }] : rows.filter((r) => r.id !== id);
    this.commitRows(next, STEP);
  }

  /** KB-5: one undo step that leaves one empty row and keeps the settings and the viewport. */
  clearAll(): void {
    this.commitRows([], STEP);
  }

  setRowHidden(id: string, hidden: boolean): void {
    this.commitRows(this.withRow(id, { hidden }), STEP);
  }

  // ── commit pipeline ──

  /** API-2, NM-42, API-13: over MAX_ROWS the call throws invalid-argument and changes nothing. */
  private upsert(method: string, states: readonly ExpressionState[]): void {
    const rows = upsertRows(this.doc.rows, states);
    if (rows.length > MAX_ROWS) invalid(`${method}: more than ${MAX_ROWS} rows`);
    this.commitRows(rows, STEP);
  }

  private remove(refs: readonly { id: string }[]): void {
    const ids = new Set(refs.map((ref) => ref.id));
    const rows = this.doc.rows.filter((row) => !ids.has(row.id));
    this.commitRows(rows, STEP);
  }

  /** The rows with row `id` replaced by a changed copy; every other row keeps its object. */
  private withRow(id: string, change: Partial<StoredRow>): StoredRow[] {
    return this.doc.rows.map((row) => (row.id === id ? { ...row, ...change } : row));
  }

  /** Commits `rows` unless they equal the current list, so a no-op adds no undo step or send. */
  private commitRows(rows: readonly StoredRow[], step: HistoryStep): void {
    if (sameRows(rows, this.doc.rows)) return;
    this.doc.commit(rows, step);
    this.afterCommit();
  }

  /**
   * After every row commit (undo and redo included): analyse on the main thread (AR-51), bump the
   * revision, post state with the next generation (AR-46), then notify subscribers. No worker
   * result is read yet, so there are no per-row results to clear (Decision 5).
   */
  private afterCommit(): void {
    this.analysis = this.analyze();
    this.revision++;
    this.postState();
    this.changed();
  }

  private analyze(): AnalysisResult {
    const sources = this.doc.rows.map(({ id, latex, hidden }) => ({ id, latex, hidden }));
    return analyzeRows(sources, toWireSettings(this.currentSettings));
  }

  /** AR-45, AR-46: a versioned plain `state` message carrying the next generation. */
  private postState(): void {
    this.generation++;
    this.deps.backend.post({
      v: 1,
      type: "state",
      generation: this.generation,
      rows: toWireRows(this.doc.rows),
      settings: toWireSettings(this.currentSettings),
      sliders: {},
    });
  }

  /** Marks the snapshot stale and runs the subscribers synchronously (Decision 13). */
  private changed(): void {
    this.snapshot = null;
    for (const listener of [...this.listeners]) listener();
  }

  private buildSnapshot(): EngineSnapshot {
    return {
      revision: this.revision,
      rows: this.doc.rows.map((row) => this.rowView(row)),
      settings: this.currentSettings,
      viewport: this.viewport,
      view: null,
      geometry: NO_GEOMETRY,
      focusedRowId: null,
      activeRowId: null,
      canUndo: this.doc.canUndo(),
      canRedo: this.doc.canRedo(),
      backendKind: this.deps.backend.kind,
    };
  }

  /**
   * A row's view: kind, error, chips and complex hint from the main-thread analysis (AR-51). No
   * worker result is read yet, so value and valueText are null and overrun is false.
   */
  private rowView(row: StoredRow): RowView {
    const analysis = this.analysis.byId.get(row.id)!;
    return {
      id: row.id,
      latex: row.latex,
      hidden: row.hidden,
      color: row.color,
      kind: analysis.kind,
      error: analysis.error,
      chips: [...analysis.chips],
      complexHint: analysis.complexHint,
      value: null,
      valueText: null,
      overrun: false,
    };
  }
}

function invalid(message: string): never {
  throw new KarmanCalculatorError("invalid-argument", message);
}
