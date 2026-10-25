// Conversions between the engine's stored rows and settings, the worker wire format (AR-45), the
// public expression states (API-2, API-4) and the whole state (API-5); settings for the constructor,
// setBlank and updateSettings (API-1, API-6, API-7). Package-internal.

import type { PixelSize, Viewport, ViewSpec } from "../../plot/viewport";
import { nextSlot } from "../../theme/roles";
import {
  savedSlider,
  sameSlider,
  sliderFromBounds,
  sliderFromSaved,
  DEFAULT_SLIDER,
} from "../../sliders/model";
import type { MainToWorker, WireRow, WireSettings } from "../../worker/protocol";
import type { StoredRow, StoredTableRegression } from "./document";
import {
  DEFAULT_SETTINGS,
  type AxisSettings,
  type CalculatorOptions,
  type CalculatorSettings,
  type CalculatorState,
  type ExpressionState,
  type SettingsUpdate,
  type TableRegressionState,
} from "./types";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * AR-45: the rows of a `state` message; type "expression", columns null, sliderBounds null (slider
 * rows already hold their shown value, SLIDERS-22).
 */
export function toWireRows(rows: readonly StoredRow[]): WireRow[] {
  return rows.map((row) => ({
    id: row.id,
    type: row.type === "table" ? "table" : "expression",
    latex: row.latex,
    columns:
      row.type === "table"
        ? (row.columns ?? []).map((c) => ({
            latex: c.latex,
            values: [...c.values],
            hidden: c.hidden,
          }))
        : null,
    hidden: row.hidden,
    sliderBounds: null,
    logMode: row.logMode === true,
    ...(row.type === "table" && row.regression !== undefined
      ? { regression: { ...row.regression } }
      : {}),
  }));
}

/** AR-45: the settings the worker computes with. */
export function toWireSettings(settings: CalculatorSettings): WireSettings {
  return { angleMode: settings.angleMode, complex: settings.complex };
}

/** AR-45, AR-46: a versioned plain `state` message. */
export function stateMessage(
  generation: number,
  rows: readonly StoredRow[],
  settings: CalculatorSettings
): MainToWorker {
  const wire = toWireSettings(settings);
  return { v: 1, type: "state", generation, rows: toWireRows(rows), settings: wire, sliders: {} };
}

/** AR-45, AR-46: a versioned plain `view` message carrying copies of the viewport and size. */
export function viewMessage(
  generation: number,
  viewport: Viewport,
  size: PixelSize,
  dpr: number
): MainToWorker {
  return { v: 1, type: "view", generation, viewport: { ...viewport }, size: { ...size }, dpr };
}

/** RT-2: the next colour of the running counter, taken once per new row, column or regression. */
export type TakeColour = () => string;

/**
 * `base` with every field `state` sets; a new object, so `base` never changes. A column without a
 * colour keeps the colour of the column it replaces, else takes the next one (RT-2).
 */
function mergeRow(base: StoredRow, state: ExpressionState, take: TakeColour): StoredRow {
  const merged: Mutable<StoredRow> = { ...base };
  if (state.latex !== undefined) merged.latex = state.latex;
  if (state.color !== undefined) merged.color = state.color;
  if (state.hidden !== undefined) merged.hidden = state.hidden;
  if (state.displayEvaluationAsFraction === true)
    merged.fraction = true; // R-5
  else if (state.displayEvaluationAsFraction === false) delete merged.fraction;
  if (state.lineStyle !== undefined) merged.lineStyle = state.lineStyle;
  if (state.pointStyle !== undefined) merged.pointStyle = state.pointStyle;
  // SLIDERS-11: `slider` replaces the settings; the older `sliderBounds` sets hard limits on top.
  if (state.slider !== undefined || state.sliderBounds !== undefined) {
    const saved = state.slider ?? savedSlider(base.slider ?? DEFAULT_SLIDER) ?? {};
    const bounds = state.sliderBounds === undefined ? {} : sliderFromBounds(state.sliderBounds);
    const settings = sliderFromSaved({ ...saved, ...bounds });
    if (sameSlider(settings, DEFAULT_SLIDER)) delete merged.slider;
    else merged.slider = settings;
  }
  if (state.type === "expression") {
    delete merged.type;
    delete merged.columns;
  }
  if (state.type === "table") merged.type = "table";
  if (state.columns !== undefined) {
    merged.columns = state.columns.map((c, j) => ({
      latex: c.latex,
      values: [...c.values],
      color: c.color ?? base.columns?.[j]?.color ?? take(),
      hidden: c.hidden ?? false,
    }));
  }
  if (merged.type === "table") merged.blankColor ??= take(); // RT-2: the blank header slot
  if (state.regression !== undefined)
    merged.regression = fromRegressionState(state.regression, base, take);
  if (merged.type === "table") {
    merged.latex = "";
    merged.columns ??= [];
  } else {
    delete merged.regression;
    delete merged.blankColor;
  }
  return merged;
}

