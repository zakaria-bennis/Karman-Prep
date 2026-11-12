"use client";

// MRR over time: a smooth line with a soft fill that draws itself in, and, when asked, a
// dashed run ahead for the forecast at the current pace. Pointer or arrow keys pick a point.

import type { PointerEvent, ReactNode } from "react";
import { niceTicks } from "./format";
import { Tooltip, tickEvery, useCursor } from "./chart-kit";
import { useWidth } from "./motion";

const PAD = { l: 54, r: 14, t: 16, b: 28 };

/** A smooth path through the points that never overshoots them (monotone cubic). */
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const n = pts.length;
  const dx = (i: number) => pts[i + 1][0] - pts[i][0];
  const slope = (i: number) => (pts[i + 1][1] - pts[i][1]) / dx(i);
  const m: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) m.push(slope(0));
    else if (i === n - 1) m.push(slope(n - 2));
    else {
      const a = slope(i - 1);
      const b = slope(i);
      m.push(a * b <= 0 ? 0 : (2 * a * b) / (a + b));
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx(i) / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

export function AreaChart({
  id,
  label,
  xLabels,
  values,
  forecast = [],
  yFormat,
  tooltip,
  speak,
  height = 240,
}: {
  id: string;
  label: string;
  xLabels: Array<{ short: string; label: string }>;
  values: number[];
  /** Points after the last value, drawn dashed. */
  forecast?: Array<{ short: string; label: string; value: number }>;
  yFormat: (n: number) => string;
  tooltip: (i: number) => ReactNode;
  speak: (i: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = values.length;
  const total = n + forecast.length;
  const cursor = useCursor(n);
  const ticks = niceTicks(Math.max(0, ...values, ...forecast.map((f) => f.value)), 4);
  const top = Math.max(ticks[ticks.length - 1], 1);
  const plotH = height - PAD.t - PAD.b;
  const plotW = Math.max(1, width - PAD.l - PAD.r);
  const band = plotW / Math.max(1, total);
  const x = (i: number) => PAD.l + band * (i + 0.5);
  const y = (v: number) => PAD.t + plotH - (v / top) * plotH;
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = smoothPath(pts);
  const base = PAD.t + plotH;
  const area = n > 0 ? `${line} L${x(n - 1)},${base} L${x(0)},${base} Z` : "";
  const ahead =
    n > 0 && forecast.length > 0
      ? smoothPath([
          pts[n - 1],
          ...forecast.map((f, k) => [x(n + k), y(f.value)] as [number, number]),
        ])
      : "";
  const labels = [...xLabels, ...forecast];
  const every = tickEvery(total, plotW);
  const a = cursor.active;

  function onMove(e: PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - box.left) / band);
    cursor.pointer(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div className="kp-rev-chart" ref={ref}>
      <div
        className="kp-rev-chart-focus"
        role="group"
        aria-label={`${label}. Use the left and right arrow keys to read each point.`}
        {...cursor.wrapper}
      >
        <svg width={width} height={height} aria-hidden="true" key={id}>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--rev-line)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--rev-line)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t} className="kp-rev-gl">
              <line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} />
              <text x={PAD.l - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {yFormat(t)}
              </text>
            </g>
          ))}
          {forecast.length > 0 && (
            <rect
              className="kp-rev-ahead"
              x={x(n) - band / 2}
              y={PAD.t - 6}
              width={band * forecast.length}
              height={plotH + 6}
              rx={8}
            />
          )}
          <path className="kp-rev-area" d={area} fill={`url(#${id}-fill)`} />
          <path className="kp-rev-line" d={line} pathLength={1} />
          {ahead && <path className="kp-rev-forecast" d={ahead} />}
          {n > 0 && (
            <g className="kp-rev-now" transform={`translate(${pts[n - 1][0]},${pts[n - 1][1]})`}>
              <circle r={9} className="kp-rev-pulse" />
              <circle r={4} />
            </g>
          )}
          {a !== null && (
            <g className="kp-rev-pick">
              <line x1={x(a)} x2={x(a)} y1={PAD.t} y2={base} />
              <circle cx={x(a)} cy={y(values[a])} r={5} />
            </g>
          )}
          {labels.map((l, i) =>
            i % every === (n - 1) % every ? (
              <text
                key={`${l.label}-${i}`}
                className="kp-rev-x"
                x={x(i)}
                y={height - 8}
                textAnchor="middle"
                data-on={a === i ? "" : undefined}
                data-ahead={i >= n ? "" : undefined}
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
          <Tooltip x={x(a)} width={width}>
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
