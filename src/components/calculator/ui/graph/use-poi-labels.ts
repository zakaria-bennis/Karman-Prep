// The panel's point-of-interest state (POI-1, POI-13, POI-17): the open labels, kept in step with
// the engine's selection, row edits, view changes, focus and recomputed points; the click rules;
// and the dots and labels a frame draws. Escape closes open labels as one KB-3 layer.

import { useCallback, useContext, useEffect, useReducer, useRef } from "react";
import type { CalculatorEngine, EngineSnapshot } from "@/lib/calculator/core/api/engine";
import { worldToPx, type ViewSpec } from "@/lib/calculator/plot/viewport";
import { formatPoiLabel } from "@/lib/calculator/poi/format";
import type { PoiPoint } from "@/lib/calculator/poi/types";
import type { PoiDot, RenderRow } from "@/lib/calculator/render/types";
import type { Pointer } from "../controller/media";
import { AnnouncerContext } from "../a11y/announcer";
import { EscapeContext } from "../focus/escape-stack";
import { poiAnnouncement } from "./keyboard-trace";
import { hitCurve, hitPoi } from "./hit-test";
import { NO_LABELS, reduceLabels, type LabelState } from "./poi-labels";

export interface OpenLabel {
  x: number; // CSS px of the dot
  y: number;
  text: string;
}

const NO_POINTS: readonly PoiPoint[] = Object.freeze([]);

/** The selected row's points of interest, when the snapshot has them for the selected row. */
export function selectedPoints(s: EngineSnapshot): readonly PoiPoint[] {
  return s.poi !== null && s.poi.rowId === s.selectedRowId ? s.poi.points : NO_POINTS;
}

export function poiDots(s: EngineSnapshot, labels: LabelState): PoiDot[] {
  const open = labels.rowId === s.selectedRowId ? labels.open : [];
  return selectedPoints(s).map(({ x, y }) => ({
    x,
    y,
    open: open.some((p) => p.x === x && p.y === y),
  }));
}

export function openLabels(s: EngineSnapshot, labels: LabelState, view: ViewSpec): OpenLabel[] {
  if (labels.rowId !== s.selectedRowId) return [];
  return labels.open.map((p) => {
    const [x, y] = worldToPx(view, p.x, p.y);
    return { x, y, text: formatPoiLabel(p, view) };
  });
}

export function usePoiLabels(snapshot: EngineSnapshot, engine: CalculatorEngine) {
  const [labels, dispatch] = useReducer(reduceLabels, NO_LABELS);
  const escape = useContext(EscapeContext);
  const announcer = useContext(AnnouncerContext);
  const stepIndex = useRef(-1);

  useEffect(
    () => dispatch({ type: "selection", rowId: snapshot.selectedRowId }),
    [snapshot.selectedRowId]
  );
  const revision = useRef(snapshot.revision);
  useEffect(() => {
    if (revision.current === snapshot.revision) return;
    revision.current = snapshot.revision;
    dispatch({ type: "row-edited" }); // a row edit or a view change
  }, [snapshot.revision]);
  useEffect(() => {
    if (snapshot.focusedRowId !== null)
      dispatch({ type: "row-focused", rowId: snapshot.focusedRowId });
  }, [snapshot.focusedRowId]);
  const points = selectedPoints(snapshot);
  useEffect(() => {
    if (snapshot.selectedRowId !== null) {
      dispatch({ type: "poi-updated", rowId: snapshot.selectedRowId, points });
    }
  }, [points, snapshot.selectedRowId]);
  const anyOpen = labels.open.length > 0;
  useEffect(() => {
    if (!anyOpen || escape === null) return;
    return escape.push({ id: "poi-labels", close: () => dispatch({ type: "escape" }) });
  }, [anyOpen, escape]);

  /** POI-13, POI-17: a click on the paper at `at` (CSS px). */
  const click = useCallback(
    (
      at: readonly [number, number],
      pointer: Pointer,
      view: ViewSpec,
      rows: readonly RenderRow[]
    ) => {
      const s = engine.getSnapshot();
      const own = selectedPoints(s);
      const index = hitPoi(own, view, at, pointer);
      if (index !== null && s.selectedRowId !== null) {
        dispatch({ type: "click-poi", rowId: s.selectedRowId, point: own[index] });
        return;
      }
      const rowId = hitCurve(rows, view, at, pointer);
      if (rowId !== null) {
        dispatch({ type: "click-curve", rowId });
        engine.setSelectedRow(rowId);
        return;
      }
      dispatch({ type: "click-empty" });
      engine.setSelectedRow(null);
    },
    [engine]
  );
  const viewChanged = useCallback(() => dispatch({ type: "view-changed" }), []);

  /** KB-14: `]` and `[` with the graph focused show the next or previous point and announce it. */
  const step = useCallback(
    (direction: 1 | -1, view: ViewSpec): boolean => {
      const s = engine.getSnapshot();
      const own = selectedPoints(s);
      if (own.length === 0 || s.selectedRowId === null) return false;
      const next = stepIndex.current + direction;
      stepIndex.current = next < 0 ? own.length - 1 : next >= own.length ? 0 : next;
      const point = own[stepIndex.current];
      dispatch({ type: "show", rowId: s.selectedRowId, point });
      const numbers = new Map(s.rows.map((r, i) => [r.id, i + 1]));
      announcer?.announce(poiAnnouncement(point, numbers, view));
      return true;
    },
    [engine, announcer]
  );

  return { labels, click, viewChanged, step };
}