/** RT-28: a stored table regression from its public state. */
function fromRegressionState(
  state: TableRegressionState,
  base: StoredRow,
  take: TakeColour
): StoredTableRegression {
  const out: Mutable<StoredTableRegression> = {
    type: state.type,
    y: state.columns.y,
    color: state.color ?? base.regression?.color ?? take(),
    hidden: state.hidden ?? false,
    logMode: state.isLogMode ?? false,
  };
  if (state.lineStyle !== undefined) out.lineStyle = state.lineStyle;
  if (state.residualVariable !== undefined) out.residual = state.residualVariable;
  return out;
}

/**
 * A new row for `state`: latex "", shown, its own colour or the next one (RT-2). A table takes no
 * row colour, as its columns and regression carry their own; it keeps "c1" as a placeholder.
 */
function newRow(id: string, state: ExpressionState, take: TakeColour): StoredRow {
  const color = state.color ?? (state.type === "table" ? "c1" : take());
  return { id, latex: "", color, hidden: false };
}

/** TH-10: the colour of a row at `index` when no running counter is given. */
function slotTaker(start: number): TakeColour {
  let i = start;
  return () => nextSlot(i++);
}

/**
 * API-2: upserts `list` in order. An existing id merges, and its omitted fields keep their values;
 * a new id appends with `color ?? take()` (RT-2; by default the TH-10 slot of its index),
 * `latex ?? ""` and `hidden ?? false`. Never changes `rows`; every changed row is a new object.
 */
export function upsertRows(
  rows: readonly StoredRow[],
  list: readonly ExpressionState[],
  take: TakeColour = slotTaker(rows.length)
): StoredRow[] {
  // Desmos's API has no rows once every row is removed, so rows set next start the list: the empty
  // row standing in for it gives way (live 2026-10-25: removing all, then setting ids 1, 2 and 3,
  // lists 1, 2, 3; here the stand-in took id 2 and kept the top).
  const lone = rows.length === 1 ? rows[0] : null;
  const standIn = lone?.placeholder === true && lone.latex === "" && lone.type === undefined;
  const out = standIn && list.length > 0 ? [] : [...rows];
  for (const state of list) {
    const at = out.findIndex((row) => row.id === state.id);
    if (at >= 0) out[at] = mergeRow(out[at], state, take);
    else out.push(mergeRow(newRow(state.id, state, take), state, take));
  }
  return out;
}

/**
 * API-5: the rows of a validated state, in order; a missing colour takes `take()` (RT-2: the
 * counter restarts at red for a new state), a missing latex "" and a missing hidden false.
 */
export function rowsFromState(
  expressions: readonly ExpressionState[],
  take: TakeColour = slotTaker(0)
): StoredRow[] {
  return expressions.map((state) => mergeRow(newRow(state.id, state, take), state, take));
}

/**
 * API-4: a deep copy of one row as an expression state, with the keys id, type, latex, color and
 * hidden, then lineStyle, pointStyle, displayEvaluationAsFraction (R-5) and slider (SLIDERS-11)
 * where set.
 */
export function toExpressionState(row: StoredRow): ExpressionState {
  const state: ExpressionState = {
    id: row.id,
    type: row.type === "table" ? "table" : "expression",
    latex: row.latex,
    color: row.color,
    hidden: row.hidden,
  };
  if (row.type === "table") {
    state.columns = (row.columns ?? []).map((c) => ({
      latex: c.latex,
      values: [...c.values],
      color: c.color,
      hidden: c.hidden,
    }));
  }
  if (row.type === "table" && row.regression !== undefined) {
    const r = row.regression;
    state.regression = {
      type: r.type,
      columns: { x: 0, y: r.y },
      color: r.color,
      hidden: r.hidden,
      isLogMode: r.logMode,
    };
    if (r.lineStyle !== undefined) state.regression.lineStyle = r.lineStyle;
    if (r.residual !== undefined) state.regression.residualVariable = r.residual;
  }
  if (row.lineStyle !== undefined) state.lineStyle = row.lineStyle;
  if (row.pointStyle !== undefined) state.pointStyle = row.pointStyle;
  if (row.fraction === true) state.displayEvaluationAsFraction = true; // R-5, as Desmos saves it
  const slider = row.slider === undefined ? undefined : savedSlider(row.slider);
  if (slider !== undefined) state.slider = slider;
  return state;
}

