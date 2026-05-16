"use client";

import { fmtMoney } from "./format";

export interface PieSlice {
  tier: string;
  label: string;
  value: number;
  color: string;
}

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
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={28}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#64748b"
          fontSize="12"
          fontWeight={600}
        >
          No revenue yet
        </text>
      </svg>
    );
  }
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
              fill={s.color}
              opacity={hovered && hovered !== s.tier ? 0.5 : 1}
              style={{ transition: "opacity 0.15s ease" }}
              onMouseEnter={() => onHover(s.tier)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
      <circle cx={cx} cy={cy} r={50} fill="#0f172a" />
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight={700}>
        MONTHLY
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#fff" fontSize="18" fontWeight={800}>
        {fmtMoney(total)}
      </text>
    </svg>
  );
}
