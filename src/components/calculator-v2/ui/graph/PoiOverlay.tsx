// Open coordinate labels over the graph (POI-13, POI-19): light boxes placed diagonally off their
// dots by placeLabels, readable by assistive technology as notes. The overlay never takes
// pointer input, so presses reach the panel underneath.

import { placeLabels } from "./label-placement";
import type { OpenLabel } from "./use-poi-labels";

export interface PoiOverlayProps {
  labels: readonly OpenLabel[];
  curve: readonly (readonly [number, number])[]; // the selected curve's vertices in CSS px
  size: { width: number; height: number };
  trace?: OpenLabel | null; // POI-14's live trace label
}

export function PoiOverlay({
  labels,
  curve,
  size,
  trace = null,
}: PoiOverlayProps): JSX.Element | null {
  if (labels.length === 0 && trace === null) return null;
  const all = trace === null ? labels : [...labels, trace];
  const placed = placeLabels(all, curve, size);
  return (
    <div className="kc-poi-overlay" data-poi-overlay="">
      {all.map((label, i) => {
        const isTrace = trace !== null && i === all.length - 1;
        return (
          <div
            key={isTrace ? "trace" : `${label.text}@${Math.round(label.x)},${Math.round(label.y)}`}
            className="kc-poi-label"
            role="note"
            data-poi-label={isTrace ? undefined : ""}
            data-trace-label={isTrace ? "" : undefined}
            data-quadrant={placed[i].quadrant}
            style={{ left: placed[i].left, top: placed[i].top }}
          >
            {label.text}
          </div>
        );
      })}
    </div>
  );
}
