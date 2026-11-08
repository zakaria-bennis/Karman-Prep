"use client";

import { fmtMoney } from "./format";

export interface PieSlice {
  tier: string;
  label: string;
  value: number;
  color: string;
}

const T = (fill: string) => ({ fill, fontFamily: "inherit" });

export function PieChart({
  slices,
  total,
  hovered,
  onHover,
}: {
  slices: PieSlice[];
  total: number;
  hovered: string | null;
  onHover: (tier: string | null) => void;
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  if (total === 0) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="No revenue yet"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          strokeWidth={28}
          style={{ fill: "none", stroke: "var(--line)" }}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fontWeight={600}
          style={T("var(--mute)")}
        >
          No revenue yet
        </text>
      </svg>
    );
  }
  let acc = 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Revenue by plan, ${fmtMoney(total)} a month`}
    >
      {slices
        .filter((s) => s.value > 0)
        .map((s) => {
          const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
          const end = ((acc + s.value) / total) * Math.PI * 2 - Math.PI / 2;
          acc += s.value;
          const isHovered = hovered === s.tier;
          const slR = isHovered ? r + 6 : r;
          const x1 = cx + slR * Math.cos(start);
          const y1 = cy + slR * Math.sin(start);
          const x2 = cx + slR * Math.cos(end);
          const y2 = cy + slR * Math.sin(end);
          const largeArc = end - start > Math.PI ? 1 : 0;
          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${slR} ${slR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          return (
            <path
              key={s.tier}
              d={d}
              opacity={hovered && hovered !== s.tier ? 0.5 : 1}
              style={{ fill: s.color, transition: "opacity 0.15s ease" }}
              onMouseEnter={() => onHover(s.tier)}
              onMouseLeave={() => onHover(null)}
            >
              <title>{`${s.label}: ${fmtMoney(s.value)}`}</title>
            </path>
          );
        })}
      <circle cx={cx} cy={cy} r={50} style={{ fill: "var(--bg, Canvas)" }} />
      <text
        x={cx}
        y={cy + 2}
        textAnchor="middle"
        fontSize="18"
        fontWeight={600}
        style={T("var(--ink)")}
      >
        {fmtMoney(total)}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="11" style={T("var(--mute)")}>
        a month
      </text>
    </svg>
  );
}
