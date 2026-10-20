// Coordinate labels over the graph (POI-TRACE-12 to POI-TRACE-18, POI-TRACE-24): white boxes placed
// diagonally off their dots by placeLabels, the coordinates typeset as math, and on a point of
// interest's label the "Export point to expression list" button. Each label is a note named by its
// coordinates. The overlay takes no pointer input except on the labels themselves, so presses
// elsewhere reach the panel underneath.

import { labelBoxSize, placeLabels } from "./label-placement";
import { PoiMath } from "./poi-math";
import type { OpenLabel } from "./use-poi-labels";
import type { TraceState } from "./use-trace";

export const EXPORT_LABEL = "Export point to expression list";

export interface PoiOverlayProps {
  labels: readonly OpenLabel[];
  curve: readonly (readonly [number, number])[]; // the selected curve's vertices in CSS px
  size: { width: number; height: number };
  trace?: TraceState | null; // POI-TRACE-24's live trace label
  onExport?(label: OpenLabel): void; // absent: no export buttons (the list is hidden)
}

/** The export icon: a filled card with an arrow leaving it, drawn for Karman at the 17.6 px glyph size. */
function ExportGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 18 18" width="17.6" height="18" aria-hidden="true" focusable="false">
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M3.5 3h8A1.5 1.5 0 0 1 13 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 13.5v-9A1.5 1.5 0 0 1 3.5 3ZM5 7.2h5v1.4H5Zm0 2.9h3.5v1.4H5Z"
      />
      <path
        d="M10.5 7.5 16 2M12.6 2H16v3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PoiOverlay({
  labels,
  curve,
  size,
  trace = null,
  onExport,
}: PoiOverlayProps): JSX.Element | null {
  if (labels.length === 0 && trace === null) return null;
  const all: OpenLabel[] = trace === null ? [...labels] : [...labels, trace];
  const withButton = (i: number) =>
    onExport !== undefined && !(trace !== null && i === labels.length);
  const placed = placeLabels(
    all.map((l, i) => ({
      x: l.x,
      y: l.y,
      beside: trace !== null && i === labels.length, // POI-TRACE-24: a trace label sits beside its dot
      ...labelBoxSize(l.label, withButton(i)),
    })),
    curve,
    size
  );
  return (
    <div className="kc-poi-overlay" data-poi-overlay="">
      {all.map((label, i) => {
        const isTrace = trace !== null && i === labels.length;
        return (
          <div
            key={
              isTrace
                ? "trace"
                : `${label.label.text}@${Math.round(label.x)},${Math.round(label.y)}`
            }
            className="kc-poi-label"
            role="note"
            aria-label={label.label.text}
            data-poi-label={isTrace ? undefined : ""}
            data-trace-label={isTrace ? "" : undefined}
            data-opened={label.opened ? "" : undefined}
            data-hole={isTrace && trace.hole ? "" : undefined}
            data-quadrant={placed[i].quadrant}
            style={{ left: placed[i].left, top: placed[i].top }}
          >
            <PoiMath label={label.label} />
            {withButton(i) && (
              <button
                type="button"
                className="kc-poi-export"
                aria-label={EXPORT_LABEL}
                title={EXPORT_LABEL}
                onClick={() => onExport?.(label)}
              >
                <ExportGlyph />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
