// The press-and-drag trace (POI-14): a press within a curve's hit area claims the gesture, the
// dot and its live label follow the pointer along that curve once it moves, the traced row becomes
// the selected row, and release removes everything.

import { useCallback, useRef, useState } from "react";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import { worldToPx, type ViewSpec } from "@/lib/calculator-v2/plot/viewport";
import type { RenderRow } from "@/lib/calculator-v2/render/types";
import type { Pointer } from "../controller/media";
import { hitCurve } from "./hit-test";
import { traceAt, type TraceSource } from "./trace";
import { selectedPoints, type OpenLabel } from "./use-poi-labels";

export interface TraceState extends OpenLabel {
  wx: number; // the traced world point
  wy: number;
  color: string;
}
type Target = { rowId: string; source: TraceSource; color: string; pointer: Pointer };

export function useTrace(engine: CalculatorEngine) {
  const [trace, setTrace] = useState<TraceState | null>(null);
  const target = useRef<Target | null>(null);

  const claim = useCallback(
    (
      at: readonly [number, number],
      pointer: Pointer,
      view: ViewSpec,
      rows: readonly RenderRow[]
    ) => {
      const rowId = hitCurve(rows, view, at, pointer);
      if (rowId === null) return false;
      const row = rows.find((r) => r.rowId === rowId)!;
      target.current = {
        rowId,
        pointer,
        color: row.color,
        source: { curve: engine.poiCurves(rowId)[0] ?? null, geometry: row.geometry },
      };
      return true;
    },
    [engine]
  );

  const move = useCallback(
    (at: readonly [number, number], view: ViewSpec) => {
      const t = target.current;
      if (t === null) return;
      if (engine.getSnapshot().selectedRowId !== t.rowId) engine.setSelectedRow(t.rowId);
      const s = engine.getSnapshot();
      const pois = s.selectedRowId === t.rowId ? selectedPoints(s) : [];
      const p = traceAt(t.source, view, at, pois, t.pointer);
      if (p === null) return; // keep the last point where the curve has no value
      const [x, y] = worldToPx(view, p.x, p.y);
      setTrace({ x, y, wx: p.x, wy: p.y, text: p.label, color: t.color });
    },
    [engine]
  );

  const release = useCallback(() => {
    target.current = null;
    setTrace(null);
  }, []);

  return { trace, claim, move, release };
}
