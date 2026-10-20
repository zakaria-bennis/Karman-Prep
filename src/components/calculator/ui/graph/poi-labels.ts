// Coordinate labels (POI-TRACE-12 to POI-TRACE-16): which of the selected row's points show their
// label. Any number can be open at once; one more shows while the mouse hovers a dot. Labels belong
// to one selection; a press anywhere but on a dot, a curve or a label closes them, and so does any
// recompute (zoom, pan, an edit). Escape closes them too (Karman addition for keyboard users:
// Desmos leaves them until the next press).

import type { PoiPoint } from "@/lib/calculator/poi/types";

export type LabelPoint = Pick<PoiPoint, "x" | "y">;
export interface LabelState {
  rowId: string | null;
  open: readonly LabelPoint[];
  hover: LabelPoint | null; // POI-TRACE-12: shown while the mouse is within reach of the dot
}
export type LabelEvent =
  | { type: "toggle"; rowId: string; point: LabelPoint } // POI-TRACE-13: a press on a dot
  | { type: "hover"; point: LabelPoint | null }
  | { type: "close" } // POI-TRACE-14, POI-TRACE-15: a press elsewhere, a recompute, Escape
  | { type: "show"; rowId: string; point: LabelPoint } // KB-14: only this point's label
  | { type: "selection"; rowId: string | null } // the engine's selectedRowId
  | { type: "poi-updated"; rowId: string; points: readonly LabelPoint[] };

export const NO_LABELS: LabelState = Object.freeze({
  rowId: null,
  open: Object.freeze([]),
  hover: null,
});

export const samePoint = (a: LabelPoint, b: LabelPoint): boolean =>
  Math.abs(a.x - b.x) <= 1e-9 * Math.max(1, Math.abs(a.x)) &&
  Math.abs(a.y - b.y) <= 1e-9 * Math.max(1, Math.abs(a.y));

const closed = (rowId: string | null): LabelState =>
  rowId === null ? NO_LABELS : { rowId, open: [], hover: null };

export function reduceLabels(state: LabelState, event: LabelEvent): LabelState {
  switch (event.type) {
    case "toggle": {
      const base = event.rowId === state.rowId ? state : closed(event.rowId);
      const open = base.open.some((p) => samePoint(p, event.point))
        ? base.open.filter((p) => !samePoint(p, event.point))
        : [...base.open, event.point];
      return { rowId: event.rowId, open, hover: null };
    }
    case "hover": {
      const same =
        event.point === null
          ? state.hover === null
          : state.hover !== null && samePoint(state.hover, event.point);
      return same ? state : { ...state, hover: event.point };
    }
    case "close":
      return state.open.length === 0 && state.hover === null ? state : closed(state.rowId);
    case "show":
      return { rowId: event.rowId, open: [event.point], hover: null };
    case "selection":
      return event.rowId === state.rowId ? state : closed(event.rowId);
    case "poi-updated": {
      if (event.rowId !== state.rowId) return state;
      const live = (p: LabelPoint) => event.points.some((q) => samePoint(p, q));
      const open = state.open.filter(live);
      const hover = state.hover !== null && live(state.hover) ? state.hover : null;
      return open.length === state.open.length && hover === state.hover
        ? state
        : { rowId: state.rowId, open, hover };
    }
  }
}
