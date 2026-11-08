"use client";
// Karman's reward drawings: small Hairline-style line pictures on the sky theme. Each draws itself
// in under 0.7 s; under reduced motion it appears whole.
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Part = { d: string; dot?: boolean };
const DRAWINGS: Record<string, Part[]> = {
  constellation: [
    { d: "M6 30 L18 14 L32 22 L46 8 L58 18" },
    { d: "M6 30h.01M18 14h.01M32 22h.01M46 8h.01M58 18h.01", dot: true },
  ],
  rocket: [
    { d: "M4 32 H60", dot: false },
    { d: "M32 30 C26 22 28 12 32 4 C36 12 38 22 32 30 Z" },
    { d: "M28 24 L24 30 M36 24 L40 30" },
    { d: "M32 32 V38" },
  ],
  ring: [
    { d: "M32 20 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0" },
    { d: "M12 24 C20 30 44 30 52 20 C56 14 44 12 32 16" },
  ],
  comet: [
    { d: "M48 10 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" },
    { d: "M45 13 L10 34 M47 15 L18 36 M43 12 L8 28" },
  ],
  orbit: [
    { d: "M32 20 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" },
    { d: "M32 20 m-24 0 a24 10 0 1 0 48 0 a24 10 0 1 0 -48 0" },
    { d: "M54 16h.01", dot: true },
  ],
  satellite: [
    { d: "M26 16 h12 v8 h-12 Z" },
    { d: "M10 14 h12 v12 h-12 Z M42 14 h12 v12 h-12 Z" },
    { d: "M32 24 V32 M28 34 h8" },
  ],
  telescope: [
    { d: "M14 26 L44 10 L48 18 L18 34 Z" },
    { d: "M30 26 L24 38 M30 26 L38 38" },
    { d: "M54 6h.01 M58 14h.01", dot: true },
  ],
  "shooting-star": [
    { d: "M8 34 L40 14" },
    { d: "M44 12 l3 -6 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 z" },
  ],
};
export const DRAWING_NAMES = Object.keys(DRAWINGS);

export function RewardDrawing({
  name,
  reduced,
  size = 56,
}: {
  name: string;
  reduced: boolean;
  size?: number;
}) {
  const parts = DRAWINGS[name] ?? DRAWINGS.constellation;
  return (
    <svg
      width={size}
      height={(size * 40) / 64}
      viewBox="0 0 64 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-drawing={name}
      data-static={reduced || undefined}
    >
      {parts.map((p, i) => (
        <motion.path
          key={i}
          d={p.d}
          strokeWidth={p.dot ? 4 : 1.6}
          initial={reduced ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: i * 0.12, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}

/** A larger constellation that joins star by star, for the level-up card. */
export function LevelUpConstellation({ reduced }: { reduced: boolean }): ReactNode {
  const stars = [
    [10, 60],
    [34, 30],
    [62, 44],
    [90, 16],
    [118, 38],
    [146, 12],
  ];
  return (
    <svg
      width="160"
      height="72"
      viewBox="0 0 160 72"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      {stars.slice(1).map(([x, y], i) => (
        <motion.line
          key={i}
          x1={stars[i][0]}
          y1={stars[i][1]}
          x2={x}
          y2={y}
          strokeWidth={1.4}
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.18, delay: 0.15 + i * 0.16 }}
        />
      ))}
      {stars.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r={3}
          fill="currentColor"
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 14, delay: i * 0.16 }}
        />
      ))}
    </svg>
  );
}
