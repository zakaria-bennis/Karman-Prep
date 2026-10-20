// The press-and-drag trace (POI-TRACE-21 to POI-TRACE-27): a press within reach of a traceable
// row's branch selects that row and traces it at once; the dot and its live label follow the
// pointer along the row's nearest branch; release removes both and opens nothing.

import { useCallback, useRef, useState } from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { worldToPx, type ViewSpec } from "@/lib/calculator/plot/viewport";
import type { PoiBranch } from "@/lib/calculator/poi/types";
import type { RenderRow } from "@/lib/calculator/render/types";
import type { Pointer } from "../controller/media";
import { hitBranch } from "./hit-test";
import { traceAt } from "./trace";
import type { OpenLabel } from "./use-poi-labels";

export interface TraceState extends OpenLabel {
  color: string;
  hole: boolean; // POI-TRACE-24: the label reads undefined
}
type Target = { rowId: string; branches: readonly PoiBranch[]; color: string };

export function useTrace(engine: CalculatorEngine) {
  const [trace, setTrace] = useState<TraceState | null>(null);
  const target = useRef<Target | null>(null);

  const move = useCallback((at: readonly [number, number], view: ViewSpec) => {
    const t = target.current;
    if (t === null) return;
    const p = traceAt(t.branches, view, at);
    if (p === null) return; // POI-TRACE-26: keep the last point
    const [x, y] = worldToPx(view, p.x, p.y);
    setTrace({
      x,
      y,
      point: { x: p.x, y: p.y },
      label: p.label,
      opened: false,
      hole: p.hole,
      color: t.color,
    });
  }, []);

  /** POI-TRACE-21: claims a press on a traceable row, selects it and traces at `at`. */
  const claim = useCallback(
    (
      at: readonly [number, number],
      pointer: Pointer,
      view: ViewSpec,
      rows: readonly RenderRow[]
    ): boolean => {
      const traceable = rows.map((r) => ({
        rowId: r.rowId,
        branches: engine.poiCurves(r.rowId, view),
      }));
      const rowId = hitBranch(traceable, view, at, pointer);
      if (rowId === null) return false;
      const row = rows.find((r) => r.rowId === rowId)!;
      target.current = {
        rowId,
        color: row.color,
        branches: traceable.find((r) => r.rowId === rowId)!.branches,
      };
      engine.setSelectedRow(rowId);
      move(at, view);
      return true;
    },
    [engine, move]
  );

  const release = useCallback(() => {
    target.current = null;
    setTrace(null);
  }, []);

  return { trace, claim, move, release };
}
