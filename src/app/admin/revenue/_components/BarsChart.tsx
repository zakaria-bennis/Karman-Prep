"use client";

// Stacked bars over time, drawn in SVG at the container's real width. Series stack up from
// the baseline; an optional second set (refunds, cancellations) hangs below it on the same
// scale. Bars rise in one after another; hidden series slide out. Pointer or arrow keys pick
// a bar and a tooltip gives its exact numbers; a live region reads them out.

import type { PointerEvent, ReactNode } from "react";
import { niceTicks } from "./format";
import { Tooltip, tickEvery, useCursor } from "./chart-kit";
import { useWidth } from "./motion";

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

const PAD = { l: 54, r: 10, t: 14, b: 28 };

export function BarsChart({
  id,
  label,
  xLabels,
  up,
  upValues,
  down = [],
  downValues,
  hidden,
  integer = false,
  yFormat,
  tooltip,
  speak,
  height = 280,
}: {
  id: string;
  label: string;
  xLabels: Array<{ short: string; label: string }>;
  up: BarSeries[];
  /** [bucket][series], in the order of `up`. */
  upValues: number[][];
  down?: BarSeries[];
  downValues?: number[][];
  hidden?: ReadonlySet<string>;
  integer?: boolean;
  yFormat: (n: number) => string;
  tooltip: (i: number) => ReactNode;
  speak: (i: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = xLabels.length;
  const cursor = useCursor(n);
  const shown = (s: BarSeries) => !hidden?.has(s.key);
  const upTotal = (i: number) =>
    up.reduce((sum, s, k) => sum + (shown(s) ? Math.max(0, upValues[i]?.[k] ?? 0) : 0), 0);
  const downTotal = (i: number) =>
    down.reduce((sum, s, k) => sum + (shown(s) ? Math.max(0, downValues?.[i]?.[k] ?? 0) : 0), 0);

  const maxUp = Math.max(0, ...xLabels.map((_, i) => upTotal(i)));
  const maxDown = Math.max(0, ...xLabels.map((_, i) => downTotal(i)));
  const upTicks = niceTicks(maxUp, 4, integer);
  const downTicks = maxDown > 0 ? niceTicks(maxDown, 1, integer) : [0];
  const top = Math.max(upTicks[upTicks.length - 1], integer ? 1 : 1e-6);
  const bottom = downTicks[downTicks.length - 1];
  const plotH = height - PAD.t - PAD.b;
  const scale = plotH / (top + bottom || 1);
  const base = PAD.t + top * scale;
  const plotW = Math.max(1, width - PAD.l - PAD.r);
  const band = plotW / Math.max(1, n);
  const barW = Math.max(3, Math.min(38, band * 0.64));
  const cx = (i: number) => PAD.l + band * (i + 0.5);
  const every = tickEvery(n, plotW);

  function onMove(e: PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - box.left) / band);
    cursor.pointer(Math.max(0, Math.min(n - 1, i)));
  }

  const a = cursor.active;
  return (
    <div className="kp-rev-chart" ref={ref}>
      <div
        className="kp-rev-chart-focus"
        role="group"
        aria-label={`${label}. Use the left and right arrow keys to read each bar.`}
        {...cursor.wrapper}
      >
        <svg width={width} height={height} aria-hidden="true" key={`${id}-${n}`}>
          {upTicks.map((t) => (
            <g key={`u${t}`} className="kp-rev-gl">
              <line x1={PAD.l} x2={width - PAD.r} y1={base - t * scale} y2={base - t * scale} />
              <text x={PAD.l - 8} y={base - t * scale} dy="0.32em" textAnchor="end">
                {yFormat(t)}
              </text>
            </g>
          ))}
          {bottom > 0 && (
            <g className="kp-rev-gl">
              <line
                x1={PAD.l}
                x2={width - PAD.r}
                y1={base + bottom * scale}
                y2={base + bottom * scale}
              />
              <text x={PAD.l - 8} y={base + bottom * scale} dy="0.32em" textAnchor="end">
                {`−${yFormat(bottom)}`}
              </text>
            </g>
          )}
          {a !== null && (
            <rect
              className="kp-rev-band"
              x={cx(a) - band / 2}
              width={band}
              y={PAD.t - 6}
              height={plotH + 12}
              rx={8}
            />
          )}
          {xLabels.map((_, i) => {
            let acc = 0;
            const upH = upTotal(i) * scale;
            const downH = downTotal(i) * scale;
            const x = cx(i) - barW / 2;
            let dacc = 0;
            return (
              <g key={i} data-dim={a !== null && a !== i ? "" : undefined} className="kp-rev-col">
                <clipPath id={`${id}-u${i}`}>
                  <rect
                    x={x}
                    width={barW}
                    y={base - upH}
                    height={upH}
                    rx={Math.min(5, barW / 3)}
                    style={{ y: base - upH, height: upH }}
                  />
                </clipPath>
                <g
                  className="kp-rev-rise"
                  style={{ ["--i" as string]: i }}
                  clipPath={`url(#${id}-u${i})`}
                >
                  {up.map((s, k) => {
                    const v = shown(s) ? Math.max(0, upValues[i]?.[k] ?? 0) * scale : 0;
                    acc += v;
                    return (
                      <rect
                        key={s.key}
                        x={x}
                        width={barW}
                        y={base - acc}
                        height={v}
                        style={{ fill: s.color, y: base - acc, height: v }}
                      />
                    );
                  })}
                </g>
                {down.length > 0 && (
                  <>
                    <clipPath id={`${id}-d${i}`}>
                      <rect
                        x={x}
                        width={barW}
                        y={base}
                        height={downH}
                        rx={Math.min(4, barW / 3)}
                        style={{ height: downH }}
                      />
                    </clipPath>
                    <g
                      className="kp-rev-drop"
                      style={{ ["--i" as string]: i }}
                      clipPath={`url(#${id}-d${i})`}
                    >
                      {down.map((s, k) => {
                        const v = shown(s) ? Math.max(0, downValues?.[i]?.[k] ?? 0) * scale : 0;
                        const y = base + dacc;
                        dacc += v;
                        return (
                          <rect
                            key={s.key}
                            x={x}
                            width={barW}
                            y={y}
                            height={v}
                            style={{ fill: s.color, y, height: v }}
                          />
                        );
                      })}
                    </g>
                  </>
                )}
              </g>
            );
          })}
          <line className="kp-rev-base" x1={PAD.l} x2={width - PAD.r} y1={base} y2={base} />
          {xLabels.map((l, i) =>
            i % every === (n - 1) % every ? (
              <text
                key={l.label}
                className="kp-rev-x"
                x={cx(i)}
                y={height - 8}
                textAnchor="middle"
                data-on={a === i ? "" : undefined}
              >
                {l.short}
              </text>
            ) : null
          )}
          <rect
            className="kp-rev-hit"
            x={PAD.l}
            y={0}
            width={plotW}
            height={height}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => cursor.pointer(null)}
          />
        </svg>
        {a !== null && (
          <Tooltip x={cx(a)} width={width}>
            <p className="kp-rev-tip-h">{xLabels[a].label}</p>
            {tooltip(a)}
          </Tooltip>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {a !== null ? speak(a) : ""}
      </p>
    </div>
  );
}
