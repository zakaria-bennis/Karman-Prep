// Conversions between the engine's stored rows and settings, the worker wire format (AR-45), the
// public expression states (API-2, API-4) and the whole state (API-5); settings for the constructor,
// setBlank and updateSettings (API-1, API-6, API-7). Package-internal.

import type { PixelSize, Viewport, ViewSpec } from "../../plot/viewport";
import { nextSlot } from "../../theme/roles";
import type { MainToWorker, WireRow, WireSettings } from "../../worker/protocol";
import type { StoredRow } from "./document";
import {
  DEFAULT_SETTINGS,
  type AxisSettings,
  type CalculatorOptions,
  type CalculatorSettings,
  type CalculatorStateV1,
  type ExpressionState,
  type SettingsUpdate,
} from "./types";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** AR-45: the rows of a `state` message; type "expression", columns null, sliderBounds or null. */
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
    sliderBounds: row.sliderBounds ? { ...row.sliderBounds } : null,
    logMode: row.logMode === true,
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

/** `base` with every field `state` sets; a new object, so `base` never changes. */
function mergeRow(base: StoredRow, state: ExpressionState): StoredRow {
  const merged: Mutable<StoredRow> = { ...base };
  if (state.latex !== undefined) merged.latex = state.latex;
  if (state.color !== undefined) merged.color = state.color;
  if (state.hidden !== undefined) merged.hidden = state.hidden;
  if (state.lineStyle !== undefined) merged.lineStyle = state.lineStyle;
  if (state.pointStyle !== undefined) merged.pointStyle = state.pointStyle;
  if (state.sliderBounds !== undefined) merged.sliderBounds = { ...state.sliderBounds };
  if (state.type === "expression") {
    delete merged.type;
    delete merged.columns;
  }
  if (state.type === "table") merged.type = "table";
  if (state.columns !== undefined) {
    merged.columns = state.columns.map((c) => ({
      latex: c.latex,
      values: [...c.values],
      color: c.color ?? base.color,
      hidden: c.hidden ?? false,
    }));
  }
  if (merged.type === "table") {
    merged.latex = "";
    merged.columns ??= [];
  }
  return merged;
}

/** A new row at `index`: latex "", colour nextSlot(index) (TH-10), shown. */
function newRow(id: string, index: number): StoredRow {
  return { id, latex: "", color: nextSlot(index), hidden: false };
}

/**
 * API-2: upserts `list` in order. An existing id merges, and its omitted fields keep their values;
 * a new id appends with `color ?? nextSlot(index)` (TH-10), `latex ?? ""` and `hidden ?? false`.
 * Never changes `rows`; every changed row is a new object.
 */
export function upsertRows(
  rows: readonly StoredRow[],
  list: readonly ExpressionState[]
): StoredRow[] {
  const out = [...rows];
  for (const state of list) {
    const at = out.findIndex((row) => row.id === state.id);
    if (at >= 0) out[at] = mergeRow(out[at], state);
    else out.push(mergeRow(newRow(state.id, out.length), state));
  }
  return out;
}

/**
 * API-5: the rows of a validated state, in order; a missing colour takes nextSlot(index), a
 * missing latex "" and a missing hidden false.
 */
export function rowsFromState(expressions: readonly ExpressionState[]): StoredRow[] {
  return expressions.map((state, index) => mergeRow(newRow(state.id, index), state));
}

/**
 * API-4: a deep copy of one row as an expression state, with the keys id, type, latex, color and
 * hidden, then lineStyle, pointStyle and sliderBounds where set.
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
  if (row.lineStyle !== undefined) state.lineStyle = row.lineStyle;
  if (row.pointStyle !== undefined) state.pointStyle = row.pointStyle;
  if (row.sliderBounds !== undefined) state.sliderBounds = { ...row.sliderBounds };
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
): CalculatorStateV1 {
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
