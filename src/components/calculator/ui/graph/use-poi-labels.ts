// The panel's point-of-interest state (POI-TRACE-1, POI-TRACE-12 to POI-TRACE-18): the open and
// hovered labels, kept in step with the engine's selection, recomputes and points; the press and
// hover rules; the dots and labels a frame draws; and exporting a point as a new row. Escape closes
// open labels as one KB-3 layer.

import { startTransition, useCallback, useContext, useEffect, useReducer, useRef } from "react";
import type { CalculatorEngine, EngineSnapshot } from "@/lib/calculator/core/api/engine";
import { worldToPx, type ViewSpec } from "@/lib/calculator/plot/viewport";
import { formatPoiLabel, type FormattedLabel } from "@/lib/calculator/poi/format";
import type { PoiPoint } from "@/lib/calculator/poi/types";
import type { PoiDot } from "@/lib/calculator/render/types";
import { nextSlot } from "@/lib/calculator/theme/roles";
import type { Pointer } from "../controller/media";
import { AnnouncerContext } from "../a11y/announcer";
import { EscapeContext } from "../focus/escape-stack";
import { poiAnnouncement } from "./keyboard-trace";
import { hitPoi } from "./hit-test";
import { NO_LABELS, reduceLabels, samePoint, type LabelPoint, type LabelState } from "./poi-labels";

export interface OpenLabel {
  x: number; // CSS px of the dot
  y: number;
  point: LabelPoint; // world units
  label: FormattedLabel;
  opened: boolean; // pinned by a press (a black dot under it), else hovered or traced
  plotted?: boolean; // POI-LIVE-2: a drawn point's label: no dot under it, no export button
}

const NO_POINTS: readonly PoiPoint[] = Object.freeze([]);

/** Presses that must not close open labels (POI-TRACE-14): on a dot, a curve or a label. */
const keptPresses = new WeakSet<Event>();
export const keepLabelsOpen = (e: Event): void => void keptPresses.add(e);
export const isKeptPress = (e: Event): boolean => keptPresses.has(e);
export const LABEL_SELECTOR = "[data-poi-label], [data-trace-label]";

/**
 * The selected row's points of interest, when the snapshot has them for the selected row and both
 * the trace and pointsOfInterest settings are on (POI-TRACE-2).
 */
export function selectedPoints(s: EngineSnapshot): readonly PoiPoint[] {
  if (!s.settings.trace || !s.settings.pointsOfInterest) return NO_POINTS;
  return s.poi !== null && s.poi.rowId === s.selectedRowId ? s.poi.points : NO_POINTS;
}

export function poiDots(s: EngineSnapshot, labels: LabelState): PoiDot[] {
  const open = labels.rowId === s.selectedRowId ? labels.open : [];
  return selectedPoints(s).map(({ x, y }) => ({
    x,
    y,
    open: open.some((p) => samePoint(p, { x, y })),
  }));
}

/** The labels to show: every open one, then the hovered one unless it is open already. */
export function shownLabels(s: EngineSnapshot, labels: LabelState, view: ViewSpec): OpenLabel[] {
  if (labels.rowId !== s.selectedRowId) return [];
  const at = (p: LabelPoint, opened: boolean): OpenLabel => {
    const [x, y] = worldToPx(view, p.x, p.y);
    return { x, y, point: { x: p.x, y: p.y }, label: formatPoiLabel(p, view), opened };
  };
  const out = labels.open.map((p) => at(p, true));
  const h = labels.hover;
  if (h !== null && !labels.open.some((p) => samePoint(p, h))) out.push(at(h, false));
  return out;
}

export function usePoiLabels(snapshot: EngineSnapshot, engine: CalculatorEngine) {
  const [labels, dispatch] = useReducer(reduceLabels, NO_LABELS);
  const escape = useContext(EscapeContext);
  const announcer = useContext(AnnouncerContext);
  const stepIndex = useRef(-1);

  // The three syncs below run after every snapshot. They are transitions so that a burst of
  // snapshots (key spam) does not chain urgent effect updates into React's update-depth limit.
  useEffect(
    () => startTransition(() => dispatch({ type: "selection", rowId: snapshot.selectedRowId })),
    [snapshot.selectedRowId]
  );
  const revision = useRef(snapshot.revision);
  useEffect(() => {
    if (revision.current === snapshot.revision) return;
    revision.current = snapshot.revision;
    startTransition(() => dispatch({ type: "close" })); // POI-TRACE-15: a row edit or a view change
  }, [snapshot.revision]);
  const points = selectedPoints(snapshot);
  useEffect(() => {
    if (snapshot.selectedRowId !== null) {
      const rowId = snapshot.selectedRowId;
      startTransition(() => dispatch({ type: "poi-updated", rowId, points }));
    }
  }, [points, snapshot.selectedRowId]);
  const anyOpen = labels.open.length > 0;
  useEffect(() => {
    if (!anyOpen || escape === null) return;
    return escape.push({ id: "poi-labels", close: () => dispatch({ type: "close" }) });
  }, [anyOpen, escape]);
  // POI-TRACE-14: any press in the page that is not on a dot, a curve or a label closes them.
  useEffect(() => {
    if (!anyOpen) return;
    const onPress = (e: PointerEvent) => {
      if (isKeptPress(e)) return;
      const onLabel = e
        .composedPath()
        .some((t) => t instanceof Element && t.matches(LABEL_SELECTOR));
      if (!onLabel) dispatch({ type: "close" });
    };
    document.addEventListener("pointerdown", onPress);
    return () => document.removeEventListener("pointerdown", onPress);
  }, [anyOpen]);

  /** POI-TRACE-13: a press at `at` (CSS px) on a dot of the selected row toggles its label. */
  const pressDot = useCallback(
    (at: readonly [number, number], pointer: Pointer, view: ViewSpec): boolean => {
      const s = engine.getSnapshot();
      const own = selectedPoints(s);
      const index = hitPoi(own, view, at, pointer);
      if (index === null || s.selectedRowId === null) return false;
      dispatch({ type: "toggle", rowId: s.selectedRowId, point: own[index] });
      return true;
    },
    [engine]
  );

  /** POI-TRACE-12: the mouse at `at` (null when it leaves or a press starts). */
  const hover = useCallback(
    (at: readonly [number, number] | null, view: ViewSpec | null): void => {
      if (at === null || view === null) {
        dispatch({ type: "hover", point: null });
        return;
      }
      const own = selectedPoints(engine.getSnapshot());
      const index = hitPoi(own, view, at, "fine");
      dispatch({ type: "hover", point: index === null ? null : own[index] });
    },
    [engine]
  );

  const close = useCallback(() => dispatch({ type: "close" }), []);

  /** POI-TRACE-18: closes the label and appends its point as a new row. */
  const exportPoint = useCallback(
    (label: FormattedLabel, point: LabelPoint): void => {
      const s = engine.getSnapshot();
      if (s.selectedRowId !== null) dispatch({ type: "toggle", rowId: s.selectedRowId, point });
      engine.editRows((rows, ctx) => [
        ...rows,
        { id: ctx.nextId(), latex: label.latex, color: nextSlot(rows.length), hidden: false },
      ]);
    },
    [engine]
  );

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

  return { labels, pressDot, hover, close, exportPoint, step };
}
