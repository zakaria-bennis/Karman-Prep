"use client";

import { fmtMoney } from "./format";
import type { MrrSnapshot } from "../_types";

export function MrrSparkline({ snapshots }: { snapshots: MrrSnapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="wb-empty">
        <b>Need at least 2 snapshots to draw a trend.</b>
        Press &ldquo;Snapshot now&rdquo; to capture today&apos;s MRR.
      </div>
    );
  }
  const w = 800;
  const h = 120;
  const pad = 12;
  const xs = snapshots.map((_, i) => i);
  const ys = snapshots.map((s) => s.mrr);
  const maxY = Math.max(...ys, 1);
  const minY = Math.min(...ys, 0);
  const xScale = (i: number) => pad + (i / Math.max(1, xs.length - 1)) * (w - 2 * pad);
  const yScale = (v: number) => h - pad - ((v - minY) / Math.max(1, maxY - minY)) * (h - 2 * pad);
  const path = snapshots
    .map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(s.mrr)}`)
    .join(" ");
  const area = `${path} L ${xScale(xs.length - 1)} ${h - pad} L ${xScale(0)} ${h - pad} Z`;
  const last = snapshots[snapshots.length - 1];
  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`MRR from ${fmtMoney(snapshots[0].mrr)} to ${fmtMoney(last.mrr)}`}
        style={{ display: "block" }}
      >
        <path d={area} style={{ fill: "color-mix(in srgb, var(--good) 14%, transparent)" }} />
        <path
          d={path}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          style={{ fill: "none", stroke: "var(--good)" }}
        />
        {snapshots.map((s, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(s.mrr)} r={2.5} style={{ fill: "var(--good)" }}>
            <title>{`${new Date(s.capturedAt).toLocaleDateString()} — ${fmtMoney(s.mrr)}`}</title>
          </circle>
        ))}
      </svg>
      <div
        className="wb-note"
        style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6 }}
      >
        <span>{new Date(snapshots[0].capturedAt).toLocaleDateString()}</span>
        <span>
          Latest: <b style={{ color: "var(--ink)" }}>{fmtMoney(last.mrr)}</b>
        </span>
        <span>{new Date(last.capturedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
