// Open coordinate labels (POI-13): which selected row's points show their `(x, y)` label. Labels
// belong to one selection; anything that changes the view, the rows or the selection closes them,
// and Escape closes them as one KB-3 layer (Karman addition: Desmos keeps them).

import type { PoiPoint } from "@/lib/calculator-v2/poi/types";

export type LabelPoint = Pick<PoiPoint, "x" | "y">;
export interface LabelState {
  rowId: string | null;
  open: readonly LabelPoint[];
}
export type LabelEvent =
  | { type: "click-poi"; rowId: string; point: LabelPoint }
  | { type: "click-curve"; rowId: string }
  | { type: "click-empty" }
  | { type: "view-changed" }
  | { type: "row-edited" }
  | { type: "row-focused"; rowId: string }
  | { type: "escape" }
  | { type: "show"; rowId: string; point: LabelPoint } // KB-14: only this point's label
  | { type: "selection"; rowId: string | null } // the engine's selectedRowId
  | { type: "poi-updated"; rowId: string; points: readonly LabelPoint[] };

export const NO_LABELS: LabelState = Object.freeze({ rowId: null, open: Object.freeze([]) });

const same = (a: LabelPoint, b: LabelPoint): boolean =>
  Math.abs(a.x - b.x) <= 1e-9 * Math.max(1, Math.abs(a.x)) &&
  Math.abs(a.y - b.y) <= 1e-9 * Math.max(1, Math.abs(a.y));

const closed = (rowId: string | null): LabelState =>
  rowId === null ? NO_LABELS : { rowId, open: [] };

export function reduceLabels(state: LabelState, event: LabelEvent): LabelState {
  switch (event.type) {
    case "click-poi": {
      // POI-13: a dot of an unselected curve only selects that curve.
      if (event.rowId !== state.rowId) return closed(event.rowId);
      const open = state.open.some((p) => same(p, event.point))
        ? state.open.filter((p) => !same(p, event.point))
        : [...state.open, event.point];
      return { rowId: state.rowId, open };
    }
    case "click-curve":
      return event.rowId === state.rowId ? state : closed(event.rowId);
    case "click-empty":
      return NO_LABELS;
    case "view-changed":
    case "row-edited":
    case "escape":
      return state.open.length === 0 ? state : closed(state.rowId);
    case "row-focused":
      return closed(event.rowId);
    case "show":
      return { rowId: event.rowId, open: [event.point] };
    case "selection":
      return event.rowId === state.rowId ? state : closed(event.rowId);
    case "poi-updated": {
      if (event.rowId !== state.rowId) return state;
      const open = state.open.filter((p) => event.points.some((q) => same(p, q)));
      return open.length === state.open.length ? state : { rowId: state.rowId, open };
    }
  }
}
