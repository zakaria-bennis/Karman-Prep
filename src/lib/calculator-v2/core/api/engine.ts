// The headless calculator engine (01-interfaces-runtime.md section 8; 07 Decision 14): the public
// API that KarmanCalculator forwards and the internal surface the React UI drives, as a facade over
// document.ts (rows, history), state.ts (settings, wire, whole state), inbox.ts (worker results),
// results.ts (views) and observers.ts (API-8). No DOM, no React (AR-44).

import { clampViewport, defaultViewport, type Viewport, type ViewSpec } from "../../plot/viewport";
import { nextSlot } from "../../theme/roles";
import type { ComputeBackend } from "../../worker/backend";
import { analyzeRows, type AnalysisResult } from "../analysis";
import { MAX_ROW_CHARACTERS, MAX_ROWS } from "../latex";
import {
  INITIAL_GRAPH_SIZE,
  RowDocument,
  sameRows,
  type HistoryStep,
  type StoredRow,
} from "./document";
import { KarmanCalculatorError } from "./errors";
import { ResultInbox, sentRows } from "./inbox";
import { EngineObservers } from "./observers";
import { buildRowView, snapshotAnalysis, type EngineSnapshot } from "./results";
import {
  acceptView,
  blankSettings,
  buildState,
  mergeSettings,
  rowsFromState,
  sameViewport,
  settingsFromOptions,
  stateMessage,
  toExpressionState,
  toWireSettings,
  upsertRows,
  viewMessage,
  type GraphSize,
} from "./state";
import {
  DEFAULT_SETTINGS,
  type CalculatorOptions,
  type CalculatorSettings,
  type CalculatorStateV1,
  type ChangeEvent,
  type ExpressionAnalysis,
  type ExpressionState,
  type GraphpaperBounds,
  type ObservableName,
  type SettingsUpdate,
} from "./types";
import {
  validateAllowUndo,
  validateBounds,
  validateExpressionState,
  validateOptions,
  validateRowRefs,
  validateSettingsUpdate,
  validateState,
} from "./validate";

export interface EngineDeps {
  backend: ComputeBackend;
  scheduleFrame: (callback: () => void) => void; // requestAnimationFrame in browsers, setTimeout(…, 16) in node
  now: () => number;
  randomSeed: () => number; // crypto.getRandomValues; replaced by options.seed (API-1)
}
export type { EngineSnapshot, RowView } from "./results"; // the views, built in results.ts
export type EditSource = "typing" | "keypad" | "paste" | "api";
export type EditRefusal = "row-limit" | "char-limit";

const STEP: HistoryStep = { kind: "step" };
const BLANK_ROWS: readonly StoredRow[] = [{ id: "1", latex: "", color: "c1", hidden: false }];

export class CalculatorEngine {
  private readonly deps: EngineDeps;
  private readonly options: CalculatorOptions;
  private readonly doc = new RowDocument();
  private readonly observers: EngineObservers;
  private readonly inbox = new ResultInbox({
    onFault: (message) => this.options.onError?.(new Error(`Calculator worker fault: ${message}`)),
    onHelperValue: () => undefined, // no helper job is live before API-10's HelperExpression
  });
  // resetDocument in the constructor merges the options into the settings and sets the rest
  private currentSettings = DEFAULT_SETTINGS;
  private viewport!: Viewport;
  private analysis!: AnalysisResult;
  /** The graph's last usable setView size and dpr; null until it reports one (Decision 9). */
  private graph: GraphSize | null = null;
  private revision = 0;
  /** AR-46: one counter, incremented on every state and view send. */
  private generation = 0;
  /** The current snapshot; null once a change makes it stale, rebuilt by getSnapshot(). */
  private snapshot: EngineSnapshot | null = null;

