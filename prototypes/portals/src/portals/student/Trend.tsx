import { useRef, useState } from "react";
import { cn } from "@/design-system/cn";
import { useWidth } from "@/design-system/components/hooks";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { Sparkline } from "@/design-system/components/Sparkline";
import { DataTable } from "@/design-system/components/DataTable";
import { fmtDate } from "@/mock";
import { readPref, writePref, useExtra } from "./nav";

/*
 * The score trend, three working options for the founder, switchable here and
 * remembered on this device. The milestone ladder is the recommended pick:
 * each full-length test is a point on a vertical scale toward the target, and
 * the predicted score is the top mark. It is the student portal's signature
 * element: the climb, drawn as a ladder with a rung every 50 points. The
 * vertical rail with a date beside each mark follows Milestone Timeline
 * (21st.dev 28384, olewandowski1); its badges, icons and copy were not ported.
 */
export type TrendOption = "ladder" | "sparkline" | "table";
export const TREND_PICK: TrendOption = "ladder";
const OPTIONS: TrendOption[] = ["ladder", "sparkline", "table"];

/** The option: a `trend=` hash parameter (a gallery link) wins, then this device's choice, then the pick. */
export function useTrendOption(): [TrendOption, (o: TrendOption) => void] {
  const fromHash = useExtra("trend");
  const [o, setO] = useState<TrendOption>(() => readPref("karman-trend", OPTIONS, TREND_PICK));
  const current = OPTIONS.includes(fromHash as TrendOption) ? (fromHash as TrendOption) : o;
  return [
    current,
    (v) => {
      setO(v);
      writePref("karman-trend", v);
    },
  ];
}

export function TrendSwitch({
  value,
  onChange,
}: {
  value: TrendOption;
  onChange(o: TrendOption): void;
}) {
  return (
    <GlassSegmented
      label="Score trend as"
      value={value}
      onChange={(v) => onChange(v as TrendOption)}
      options={[
        { value: "ladder", label: "Ladder" },
        { value: "sparkline", label: "Sparkline" },
        { value: "table", label: "Table" },
      ]}
    />
  );
}

export interface TrendPoint {
  label: string;
  date: string;
  score: number;
}
export interface TrendProps {
  option: TrendOption;
  points: TrendPoint[];
  predicted: number | null;
  target: number;
  satDate: string;
  compact?: boolean;
  className?: string;
}

const fmt = (n: number) => n.toLocaleString("en-US");

export function Trend({
  option,
  points,
  predicted,
  target,
  satDate,
  compact,
  className,
}: TrendProps) {
  if (option === "sparkline") {
    const data = [...points.map((p) => p.score), ...(predicted !== null ? [predicted] : [])];
    const labels = [
      ...points.map((p) => fmtDate(p.date)),
      ...(predicted !== null ? ["Today"] : []),
    ];
    return (
      <Sparkline
        data={data}
        labels={labels}
        label="Score"
        width={320}
        height={compact ? 56 : 88}
        format={fmt}
        className={className}
      />
    );
  }
  if (option === "table") {
    const rows = [
      ...points.map((p) => ({ id: p.label, test: p.label, date: fmtDate(p.date), score: p.score })),
      ...(predicted !== null
        ? [
            {
              id: "today",
              test: "If you tested today",
              date: fmtDate("2026-10-31"),
              score: predicted,
            },
          ]
        : []),
      { id: "target", test: "Target", date: fmtDate(satDate), score: target },
    ];
    return (
      <DataTable
        rows={rows}
        rowKey="id"
        caption="Scores by date"
        className={className}
        columns={[
          { key: "test", label: "Test", sortable: false },
          { key: "date", label: "Date", sortable: false },
          {
            key: "score",
            label: "Score",
            numeric: true,
            sortable: false,
            render: (v) => fmt(v as number),
          },
        ]}
      />
    );
  }
  return (
    <Ladder
      points={points}
      predicted={predicted}
      target={target}
      satDate={satDate}
      compact={compact}
      className={className}
    />
  );
}

