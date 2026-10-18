// The headless calculator engine (01-interfaces-runtime.md section 8; 07 Decision 14): the public
// API that KarmanCalculator forwards and the internal surface the React UI drives, as a facade over
// document.ts, state.ts, inbox.ts, results.ts, observers.ts, helper-expression.ts (API-10) and
// default-deps.ts (createEngine's defaults). No DOM, no React (AR-44).

import { clampViewport, defaultViewport, type Viewport, type ViewSpec } from "../../plot/viewport";
import { buildCompileScope } from "../../plot/from-analysis";
import { poiCurvesFor } from "../../poi/index";
import type { PoiCurve } from "../../poi/types";
import { nextSlot } from "../../theme/roles";
import type { ComputeBackend } from "../../worker/backend";
import { analyzeRows, type AnalysisResult } from "../analysis";
import type { Value } from "../eval/values";
import { MAX_ROW_CHARACTERS, MAX_ROWS } from "../latex";
import { defaultBackend, defaultRandomSeed, defaultScheduleFrame } from "./default-deps";
import {
  INITIAL_GRAPH_SIZE,
  RowDocument,
  sameRows,
  type HistoryStep,
  type StoredRow,
} from "./document";
import { KarmanCalculatorError } from "./errors";
import {
  emptiedTable,
  newTable,
  usedNames,
  withCell,
  withColumnStyle,
  withHeader,
  withoutColumn,
  withoutTableRow,
} from "./table-edits";
import { HelperRegistry, type HelperExpression } from "./helper-expression";
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
    onHelperValue: (jobId, value) => this.helpers.receive(jobId, value),
  });
  private readonly helpers = new HelperRegistry({
    post: (message) => this.deps.backend.post(message),
    generation: () => this.generation,
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
  /** KB-4's DOM-focused row and API-12's active row (OI-10); neither is an undo step. */
  private focusedRowId: string | null = null;
  private activeRowId: string | null = null;
  /** POI-17: the selected row; set by focus, activation and curve clicks; not an undo step. */
  private selectedRowId: string | null = null;
  private destroyed = false;

  /** Validates the options (API-1) before anything is posted, then resets as setBlank() does. */
  constructor(options: CalculatorOptions | undefined, deps: EngineDeps) {
    this.options = validateOptions(options);
    this.deps = deps;
    this.observers = new EngineObservers(deps.scheduleFrame, () => this.revision);
    deps.backend.onMessage((message) => {
      if (this.destroyed || !this.inbox.receive(message)) return; // API-13, Decision 3
      this.snapshot = null; // subscribers see an accepted result in the next frame (Decision 13)
      this.observers.workerChanged(message.type);
    });
    this.resetDocument(settingsFromOptions(this.options), false);
  }

  // ── public API (API-2 to API-13); after destroy() every member throws "destroyed" (live()) ──

  /** API-2: upserts one row by id; a new row takes nextSlot(rowIndex) (TH-10). */
  setExpression(state: ExpressionState): void {
    this.live().upsert("setExpression", [validateExpressionState(state)]);
  }

  /** API-2: upserts several rows as one undo step; every state is validated before any change. */
  setExpressions(list: ExpressionState[]): void {
    this.live();
    if (!Array.isArray(list)) invalid("setExpressions: list must be an array");
    const states = list.map((state) => validateExpressionState(state));
    this.upsert("setExpressions", states);
  }

  /** API-4: deletes rows as one undo step; unknown ids change nothing; one empty row stays. */
  removeExpression(ref: { id: string }): void {
    this.removeExpressions([ref]);
  }
  removeExpressions(list: { id: string }[]): void {
    this.live();
    const ids = new Set(validateRowRefs(list).map((ref) => ref.id));
    const rows = this.doc.rows.filter((row) => !ids.has(row.id));
    this.commitRows(rows, STEP);
  }

  /** API-4: deep copies of the rows in list order. */
  getExpressions(): ExpressionState[] {
    return this.live().doc.rows.map((row) => toExpressionState(row));
  }

  /** API-5: versioned JSON made of copies, so changing it changes nothing here. */
  getState(): CalculatorStateV1 {
    return buildState(this.live().doc.rows, this.currentSettings, this.viewport);
  }

  /**
   * API-5: validates everything first, then applies the rows (one undo step with allowUndo, else
   * history cleared), the settings and clampViewport(viewport) (Decision 11).
   */
  setState(state: CalculatorStateV1, options?: { allowUndo?: boolean }): void {
    this.live();
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
    this.postState(moved);
    this.changed();
  }

  /** API-6, Decision 8: the default rows, settings (blankSettings) and viewport; see resetDocument. */
  setBlank(options?: { allowUndo?: boolean }): void {
    this.live();
    this.resetDocument(blankSettings(this.currentSettings), validateAllowUndo(options, "setBlank"));
    this.revision++;
    this.changed();
  }

  /** API-7: finite bounds with left < right and bottom < top, stored as clampViewport(bounds). */
  setMathBounds(bounds: Viewport): void {
    this.live();
    const viewport = clampViewport(validateBounds(bounds));
    if (!sameViewport(viewport, this.viewport)) this.moveViewport(viewport);
  }

  /** API-7: validates first; only angleMode and complex re-analyse and post state (NM-29). */
  updateSettings(partial: SettingsUpdate): void {
    const before = this.live().currentSettings;
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
    return this.live().currentSettings;
  }

  /** API-14's scientific mode ships in Phase 2; until then validation keeps the mode "graphing". */
  get mode(): "graphing" {
    this.live();
    return "graphing";
  }

  /** API-8: `callback` runs once a frame after the named value changes; returns an unsubscribe. */
  observe(name: ObservableName, callback: () => void): () => void {
    return this.live().observers.observe(name, callback);
  }
  unobserve(name: ObservableName, callback?: () => void): void {
    this.live().observers.unobserve(name, callback);
  }

  /** API-8: once a frame after commits, with the revision and isUserInitiated (Decision 10). */
  observeEvent(name: "change", callback: (event: ChangeEvent) => void): () => void {
    return this.live().observers.observeEvent(name, callback);
  }
  unobserveEvent(name: "change", callback?: (event: ChangeEvent) => void): void {
    this.live().observers.unobserveEvent(name, callback);
  }

  /** API-10: evaluated by the backend with the rows' definitions; adds no row. */
  HelperExpression(spec: { latex: string }): HelperExpression {
    return this.live().helpers.create(spec);
  }

  /** API-9: built once per snapshot, so the same object until the snapshot changes (results.ts). */
  get expressionAnalysis(): Readonly<Record<string, ExpressionAnalysis>> {
    return snapshotAnalysis(this.live().getSnapshot(), this.analysis);
  }

  /** API-8: the viewport and the graph's size (INITIAL_GRAPH_SIZE before its first setView). */
  get graphpaperBounds(): GraphpaperBounds {
    const { width, height } = this.live().graph?.size ?? INITIAL_GRAPH_SIZE;
    return { mathCoordinates: { ...this.viewport }, pixelCoordinates: { width, height } };
  }

  /** API-11: one history stack shared by the API, the toolbar and the KB- shortcuts. */
  undo(): void {
    if (this.live().doc.undo()) this.afterCommit();
  }
  redo(): void {
    if (this.live().doc.redo()) this.afterCommit();
  }
  clearHistory(): void {
    const had = this.live().doc.canUndo() || this.doc.canRedo();
    this.doc.clearHistory();
    if (had) this.changed();
  }
  canUndo(): boolean {
    return this.live().doc.canUndo();
  }
  canRedo(): boolean {
    return this.live().doc.canRedo();
  }

  /**
   * API-12, OI-10: each makes a row the active row and fires focusedExpression. KarmanCalculator's
   * versions also focus the row's MathField (focus*) or keep DOM focus out of it (activate*).
   */
  focusExpression(id: string): void {
    this.live().activate(id, "focusExpression");
  }
  focusFirstExpression(): void {
    this.live().activate(this.doc.rows[0].id, "focusFirstExpression");
  }
  activateExpression(id: string): void {
    this.live().activate(id, "activateExpression");
  }

  /** API-8: the active row's id (OI-10); null when no row is active. */
  get focusedExpression(): string | null {
    return this.live().activeRowId;
  }

  /** API-13: idempotent. Stops the helpers, observers and backend; getSnapshot keeps the last one. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.helpers.dispose();
    this.observers.dispose();
    this.deps.backend.dispose();
  }

  // ── internal UI surface (not forwarded by KarmanCalculator); its mutators no-op after destroy ──

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
   * id and nextSlot(its index) (Decision 7); refused with "row-limit" at MAX_ROWS (NM-42) and,
   * as nothing is inserted, after destroy().
   */
  insertRowAfter(afterId: string | null): { id: string } | EditRefusal {
    const rows = this.doc.rows;
    if (this.destroyed || rows.length >= MAX_ROWS) return "row-limit";
    const after = afterId === null ? -1 : rows.findIndex((r) => r.id === afterId);
    const index = after < 0 ? rows.length : after + 1;
    const color = nextSlot(index);
    const row: StoredRow = { id: this.doc.nextId(), latex: "", color, hidden: false };
    this.commitRows([...rows.slice(0, index), row, ...rows.slice(index)], STEP, true);
    return { id: row.id };
  }

  /** D-5, S-12: a new table after `afterId` (at the end for null), named by D-4. */
  insertTableAfter(afterId: string | null): { id: string } | EditRefusal {
    const rows = this.doc.rows;
    if (this.destroyed || rows.length >= MAX_ROWS) return "row-limit";
    const after = afterId === null ? -1 : rows.findIndex((r) => r.id === afterId);
    const index = after < 0 ? rows.length : after + 1;
    const table = newTable(this.doc.nextId(), index, usedNames(rows, this.analysis));
    this.commitRows([...rows.slice(0, index), table, ...rows.slice(index)], STEP, true);
    return { id: table.id };
  }

  /** D-5, S-12: an empty expression row becomes a table in place; any other row gets one after it. */
  replaceWithTable(rowId: string): { id: string } | EditRefusal {
    const rows = this.doc.rows,
      at = rows.findIndex((r) => r.id === rowId);
    const row = rows[at];
    if (row === undefined || row.type === "table" || row.latex !== "")
      return this.insertTableAfter(rowId);
    if (this.destroyed) return "row-limit";
    const table = newTable(row.id, at, usedNames(rows, this.analysis));
    this.commitRows(
      rows.map((r) => (r.id === rowId ? table : r)),
      STEP,
      true
    );
    return { id: rowId };
  }

  /** D-6, D-8, D-20: one cell's LaTeX; typing coalesces per table (KB-2). */
  editCell(
    rowId: string,
    column: number,
    r: number,
    latex: string,
    source: EditSource
  ): EditRefusal | null {
    return this.editTable(rowId, source, (row) => withCell(row, column, r, latex));
  }

  /** D-9, D-10, D-20: one header's LaTeX; the column after the last adds a column. */
  editHeader(rowId: string, column: number, latex: string, source: EditSource): EditRefusal | null {
    return this.editTable(rowId, source, (row) => withHeader(row, column, latex));
  }

  /** D-8: data row `r` of a table removed, one undo step. */
  deleteTableRow(rowId: string, r: number): void {
    this.editTable(rowId, "api", (row) => withoutTableRow(row, r));
  }

  /** D-9: a later column deleted with its data, one undo step. */
  deleteTableColumn(rowId: string, column: number): void {
    this.editTable(rowId, "api", (row) => withoutColumn(row, column));
  }

  /** D-12: a column's style, one undo step. */
  setColumnStyle(
    rowId: string,
    column: number,
    style: Parameters<typeof withColumnStyle>[2]
  ): void {
    this.editTable(rowId, "api", (row) => withColumnStyle(row, column, style));
  }

  /** R-9: deletes a row as one step; the last remaining row is never deleted, only emptied. */
  deleteRow(id: string): void {
    const rows = this.doc.rows;
    const target = rows.find((r) => r.id === id);
    if (target?.type === "table") {
      const emptied = emptiedTable(target); // appendix F 32
      this.commitRows(
        rows.map((r) => (r.id === id ? emptied : r)),
        STEP,
        true
      );
      return;
    }
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
    const graph = this.destroyed ? null : acceptView(this.graph, this.viewport, view);
    if (graph === null) return;
    this.graph = graph;
    this.moveViewport({ ...view.viewport }, true);
  }

  /** KB-4: the DOM-focused row (null when none), which also becomes active; ends the KB-2 group. */
  setFocusedRow(id: string | null): void {
    this.doc.endGroup();
    this.setFocus(id, id ?? this.activeRowId);
    if (id !== null) this.setSelectedRow(id);
  }

  /**
   * POI-14: row `id`'s curves compiled on the main thread from the latest analysis and the latest
   * accepted values, for tracing; none for a row that is not graphable.
   */
  poiCurves(id: string): PoiCurve[] {
    const row = this.analysis.byId.get(id);
    if (row === undefined || !row.isGraphable) return [];
    const values = new Map<string, Value>();
    for (const r of this.doc.rows) {
      const value = this.inbox.result(r.id).value;
      if (value !== null) values.set(r.id, value);
    }
    const scope = buildCompileScope(this.analysis, values, toWireSettings(this.currentSettings));
    return poiCurvesFor(row, scope);
  }

  /** POI-1, POI-17: the selected row (null for none); posts `select` when it changes. */
  setSelectedRow(id: string | null): void {
    const next = id !== null && this.doc.rows.some((r) => r.id === id) ? id : null;
    if (this.destroyed || next === this.selectedRowId) return;
    this.selectedRowId = next;
    this.deps.backend.post({ v: 1, type: "select", rowId: next });
    this.changed();
  }

  // ── commit pipeline ──

  /** API-13: this engine, or the "destroyed" error once destroy() has run. */
  private live(): this {
    if (this.destroyed) throw new KarmanCalculatorError("destroyed", "the calculator is destroyed");
    return this;
  }

  /** API-12, API-13: makes row `id` active; an unknown id throws invalid-argument. */
  private activate(id: string, method: string): void {
    if (!this.doc.rows.some((r) => r.id === id)) invalid(`${method}: no row has id ${String(id)}`);
    this.setFocus(this.focusedRowId, id);
    this.setSelectedRow(id);
  }

  /** Stores the focused and active rows; focusedExpression fires when the active row changes. */
  private setFocus(focused: string | null, active: string | null): void {
    if (this.destroyed || (focused === this.focusedRowId && active === this.activeRowId)) return;
    if (active !== this.activeRowId) this.observers.markDirty("focusedExpression");
    [this.focusedRowId, this.activeRowId] = [focused, active];
    this.changed();
  }

  /**
   * API-6, Decision 8: row "1" alone (history cleared, or one undo step with allowUndo), `settings`
   * and the default viewport, with every worker result forgotten; then hello with the reset seed
   * (API-1), state, view once sized, and a new job for each live helper.
   */
  private resetDocument(settings: CalculatorSettings, allowUndo: boolean): void {
    if (this.selectedRowId !== null) {
      this.selectedRowId = null; // POI-17: setBlank clears the selection
      this.deps.backend.post({ v: 1, type: "select", rowId: null });
    }
    if (!allowUndo) this.doc.reset();
    else if (!sameRows(BLANK_ROWS, this.doc.rows)) this.doc.commit(BLANK_ROWS, STEP);
    this.storeSettings(settings);
    this.viewport = Object.freeze(defaultViewport(this.graph?.size ?? INITIAL_GRAPH_SIZE));
    this.analyze();
    const seed = this.options.seed ?? this.deps.randomSeed();
    this.deps.backend.post({ v: 1, type: "hello", seed });
    this.inbox.reset();
    this.postState(true);
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

  /** The rows with row `id` replaced by a changed copy; every other row keeps its object. */
  private withRow(id: string, change: Partial<StoredRow>): StoredRow[] {
    return this.doc.rows.map((row) => (row.id === id ? { ...row, ...change } : row));
  }

  /** Applies a table edit as one step, or as a KB-2 typing group for "typing" and "keypad". */
  private editTable(
    rowId: string,
    source: EditSource,
    edit: (row: StoredRow) => StoredRow | EditRefusal
  ): EditRefusal | null {
    const row = this.doc.rows.find((r) => r.id === rowId);
    if (row === undefined || row.type !== "table") return null;
    const next = edit(row);
    if (typeof next === "string") return next;
    const step: HistoryStep =
      source === "typing" || source === "keypad"
        ? { kind: "group", rowId, at: this.deps.now() }
        : STEP;
    this.commitRows(
      this.doc.rows.map((r) => (r.id === rowId ? next : r)),
      step,
      true
    );
    return null;
  }

  /** Commits `rows` unless they equal the current list or the engine is destroyed. */
  private commitRows(rows: readonly StoredRow[], step: HistoryStep, userInitiated = false): void {
    if (this.destroyed || sameRows(rows, this.doc.rows)) return;
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

  /** AR-51: analyses on the main thread; a focused or active row that left the list is dropped. */
  private analyze(): void {
    const sources = this.doc.rows.map(({ id, latex, hidden, type, columns }) =>
      type === "table" ? { id, latex, hidden, columns: columns ?? [] } : { id, latex, hidden }
    );
    this.analysis = analyzeRows(sources, toWireSettings(this.currentSettings));
    this.observers.markDirty("expressionAnalysis");
    const kept = (id: string | null) => (id !== null && this.analysis.byId.has(id) ? id : null);
    if (kept(this.activeRowId) !== this.activeRowId) this.observers.markDirty("focusedExpression");
    [this.focusedRowId, this.activeRowId] = [kept(this.focusedRowId), kept(this.activeRowId)];
    if (this.selectedRowId !== null && kept(this.selectedRowId) === null) {
      this.selectedRowId = null;
      this.deps.backend.post({ v: 1, type: "select", rowId: null });
    }
  }

  /** AR-45, AR-46: posts state (then view when asked) and re-issues every live helper (API-6). */
  private postState(withView = false): void {
    this.generation++;
    this.deps.backend.post(stateMessage(this.generation, this.doc.rows, this.currentSettings));
    this.inbox.noteState(this.generation, sentRows(this.doc.rows, this.analysis));
    if (withView) this.postView();
    this.helpers.reissue();
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
      focusedRowId: this.focusedRowId,
      activeRowId: this.activeRowId,
      selectedRowId: this.selectedRowId,
      poi: this.inbox.poi?.rowId === this.selectedRowId ? this.inbox.poi : null,
      canUndo: this.doc.canUndo(),
      canRedo: this.doc.canRedo(),
      backendKind: this.deps.backend.kind,
    };
  }
}

function invalid(message: string): never {
  throw new KarmanCalculatorError("invalid-argument", message);
}

/** API-1: validates the options before creating anything, then fills in the default deps. */
export function createEngine(
  options?: CalculatorOptions,
  deps?: Partial<EngineDeps>
): CalculatorEngine {
  validateOptions(options);
  return new CalculatorEngine(options, {
    backend: deps?.backend ?? defaultBackend(),
    scheduleFrame: deps?.scheduleFrame ?? defaultScheduleFrame,
    now: deps?.now ?? (() => performance.now()),
    randomSeed: deps?.randomSeed ?? defaultRandomSeed,
  });
}
