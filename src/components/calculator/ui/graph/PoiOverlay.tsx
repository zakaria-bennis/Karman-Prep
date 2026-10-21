// Coordinate labels over the graph (POI-TRACE-12 to POI-TRACE-18, POI-TRACE-24): white boxes placed
// around their dots by placeLabels (each keeps its side while it can), the coordinates typeset as
// math, and on a point of
// interest's label the "Export point to expression list" button. A label with a clean rational
// coordinate also gets the rows' decimal/fraction toggle (owner decision, 2026-10-21); switched on,
// those coordinates show as fractions and export as shown. Each label is a note named by the
// coordinates it shows. The overlay takes no pointer input except on the labels themselves, so presses
// elsewhere reach the panel underneath.

import { useLayoutEffect, useReducer, useRef, useState } from "react";
import { fractionLabel, hasLabelFraction } from "@/lib/calculator/poi/format";
import { FractionGlyph } from "../../icons/list";
import { FRACTION_LABELS } from "../list/fraction-toggle";
import { labelBoxSize, placeLabels, type InkSampler, type Orientation } from "./label-placement";
import { PoiMath } from "./poi-math";
import { samePoint, type LabelPoint } from "./poi-labels";
import type { OpenLabel } from "./use-poi-labels";
import type { TraceState } from "./use-trace";

export const EXPORT_LABEL = "Export point to expression list";

export interface PoiOverlayProps {
  labels: readonly OpenLabel[];
  size: { width: number; height: number };
  readInk?: () => InkSampler | null; // the ink under a spot, read when labels are placed
  trace?: TraceState | null; // POI-TRACE-24's live trace label
  onExport?(label: OpenLabel): void; // absent: no export buttons (the list is hidden)
}

/**
 * The export icon, drawn for Karman at the 17.6 px glyph size: a small expression list (filled
 * left column, open panel with one divider) with an arrow coming in from the top right.
 */
function ExportGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 18 18" width="17.6" height="18" aria-hidden="true" focusable="false">
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M3.5 2.5h11A1.5 1.5 0 0 1 16 4v11.5A1.5 1.5 0 0 1 14.5 17h-11A1.5 1.5 0 0 1 2 15.5V4a1.5 1.5 0 0 1 1.5-1.5ZM6.8 3.7v12.1h8V3.7Z"
      />
      <path
        d="M6.8 12.9h8M17.4 1.1 10.4 8.1M10.2 4.6v3.9h3.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PoiOverlay({
  labels,
  size,
  readInk,
  trace = null,
  onExport,
}: PoiOverlayProps): JSX.Element | null {
  const prior = useRef(new Map<string, Orientation>());
  // GP-38: Desmos places a label by its rendered size, so each label's box is measured after it
  // renders and, when the estimate was off, placed again before paint.
  const measured = useRef(new Map<string, { width: number; height: number }>());
  const overlay = useRef<HTMLDivElement>(null);
  const [, remeasured] = useReducer((n: number) => n + 1, 0);
  // The labels switched to fractions, by point; a label that closes forgets it.
  const [fractions, setFractions] = useState<readonly LabelPoint[]>([]);
  useLayoutEffect(() => {
    let changed = false;
    for (const el of overlay.current?.querySelectorAll<HTMLElement>("[data-label-key]") ?? []) {
      const key = el.dataset.labelKey!,
        size = { width: el.offsetWidth, height: el.offsetHeight };
      const known = measured.current.get(key);
      if (!(size.width > 0 && size.height > 0)) continue;
      if (
        known === undefined ||
        Math.abs(known.width - size.width) > 0.5 ||
        Math.abs(known.height - size.height) > 0.5
      ) {
        measured.current.set(key, size);
        changed = true;
      }
    }
    if (changed) remeasured();
  });
  // Desmos lays every label out again while a trace moves and once it ends; otherwise a label
  // keeps the spot it was given.
  const traced = useRef(false);
  const relayout = trace !== null || traced.current;
  traced.current = trace !== null;
  const all: OpenLabel[] = trace === null ? [...labels] : [...labels, trace];
  const isTrace = (i: number) => trace !== null && i === labels.length;
  const stale = fractions.filter((p) => !labels.some((l) => samePoint(l.point, p)));
  if (stale.length > 0) setFractions(fractions.filter((p) => !stale.includes(p)));
  if (all.length === 0) {
    prior.current.clear();
    measured.current.clear();
    return null;
  }
  const withExport = (i: number) => onExport !== undefined && !isTrace(i) && !all[i].plotted;
  const withFraction = all.map((l, i) => !isTrace(i) && hasLabelFraction(l.label, l.point));
  const asFraction = all.map(
    (l, i) => withFraction[i] && fractions.some((p) => samePoint(p, l.point))
  );
  const shown = all.map((l, i) => (asFraction[i] ? fractionLabel(l.label, l.point) : l.label));
  const keyOf = (label: OpenLabel, i: number) =>
    isTrace(i) ? "trace" : `${label.label.text}@${Math.round(label.x)},${Math.round(label.y)}`;
  const keys = all.map(keyOf);
  // A label is measured again when it switches form; it keeps its spot while it can.
  const sizeKeys = keys.map((k, i) => (asFraction[i] ? `${k}/fraction` : k));
  const placed = placeLabels(
    all.map((l, i) => ({
      x: l.x,
      y: l.y,
      prior: prior.current.get(keys[i]),
      ...(measured.current.get(sizeKeys[i]) ??
        labelBoxSize(shown[i], { export: withExport(i), fraction: withFraction[i] })),
    })),
    size,
    readInk?.() ?? undefined,
    relayout
  );
  // A spot counts as the label's own once it was chosen for the label's measured size.
  prior.current = new Map(
    keys.flatMap((k, i) =>
      measured.current.has(sizeKeys[i]) || prior.current.has(k)
        ? [[k, placed[i].orientation] as const]
        : []
    )
  );
  const toggle = (point: LabelPoint) =>
    setFractions((now) =>
      now.some((p) => samePoint(p, point))
        ? now.filter((p) => !samePoint(p, point))
        : [...now, point]
    );
  return (
    <div ref={overlay} className="kc-poi-overlay" data-poi-overlay="">
      {all.map((label, i) => {
        const traced = isTrace(i);
        return (
          <div
            key={keys[i]}
            data-label-key={sizeKeys[i]}
            className="kc-poi-label"
            role="note"
            aria-label={shown[i].text}
            data-poi-label={traced ? undefined : ""}
            data-trace-label={traced ? "" : undefined}
            data-opened={label.opened ? "" : undefined}
            data-plotted={label.plotted ? "" : undefined}
            data-hole={traced && trace?.hole ? "" : undefined}
            data-orientation={placed[i].orientation}
            style={{ left: placed[i].left, top: placed[i].top }}
          >
            <PoiMath label={shown[i]} />
            {withFraction[i] && (
              <button
                type="button"
                className="kc-poi-fraction"
                data-on={asFraction[i] ? "true" : undefined}
                aria-label={FRACTION_LABELS[asFraction[i] ? "fraction" : "decimal"]}
                onClick={() => toggle(label.point)}
              >
                <FractionGlyph />
              </button>
            )}
            {withExport(i) && (
              <button
                type="button"
                className="kc-poi-export"
                aria-label={EXPORT_LABEL}
                title={EXPORT_LABEL}
                onClick={() => onExport?.({ ...label, label: shown[i] })}
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
