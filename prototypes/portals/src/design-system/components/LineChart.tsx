import { useRef } from "react";
import { cn } from "../cn";
import { useWidth } from "./hooks";

/*
 * LineChart: one series, straight 2px segments in the accent, 3 to 5 faint
 * gridlines, no y-axis line, round ticks above the maximum, flat x labels,
 * a dashed stretch after today and an optional dashed target line. Drawn to
 * the app-screens rules; Line Chart (21st.dev 37467) was fetched but its
 * CartesianChart utilities were not in the fetch, so none of its code remains.
 */
export interface LineChartProps {
  data: number[];
  labels: string[];
  /** Index of the last real point; later points draw dashed as a forecast. */
  today?: number;
  target?: { value: number; label: string };
  min?: number;
  max?: number;
  height?: number;
  label: string;
  format?(v: number): string;
  className?: string;
}

const PAD = { top: 12, right: 12, bottom: 28, left: 44 };

function ticks(lo: number, hi: number, count = 4) {
  const raw = (hi - lo) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const out: number[] = [];
  for (let v = start; v <= end + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export function LineChart({
  data,
  labels,
  today,
  target,
  min,
  max,
  height = 200,
  label,
  format = (v) => v.toLocaleString("en-US"),
  className,
}: LineChartProps) {
  const host = useRef<HTMLElement>(null);
  const W = Math.max(320, useWidth(host) || 600);
  const H = height;
  const lo = min ?? Math.min(...data, target?.value ?? Infinity);
  const hi = max ?? Math.max(...data, target?.value ?? -Infinity);
  const ys = ticks(lo, hi);
  const y0 = ys[0];
  const y1 = ys[ys.length - 1];
  const sx = (i: number) =>
    PAD.left + (i / Math.max(1, data.length - 1)) * (W - PAD.left - PAD.right);
  const sy = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0 || 1)) * (H - PAD.top - PAD.bottom);
  const cut = today ?? data.length - 1;
  const solid = data
    .slice(0, cut + 1)
    .map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(" ");
  const dashed = data
    .slice(cut)
    .map((v, i) => `${sx(cut + i).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(" ");
  const every = Math.max(1, Math.ceil(labels.length / 6));
  return (
    <figure
      className={cn("w-full", className)}
      aria-label={`${label}: ${data.map(format).join(", ")}`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-hidden="true"
        style={{ display: "block", height: "auto" }}
      >
        {ys.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={sy(v)}
              y2={sy(v)}
              stroke="rgb(var(--k-line))"
              strokeWidth={v === y0 ? 1.5 : 1}
            />
            <text
              x={PAD.left - 8}
              y={sy(v) + 4}
              textAnchor="end"
              fontSize="12"
              fill="rgb(var(--k-muted))"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {format(v)}
            </text>
          </g>
        ))}
        {target ? (
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={sy(target.value)}
              y2={sy(target.value)}
              stroke="rgb(var(--k-border))"
              strokeDasharray="4 4"
            />
            <text
              x={W - PAD.right}
              y={sy(target.value) - 5}
              textAnchor="end"
              fontSize="12"
              fill="rgb(var(--k-muted))"
            >
              {target.label}
            </text>
          </g>
        ) : null}
        {labels.map((l, i) =>
          i % every === 0 || i === labels.length - 1 ? (
            <text
              key={l + i}
              x={sx(i)}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}
              fontSize="12"
              fill="rgb(var(--k-muted))"
            >
              {l}
            </text>
          ) : null
        )}
        <polyline
          points={solid}
          fill="none"
          stroke="rgb(var(--k-accent))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {dashed && cut < data.length - 1 ? (
          <polyline
            points={dashed}
            fill="none"
            stroke="rgb(var(--k-accent))"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinejoin="round"
          />
        ) : null}
        {data.map((v, i) =>
          i === cut ? (
            <circle key={i} cx={sx(i)} cy={sy(v)} r="4" fill="rgb(var(--k-accent))" />
          ) : null
        )}
      </svg>
    </figure>
  );
}