function Ladder({
  points,
  predicted,
  target,
  satDate,
  compact,
  className,
}: Omit<TrendProps, "option">) {
  const host = useRef<HTMLDivElement>(null);
  const W = Math.max(280, useWidth(host) || 320);
  const scores = [...points.map((p) => p.score), predicted ?? 0, target].filter(Boolean);
  const lo = Math.floor((Math.min(...scores) - 20) / 50) * 50;
  const hi = Math.ceil(Math.max(...scores) / 50) * 50;
  const rungs: number[] = [];
  for (let v = lo; v <= hi; v += 50) rungs.push(v);
  const pitch = compact ? 40 : 52;
  const top = 14;
  const bottom = 14;
  const H = top + bottom + (rungs.length - 1) * pitch;
  const y = (v: number) => top + ((hi - v) / (hi - lo || 1)) * (H - top - bottom);
  const x1 = 58;
  const x2 = 98;
  const xm = (x1 + x2) / 2;
  const climbTop = predicted ?? (points.length ? points[points.length - 1].score : lo);
  const climbFrom = points.length ? points[0].score : lo;
  const marks = [
    ...points.map((p, i) => ({
      y: y(p.score),
      text: `${p.label}, ${fmtDate(p.date)}`,
      value: p.score,
      kind: i === 0 ? "base" : "test",
    })),
    ...(predicted !== null
      ? [{ y: y(predicted), text: "If you tested today", value: predicted, kind: "today" }]
      : []),
    { y: y(target), text: `Target, ${fmtDate(satDate)}`, value: target, kind: "target" },
  ].sort((a, b) => a.y - b.y);
  // Labels never collide: push each one below the previous by at least 16px.
  const labelY: number[] = [];
  marks.forEach((m, i) => {
    labelY[i] = i === 0 ? m.y : Math.max(m.y, labelY[i - 1] + 16);
  });
  const extra = Math.max(0, (labelY[labelY.length - 1] ?? 0) + 6 - H);
  return (
    <figure
      ref={host}
      className={cn("w-full", className)}
      aria-label={`Score ladder: ${marks.map((m) => `${m.text} ${fmt(m.value)}`).join("; ")}`}
    >
      <svg
        viewBox={`0 0 ${W} ${H + extra}`}
        width="100%"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        <rect
          x={x1}
          y={y(climbTop)}
          width={x2 - x1}
          height={Math.max(0, y(climbFrom) - y(climbTop))}
          fill="rgb(var(--k-accent) / 0.16)"
        />
        <line
          x1={x1}
          x2={x1}
          y1={top}
          y2={H - bottom}
          stroke="rgb(var(--k-border))"
          strokeWidth="2"
        />
        <line
          x1={x2}
          x2={x2}
          y1={top}
          y2={H - bottom}
          stroke="rgb(var(--k-border))"
          strokeWidth="2"
        />
        {rungs.map((v) => (
          <g key={v}>
            <line
              x1={x1}
              x2={x2}
              y1={y(v)}
              y2={y(v)}
              stroke={
                v <= climbTop && v >= climbFrom ? "rgb(var(--k-accent))" : "rgb(var(--k-border))"
              }
              strokeWidth={v === target ? 3 : 2}
            />
            <text
              x={x1 - 8}
              y={y(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="rgb(var(--k-muted))"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmt(v)}
            </text>
          </g>
        ))}
        {marks.map((m, i) => (
          <g key={m.text}>
            {m.kind === "today" ? (
              <rect
                x={xm - 7}
                y={m.y - 7}
                width={14}
                height={14}
                transform={`rotate(45 ${xm} ${m.y})`}
                fill="rgb(var(--k-accent))"
              />
            ) : m.kind === "target" ? null : (
              <circle
                cx={xm}
                cy={m.y}
                r={5}
                fill={m.kind === "base" ? "rgb(var(--k-panel))" : "rgb(var(--k-accent))"}
                stroke="rgb(var(--k-accent))"
                strokeWidth="2"
              />
            )}
            <line x1={x2 + 4} x2={x2 + 18} y1={m.y} y2={labelY[i]} stroke="rgb(var(--k-line))" />
            <text
              x={x2 + 22}
              y={labelY[i] + 4}
              fontSize="12"
              fill="rgb(var(--k-text))"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              <tspan fontWeight="600">{fmt(m.value)}</tspan>
              <tspan fill="rgb(var(--k-muted))"> {m.text}</tspan>
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