/** A frozen copy with frozen copies of both axes, so the engine can hand it out unchanged. */
function freezeSettings(settings: CalculatorSettings): CalculatorSettings {
  return Object.freeze({
    ...settings,
    xAxis: Object.freeze({ ...settings.xAxis }),
    yAxis: Object.freeze({ ...settings.yAxis }),
  });
}

/** API-1: DEFAULT_SETTINGS (S-9) with every setting the options give. */
export function settingsFromOptions(options: CalculatorOptions): CalculatorSettings {
  const d = DEFAULT_SETTINGS;
  return freezeSettings({
    ...d,
    angleMode: options.angleMode ?? d.angleMode,
    keypad: options.keypad ?? d.keypad,
    expressionsCollapsed: options.expressionsCollapsed ?? d.expressionsCollapsed,
    reducedMotion: options.reducedMotion ?? d.reducedMotion,
    displaySize: options.displaySize ?? d.displaySize,
    reverseContrast: options.reverseContrast ?? d.reverseContrast,
    mode: options.mode ?? d.mode,
  });
}

/** API-6, Decision 8: DEFAULT_SETTINGS keeping only the current displaySize and reverseContrast. */
export function blankSettings(current: CalculatorSettings): CalculatorSettings {
  return freezeSettings({
    ...DEFAULT_SETTINGS,
    displaySize: current.displaySize,
    reverseContrast: current.reverseContrast,
  });
}

/** Equal settings values: the same primitive, or two axes with equal fields. */
function sameSetting(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const x = a as AxisSettings,
    y = b as AxisSettings;
  return x.show === y.show && x.label === y.label && x.step === y.step;
}

/**
 * API-7: `current` with a validated update applied. When no value differs, `settings` is `current`
 * itself; `wireChanged` is true when angleMode or complex changed, the settings the worker reads.
 */
export function mergeSettings(
  current: CalculatorSettings,
  update: SettingsUpdate
): { settings: CalculatorSettings; wireChanged: boolean } {
  const changes = Object.entries(update).filter(
    ([key, value]) =>
      value !== undefined && !sameSetting(current[key as keyof CalculatorSettings], value)
  );
  if (changes.length === 0) return { settings: current, wireChanged: false };
  const settings = freezeSettings({ ...current, ...Object.fromEntries(changes) });
  const wireChanged =
    settings.angleMode !== current.angleMode || settings.complex !== current.complex;
  return { settings, wireChanged };
}

/**
 * API-5: versioned JSON with the keys version, mode, settings, viewport, expressions and
 * scientific, in that order; every part is a copy. `scientific` stays empty until API-14.
 */
export function buildState(
  rows: readonly StoredRow[],
  settings: CalculatorSettings,
  viewport: Viewport
): CalculatorState {
  return {
    version: 1,
    mode: "graphing",
    settings: { ...settings, xAxis: { ...settings.xAxis }, yAxis: { ...settings.yAxis } },
    viewport: {
      left: viewport.left,
      right: viewport.right,
      bottom: viewport.bottom,
      top: viewport.top,
    },
    expressions: rows.map((row) => toExpressionState(row)),
    scientific: {},
  };
}

/** True when both viewports have the same four bounds. */
export function sameViewport(a: Viewport, b: Viewport): boolean {
  return a.left === b.left && a.right === b.right && a.bottom === b.bottom && a.top === b.top;
}

const positive = (n: number): boolean => Number.isFinite(n) && n > 0;

/** The graph's size and dpr, as setView last accepted them. */
export type GraphSize = Omit<ViewSpec, "viewport">;

/**
 * Decision 9: the size and dpr setView keeps for `view`, given the current `graph` and `viewport`.
 * Null when the view is ignored: a side or the dpr not finite and positive (so a 0 side), a
 * viewport not finite with left < right and bottom < top, or nothing changed. `graph` itself when
 * only the viewport changed.
 */
export function acceptView(
  graph: GraphSize | null,
  viewport: Viewport,
  view: ViewSpec
): GraphSize | null {
  const { viewport: v, size, dpr } = view;
  const usable =
    positive(size.width) &&
    positive(size.height) &&
    positive(dpr) &&
    [v.left, v.right, v.bottom, v.top].every((n) => Number.isFinite(n)) &&
    v.left < v.right &&
    v.bottom < v.top;
  if (!usable) return null;
  const { width, height } = size;
  if (graph?.dpr !== dpr || graph.size.width !== width || graph.size.height !== height) {
    return Object.freeze({ size: Object.freeze({ width, height }), dpr });
  }
  return sameViewport(v, viewport) ? null : graph;
}