  /** Validates the options (API-1) before anything is posted, then resets as setBlank() does. */
  constructor(options: CalculatorOptions | undefined, deps: EngineDeps) {
    this.options = validateOptions(options);
    this.deps = deps;
    this.observers = new EngineObservers(deps.scheduleFrame, () => this.revision);
    deps.backend.onMessage((message) => {
      if (!this.inbox.receive(message)) return; // Decision 3
      this.snapshot = null; // subscribers see an accepted result in the next frame (Decision 13)
      this.observers.workerChanged(message.type);
    });
    this.resetDocument(settingsFromOptions(this.options), false);
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

  /** API-5: versioned JSON made of copies, so changing it changes nothing here. */
  getState(): CalculatorStateV1 {
    return buildState(this.doc.rows, this.currentSettings, this.viewport);
  }

  /**
   * API-5: validates everything first, then applies the rows (one undo step with allowUndo, else
   * history cleared), the settings and clampViewport(viewport) (Decision 11).
   */
  setState(state: CalculatorStateV1, options?: { allowUndo?: boolean }): void {
    const valid = validateState(state);
    const allowUndo = validateAllowUndo(options, "setState");
    const rows = rowsFromState(valid.expressions);
    if (!allowUndo) {
      this.doc.commit(rows, { kind: "none" });
      this.doc.clearHistory();
    } else if (!sameRows(rows, this.doc.rows)) this.doc.commit(rows, STEP);
    this.storeSettings(valid.settings);
    const viewport = clampViewport(valid.viewport);
    const moved = !sameViewport(viewport, this.viewport);
    this.viewport = Object.freeze(viewport);
    this.analyze();
    this.revision++;
    this.postState();
    if (moved) this.postView();
    this.changed();
  }

  /** API-6, Decision 8: the default rows, settings (blankSettings) and viewport; see resetDocument. */
  setBlank(options?: { allowUndo?: boolean }): void {
    this.resetDocument(blankSettings(this.currentSettings), validateAllowUndo(options, "setBlank"));
    this.revision++;
    this.changed();
  }

  /** API-7: finite bounds with left < right and bottom < top, stored as clampViewport(bounds). */
  setMathBounds(bounds: Viewport): void {
    const viewport = clampViewport(validateBounds(bounds));
    if (!sameViewport(viewport, this.viewport)) this.moveViewport(viewport);
  }

  /** API-7: validates first; only angleMode and complex re-analyse and post state (NM-29). */
  updateSettings(partial: SettingsUpdate): void {
    const before = this.currentSettings;
    const wireChanged = this.storeSettings(validateSettingsUpdate(partial));
    if (this.currentSettings === before) return;
    this.revision++;
    if (wireChanged) {
      this.analyze();
      this.postState();
    }
    this.changed();
  }

  get settings(): CalculatorSettings {
    return this.currentSettings;
  }

  /** API-14's scientific mode ships in Phase 2; until then validation keeps the mode "graphing". */
  get mode(): "graphing" {
    return "graphing";
  }

  /** API-8: `callback` runs once a frame after the named value changes; returns an unsubscribe. */
  observe(name: ObservableName, callback: () => void): () => void {
    return this.observers.observe(name, callback);
  }

  unobserve(name: ObservableName, callback?: () => void): void {
    this.observers.unobserve(name, callback);
  }

  /** API-8: once a frame after commits, with the revision and isUserInitiated (Decision 10). */
  observeEvent(name: "change", callback: (event: ChangeEvent) => void): () => void {
    return this.observers.observeEvent(name, callback);
  }

  unobserveEvent(name: "change", callback?: (event: ChangeEvent) => void): void {
    this.observers.unobserveEvent(name, callback);
  }

  /** API-9: built once per snapshot, so the same object until the snapshot changes (results.ts). */
  get expressionAnalysis(): Readonly<Record<string, ExpressionAnalysis>> {
    return snapshotAnalysis(this.getSnapshot(), this.analysis);
  }

  /** API-8: the viewport and the graph's size (INITIAL_GRAPH_SIZE before its first setView). */
  get graphpaperBounds(): GraphpaperBounds {
    const { width, height } = this.graph?.size ?? INITIAL_GRAPH_SIZE;
    return { mathCoordinates: { ...this.viewport }, pixelCoordinates: { width, height } };
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

  /** Runs after each method call's commit and once a frame after worker results (Decision 13). */
  subscribe(listener: () => void): () => void {
    return this.observers.subscribe(listener);
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
    this.commitRows(this.withRow(id, { latex }), step, true);
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
    this.commitRows([...rows.slice(0, index), row, ...rows.slice(index)], STEP, true);
    return { id: row.id };
  }

  /** R-9: deletes a row as one step; the last remaining row is never deleted, only emptied. */
  deleteRow(id: string): void {
    const rows = this.doc.rows;
    if (!rows.some((r) => r.id === id)) return;
    const next = rows.length === 1 ? [{ ...rows[0], latex: "" }] : rows.filter((r) => r.id !== id);
    this.commitRows(next, STEP, true);
  }

  /** KB-5: one undo step that leaves one empty row and keeps the settings and the viewport. */
  clearAll(): void {
    this.commitRows([], STEP, true);
  }

  setRowHidden(id: string, hidden: boolean): void {
    this.commitRows(this.withRow(id, { hidden }), STEP, true);
  }

  /** Decision 9: stores the size and viewport as given (no undo step); unusable views are ignored. */
  setView(view: ViewSpec): void {
    const graph = acceptView(this.graph, this.viewport, view);
    if (graph === null) return;
    this.graph = graph;
    this.moveViewport({ ...view.viewport }, true);
  }

  // ── commit pipeline ──

  /**
   * API-6, Decision 8: row "1" alone (history cleared, or one undo step with allowUndo), `settings`
   * and the default viewport, with every worker result forgotten; then hello with the reset seed
   * (API-1), state, and view once sized.
   */
  private resetDocument(settings: CalculatorSettings, allowUndo: boolean): void {
    if (!allowUndo) this.doc.reset();
    else if (!sameRows(BLANK_ROWS, this.doc.rows)) this.doc.commit(BLANK_ROWS, STEP);
    this.storeSettings(settings);
    this.viewport = Object.freeze(defaultViewport(this.graph?.size ?? INITIAL_GRAPH_SIZE));
    this.analyze();
    const seed = this.options.seed ?? this.deps.randomSeed();
    this.deps.backend.post({ v: 1, type: "hello", seed });
    this.inbox.reset();
    this.postState();
    this.postView();
  }

  /** Applies a settings update; API-8's settings observer fires when any value changed. */
  private storeSettings(update: SettingsUpdate): boolean {
    const { settings, wireChanged } = mergeSettings(this.currentSettings, update);
    if (settings !== this.currentSettings) this.observers.markDirty("settings");
    this.currentSettings = settings;
    return wireChanged;
  }

  /** Stores a new viewport, then bumps the revision, posts view and notifies (not an undo step). */
  private moveViewport(viewport: Viewport, userInitiated = false): void {
    this.viewport = Object.freeze(viewport);
    this.revision++;
    this.postView();
    this.changed(userInitiated);
  }

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
  private commitRows(rows: readonly StoredRow[], step: HistoryStep, userInitiated = false): void {
    if (sameRows(rows, this.doc.rows)) return;
    this.doc.commit(rows, step);
    this.afterCommit(userInitiated);
  }

  /**
   * After every row commit, undo and redo included: analyse on the main thread (AR-51), bump the
   * revision, post state (AR-46; edited rows lose their results, Decision 5), then notify.
   */
  private afterCommit(userInitiated = false): void {
    this.analyze();
    this.revision++;
    this.postState();
    this.changed(userInitiated);
  }

  /** AR-51: analyses the rows on the main thread; API-8's expressionAnalysis follows. */
  private analyze(): void {
    const sources = this.doc.rows.map(({ id, latex, hidden }) => ({ id, latex, hidden }));
    this.analysis = analyzeRows(sources, toWireSettings(this.currentSettings));
    this.observers.markDirty("expressionAnalysis");
  }

  /** AR-45, AR-46: posts `state` with the next generation and notes its rows in the inbox. */
  private postState(): void {
    this.generation++;
    this.deps.backend.post(stateMessage(this.generation, this.doc.rows, this.currentSettings));
    this.inbox.noteState(this.generation, sentRows(this.doc.rows, this.analysis));
  }

  /** Notes the bounds (API-8), then posts view with the next generation once sized (AR-46). */
  private postView(): void {
    this.observers.noteBounds(this.viewport, this.graph?.size ?? INITIAL_GRAPH_SIZE);
    const g = this.graph;
    if (g === null) return;
    this.generation++;
    this.deps.backend.post(viewMessage(this.generation, this.viewport, g.size, g.dpr));
    this.inbox.noteView(this.generation);
  }

  /** Marks the snapshot stale, runs the subscribers, queues API-8's change event (Decision 13). */
  private changed(userInitiated = false): void {
    this.snapshot = null;
    this.observers.committed(userInitiated);
  }

  private buildSnapshot(): EngineSnapshot {
    return {
      revision: this.revision,
      rows: this.doc.rows.map((row) =>
        buildRowView(row, this.analysis.byId.get(row.id)!, this.inbox.result(row.id))
      ),
      settings: this.currentSettings,
      viewport: this.viewport,
      view: this.graph && { viewport: this.viewport, size: this.graph.size, dpr: this.graph.dpr },
      geometry: this.inbox.geometry,
      focusedRowId: null,
      activeRowId: null,
      canUndo: this.doc.canUndo(),
      canRedo: this.doc.canRedo(),
      backendKind: this.deps.backend.kind,
    };
  }
}

function invalid(message: string): never {
  throw new KarmanCalculatorError("invalid-argument", message);
}
