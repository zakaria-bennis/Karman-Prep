// Coordinate labels of plotted points (POI-LIVE-1 to POI-LIVE-4, observed in the reference
// calculator 2026-10-20): pressing a drawn point, a row's or a table's, opens a label with its
// coordinates and pressing it again closes it. Any number stay open; a press neither selects nor
// deselects a row; the labels follow zoom and pan; a press anywhere else that is not on a dot, a
// curve or a label closes them all. The point is already drawn, so no dot goes under the label and
// it has no export button.

import { useCallback, useEffect, useState } from "react";
import { worldToPx, type ViewSpec } from "@/lib/calculator/plot/viewport";
import { formatPoiLabel } from "@/lib/calculator/poi/format";
import type { RenderRow } from "@/lib/calculator/render/types";
import type { Pointer } from "../controller/media";
import { CURVE_HIT_PX, hitLimit } from "./hit-test";
import { samePoint, type LabelPoint } from "./poi-labels";
import { isKeptPress, LABEL_SELECTOR, type OpenLabel } from "./use-poi-labels";

type Point = readonly [number, number];

/** Every finite point the rows draw, in world units. */
export function drawnPoints(rows: readonly RenderRow[]): LabelPoint[] {
  const out: LabelPoint[] = [];
  for (const row of rows) {
    const g = row.geometry;
    if (g.kind !== "points") continue;
    for (let k = 0; k + 1 < g.coords.length; k += 2) {
      const x = g.coords[k],
        y = g.coords[k + 1];
      if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y });
    }
  }
  return out;
}

/** POI-LIVE-1: the drawn point nearest `at` (CSS px) within reach, or null. */
export function hitDrawnPoint(
  rows: readonly RenderRow[],
  view: ViewSpec,
  at: Point,
  pointer: Pointer
): LabelPoint | null {
  let best: LabelPoint | null = null,
    bestDistance = hitLimit(CURVE_HIT_PX[pointer]); // 10 px mouse, 20 touch
  for (const p of drawnPoints(rows)) {
    const [x, y] = worldToPx(view, p.x, p.y);
    const d = Math.hypot(x - at[0], y - at[1]);
    if (d <= bestDistance) [best, bestDistance] = [p, d];
  }
  return best;
}

/** POI-LIVE-2: the open labels whose points are still drawn, placed in `view`. */
export function shownPointLabels(
  open: readonly LabelPoint[],
  rows: readonly RenderRow[],
  view: ViewSpec
): OpenLabel[] {
  if (open.length === 0) return [];
  const drawn = drawnPoints(rows);
  return open
    .filter((p) => drawn.some((q) => samePoint(p, q)))
    .map((p) => {
      const [x, y] = worldToPx(view, p.x, p.y);
      return { x, y, point: p, label: formatPoiLabel(p, view), opened: true, plotted: true };
    });
}

export function usePointLabels() {
  const [open, setOpen] = useState<readonly LabelPoint[]>([]);

  // POI-LIVE-3: a press that is not on a dot, a curve, a point or a label closes them all.
  const anyOpen = open.length > 0;
  useEffect(() => {
    if (!anyOpen) return;
    const onPress = (e: PointerEvent) => {
      if (isKeptPress(e)) return;
      const onLabel = e
        .composedPath()
        .some((t) => t instanceof Element && t.matches(LABEL_SELECTOR));
      if (!onLabel) setOpen([]);
    };
    document.addEventListener("pointerdown", onPress);
    return () => document.removeEventListener("pointerdown", onPress);
  }, [anyOpen]);

  /** POI-LIVE-1: toggles the label of the drawn point under `at`; false when there is none. */
  const press = useCallback(
    (at: Point, pointer: Pointer, view: ViewSpec, rows: readonly RenderRow[]): boolean => {
      const hit = hitDrawnPoint(rows, view, at, pointer);
      if (hit === null) return false;
      setOpen((now) =>
        now.some((p) => samePoint(p, hit)) ? now.filter((p) => !samePoint(p, hit)) : [...now, hit]
      );
      return true;
    },
    []
  );

  const close = useCallback(() => setOpen([]), []);
  return { open, press, close };
}
