"use client";

// ============================================================
// PredictedSATChart — weekly SAT trajectory line chart.
// SVG + d3-scale (no canvas), responsive via viewBox.
// ============================================================

import Link from "next/link";
import { scaleLinear } from "d3-scale";
import { line as d3line, area as d3area, curveMonotoneX } from "d3-shape";
import { ArrowLeft, TrendingUp, Target, Info } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import type { WeekPoint } from "@/app/dashboard/student/predicted-sat/page";

interface Props {
  points: WeekPoint[];
  diagnosticsCount: number;
}

const W = 900;
const H = 420;
const MARGIN = { top: 20, right: 40, bottom: 50, left: 56 };

export default function PredictedSATChart({ points, diagnosticsCount }: Props) {
  const hasData = points.length > 0;
  const innerW = W - MARGIN.left - MARGIN.right;
  const innerH = H - MARGIN.top - MARGIN.bottom;

  // Scales
  const xMin = 1;
  const xMax = Math.max(4, points.length);
  const rawMin = hasData ? Math.min(...points.map((p) => p.scoreLow)) : 1000;
  const rawMax = hasData ? Math.max(...points.map((p) => p.scoreHigh)) : 1200;
  const yMin = Math.max(400, Math.floor((rawMin - 50) / 50) * 50);
  const yMax = Math.min(1600, Math.ceil((rawMax + 50) / 50) * 50);

  const x = scaleLinear().domain([xMin, xMax]).range([0, innerW]);
  const y = scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

  const lineFn = d3line<WeekPoint>()
    .x((p) => x(p.weekIndex))
    .y((p) => y(p.scoreMid))
    .curve(curveMonotoneX);
  const areaFn = d3area<WeekPoint>()
    .x((p) => x(p.weekIndex))
    .y0((p) => y(p.scoreLow))
    .y1((p) => y(p.scoreHigh))
    .curve(curveMonotoneX);

  const midPath = hasData ? (lineFn(points) ?? "") : "";
  const bandPath = hasData ? (areaFn(points) ?? "") : "";

  const latest = hasData ? points[points.length - 1] : null;
  const first = hasData ? points[0] : null;
  const delta = latest && first ? latest.scoreMid - first.scoreMid : 0;

  // Y-axis ticks every 100
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v += 100) yTicks.push(v);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        {/* Header summary */}
        <div>
          <div className="mb-1 flex items-center gap-2 text-blue-500">
            <Target className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Predicted SAT</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-4">
            <h1 className="text-4xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {latest ? `${latest.scoreLow}–${latest.scoreHigh}` : "—"}
            </h1>
            {delta !== 0 && latest && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${delta > 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {delta > 0 ? "+" : ""}
                {delta} since Week 1
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {hasData
              ? `${points.length} ${points.length === 1 ? "week" : "weeks"} of learning history, projected from ${diagnosticsCount > 0 ? "your diagnostic baseline" : "your mastery progress"}.`
              : "Take the diagnostic or master your first node to see your trajectory."}
          </p>
        </div>

        {/* Chart card */}
        <div className="glass-card p-6">
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ minWidth: 600 }}>
              <defs>
                <linearGradient id="predicted-band" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.10" />
                </linearGradient>
                <linearGradient id="predicted-line" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#EC4899" />
                  <stop offset="50%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>

              <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
                {/* Y gridlines */}
                {yTicks.map((v) => (
                  <g key={v}>
                    <line
                      x1={0}
                      x2={innerW}
                      y1={y(v)}
                      y2={y(v)}
                      stroke="currentColor"
                      strokeOpacity={0.08}
                      strokeDasharray="2 4"
                    />
                    <text
                      x={-10}
                      y={y(v)}
                      dy={3}
                      textAnchor="end"
                      fontSize="11"
                      className="fill-slate-400 tabular-nums dark:fill-slate-500"
                    >
                      {v}
                    </text>
                  </g>
                ))}

                {/* X-axis labels */}
                {points.map((p) => (
                  <text
                    key={p.weekIndex}
                    x={x(p.weekIndex)}
                    y={innerH + 22}
                    textAnchor="middle"
                    fontSize="11"
                    className="fill-slate-400 dark:fill-slate-500"
                  >
                    {p.weekLabel}
                  </text>
                ))}

                {/* Confidence band (low-high) */}
                {hasData && <path d={bandPath} fill="url(#predicted-band)" opacity={0.7} />}

                {/* Midline */}
                {hasData && (
                  <path
                    d={midPath}
                    stroke="url(#predicted-line)"
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Week dots */}
                {points.map((p) => (
                  <g key={p.weekIndex}>
                    <circle
                      cx={x(p.weekIndex)}
                      cy={y(p.scoreMid)}
                      r={p.source === "diagnostic" ? 6 : 4}
                      fill={p.source === "diagnostic" ? "#38bdf8" : "#a855f7"}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                    {/* Tooltip hover-area */}
                    <title>
                      {p.weekLabel}: {p.scoreLow}–{p.scoreHigh} · {p.masteredSoFar} mastered ·{" "}
                      {p.source}
                    </title>
                  </g>
                ))}

                {/* Axis lines */}
                <line
                  x1={0}
                  x2={innerW}
                  y1={innerH}
                  y2={innerH}
                  stroke="currentColor"
                  strokeOpacity={0.2}
                />
                <line x1={0} x2={0} y1={0} y2={innerH} stroke="currentColor" strokeOpacity={0.2} />
              </g>
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
              Diagnostic
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              Weekly projection
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded bg-gradient-to-r from-sky-400/30 to-pink-400/20" />
              Confidence range
            </span>
          </div>
        </div>

        {/* Methodology */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <strong className="text-slate-700 dark:text-slate-300">How this is calculated:</strong>{" "}
            your Karman diagnostic sets a baseline score range. Each node you master between then
            and now adds approximately +8 points to both the low and high ends of your projected
            range. A refreshed diagnostic re-anchors the line. Real SAT prediction will get more
            precise as Karman collects more usage data.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
