"use client";

import { fmtMoney } from "./format";
import type { MrrSnapshot } from "../_types";

export function MrrSparkline({ snapshots }: { snapshots: MrrSnapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="py-12 text-center text-xs text-slate-500">
        Need at least 2 snapshots to draw a trend.
        <br />
        <span className="text-slate-600">
          Hit &ldquo;Snapshot now&rdquo; to capture today&apos;s MRR.
        </span>
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
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark-area)" />
        <path d={path} stroke="#34d399" strokeWidth={1.5} fill="none" />
        {snapshots.map((s, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(s.mrr)} r={2.5} fill="#34d399">
            <title>{`${new Date(s.capturedAt).toLocaleDateString()} — ${fmtMoney(s.mrr)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
        <span>{new Date(snapshots[0].capturedAt).toLocaleDateString()}</span>
        <span>
          Latest:{" "}
          <span className="font-semibold tabular-nums text-slate-300">{fmtMoney(last.mrr)}</span>
        </span>
        <span>{new Date(last.capturedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
