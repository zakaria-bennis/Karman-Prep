// Conversions between the engine's stored rows and settings, the worker wire format (AR-45) and
// the public expression states (API-2, API-4). Package-internal.

import { nextSlot } from "../../theme/roles";
import type { WireRow, WireSettings } from "../../worker/protocol";
import type { StoredRow } from "./document";
import type { CalculatorSettings, ExpressionState } from "./types";

/** AR-45: the rows of a `state` message; type "expression", columns null, sliderBounds or null. */
export function toWireRows(rows: readonly StoredRow[]): WireRow[] {
  return rows.map((row) => ({
    id: row.id,
    type: "expression",
    latex: row.latex,
    columns: null,
    hidden: row.hidden,
    sliderBounds: row.sliderBounds ? { ...row.sliderBounds } : null,
  }));
}

/** AR-45: the settings the worker computes with. */
export function toWireSettings(settings: CalculatorSettings): WireSettings {
  return { angleMode: settings.angleMode, complex: settings.complex };
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
    const base: StoredRow =
      at >= 0 ? out[at] : { id: state.id, latex: "", color: nextSlot(out.length), hidden: false };
    const merged: { -readonly [K in keyof StoredRow]: StoredRow[K] } = { ...base };
    if (state.latex !== undefined) merged.latex = state.latex;
    if (state.color !== undefined) merged.color = state.color;
    if (state.hidden !== undefined) merged.hidden = state.hidden;
    if (state.lineStyle !== undefined) merged.lineStyle = state.lineStyle;
    if (state.pointStyle !== undefined) merged.pointStyle = state.pointStyle;
    if (state.sliderBounds !== undefined) merged.sliderBounds = { ...state.sliderBounds };
    if (at >= 0) out[at] = merged;
    else out.push(merged);
  }
  return out;
}

/**
 * API-4: a deep copy of one row as an expression state, with the keys id, type, latex, color and
 * hidden, then lineStyle, pointStyle and sliderBounds where set.
 */
export function toExpressionState(row: StoredRow): ExpressionState {
  const state: ExpressionState = {
    id: row.id,
    type: "expression",
    latex: row.latex,
    color: row.color,
    hidden: row.hidden,
  };
  if (row.lineStyle !== undefined) state.lineStyle = row.lineStyle;
  if (row.pointStyle !== undefined) state.pointStyle = row.pointStyle;
  if (row.sliderBounds !== undefined) state.sliderBounds = { ...row.sliderBounds };
  return state;
}
