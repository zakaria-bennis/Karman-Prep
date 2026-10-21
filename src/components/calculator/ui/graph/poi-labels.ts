// Coordinate labels (POI-TRACE-12 to POI-TRACE-16): which of the selected row's points show their
// label. Any number can be open at once; one more shows while the mouse hovers a dot. Labels belong
// to one selection and one engine revision: a press anywhere but on a dot, a curve or a label
// closes them, and so does a change of selection or any recompute (zoom, pan, an edit). Escape
// leaves them open, as Desmos's does (owner decision, 2026-10-21). The selection and revision are
// read at render (liveLabels), never synced by effects, so key spam schedules no label updates.

import type { PoiPoint } from "@/lib/calculator/poi/types";

export type LabelPoint = Pick<PoiPoint, "x" | "y">;
export interface LabelState {
  rowId: string | null;
  revision: number; // the engine revision the labels were opened at
  open: readonly LabelPoint[];
  hover: LabelPoint | null; // POI-TRACE-12: shown while the mouse is within reach of the dot
}
/** The selection and engine revision an event happened at. */
export interface LabelContext {
  rowId: string;
  revision: number;
}
export type LabelEvent =
  | ({ type: "toggle"; point: LabelPoint } & LabelContext) // POI-TRACE-13: a press on a dot
  | ({ type: "hover"; point: LabelPoint | null } & LabelContext)
  | { type: "close" } // POI-TRACE-14: a press elsewhere
  | ({ type: "show"; point: LabelPoint } & LabelContext); // KB-14: only this point's label

export const NO_LABELS: LabelState = Object.freeze({
  rowId: null,
  revision: -1,
  open: Object.freeze([]),
  hover: null,
});

export const samePoint = (a: LabelPoint, b: LabelPoint): boolean =>
  Math.abs(a.x - b.x) <= 1e-9 * Math.max(1, Math.abs(a.x)) &&
  Math.abs(a.y - b.y) <= 1e-9 * Math.max(1, Math.abs(a.y));

const closed = (rowId: string | null, revision: number): LabelState =>
  rowId === null ? NO_LABELS : { rowId, revision, open: [], hover: null };

/** `state` when it belongs to `at`, else no labels for `at`. */
const within = (state: LabelState, at: LabelContext): LabelState =>
  state.rowId === at.rowId && state.revision === at.revision
    ? state
    : closed(at.rowId, at.revision);

export function reduceLabels(state: LabelState, event: LabelEvent): LabelState {
  switch (event.type) {
    case "toggle": {
      const base = within(state, event);
      const open = base.open.some((p) => samePoint(p, event.point))
        ? base.open.filter((p) => !samePoint(p, event.point))
        : [...base.open, event.point];
      return { rowId: event.rowId, revision: event.revision, open, hover: null };
    }
    case "hover": {
      const base = within(state, event);
      const same =
        event.point === null
          ? base.hover === null
          : base.hover !== null && samePoint(base.hover, event.point);
      return same && base === state ? state : { ...base, hover: event.point };
    }
    case "close":
      return state.open.length === 0 && state.hover === null
        ? state
        : closed(state.rowId, state.revision);
    case "show":
      return { rowId: event.rowId, revision: event.revision, open: [event.point], hover: null };
  }
}

/**
 * The labels to show for the engine's selection, revision and the selected row's points: none
 * after a change of selection or a recompute (POI-TRACE-15), and a label whose point is gone
 * closes.
 */
export function liveLabels(
  state: LabelState,
  rowId: string | null,
  revision: number,
  points: readonly LabelPoint[]
): LabelState {
  if (rowId === null) return NO_LABELS;
  if (state.rowId !== rowId || state.revision !== revision) return closed(rowId, revision);
  const live = (p: LabelPoint) => points.some((q) => samePoint(p, q));
  const open = state.open.filter(live);
  const hover = state.hover !== null && live(state.hover) ? state.hover : null;
  return open.length === state.open.length && hover === state.hover
    ? state
    : { rowId, revision, open, hover };
}
