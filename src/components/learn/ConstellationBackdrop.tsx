"use client";

// Static sky behind the constellation: gradients, nebulae, parallax
// star field, atmospheric tier labels and bands. Split out of
// ConstellationMap.tsx.

import { motion, type MotionValue } from "framer-motion";
import { W, H, BG_STARS, NEBULAE } from "./ConstellationMapHelpers";

interface Props {
  reduceMotion: boolean | null;
  parallaxTransformX: MotionValue<number>;
  parallaxTransformY: MotionValue<number>;
}

export default function ConstellationBackdrop({
  reduceMotion,
  parallaxTransformX,
  parallaxTransformY,
}: Props) {
  return (
    <>
      <defs>
        {/* Warm-night vertical gradient: lamp-warmth near the
                Troposphere (bottom), near-black at the top */}
        <linearGradient id="space-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#040302" />
          <stop offset="40%" stopColor="#070605" />
          <stop offset="75%" stopColor="#0d0a08" />
          <stop offset="100%" stopColor="#1a1610" />
        </linearGradient>

        {/* Soft nebulae (extremely faint subject washes) */}
        <radialGradient id="nebula-pink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d84f73" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#d84f73" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="nebula-cyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2fa8ff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#2fa8ff" stopOpacity="0" />
        </radialGradient>

        {/* Star halos per subject */}
        <radialGradient id="halo-reading" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d84f73" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#d84f73" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#d84f73" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="halo-math" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2fa8ff" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#2fa8ff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#2fa8ff" stopOpacity="0" />
        </radialGradient>

        {/* Gold halo — mastered stars only. Gold is earned. */}
        <radialGradient id="halo-mastered" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e4c86a" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#c8ab6a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#c8ab6a" stopOpacity="0" />
        </radialGradient>

        {/* Glow filter */}
        <filter id="star-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Space background ──────────────────────────────── */}
      <rect width={W} height={H} fill="url(#space-gradient)" />

      {/* Nebulae — one behind each lobe */}
      <ellipse
        cx={NEBULAE[0].cx}
        cy={NEBULAE[0].cy}
        rx={NEBULAE[0].rx}
        ry={NEBULAE[0].ry}
        fill="url(#nebula-pink)"
      />
      <ellipse
        cx={NEBULAE[1].cx}
        cy={NEBULAE[1].cy}
        rx={NEBULAE[1].rx}
        ry={NEBULAE[1].ry}
        fill="url(#nebula-cyan)"
      />

      {/* Background star field — ivory, parallaxes subtly with the cursor */}
      <motion.g
        style={{
          x: reduceMotion ? 0 : parallaxTransformX,
          y: reduceMotion ? 0 : parallaxTransformY,
        }}
      >
        {BG_STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f3ecdd" opacity={s.o} />
        ))}
      </motion.g>

      {/* ── Atmospheric tier labels on the right edge ──── */}
      {[
        { label: "TROPOSPHERE", y: H * 0.88 },
        { label: "MESOSPHERE", y: H * 0.54 },
        { label: "STRATOSPHERE", y: H * 0.13 },
      ].map(({ label, y }) => (
        <text
          key={label}
          x={W - 18}
          y={y}
          textAnchor="end"
          fill="#b8b0a1"
          fillOpacity={0.3}
          fontSize={10}
          fontWeight={500}
          letterSpacing={2.5}
          fontFamily="var(--font-plex-mono), ui-monospace, monospace"
        >
          {label}
        </text>
      ))}

      {/* Faint horizontal atmospheric bands */}
      {[0.33, 0.66].map((fy, i) => (
        <line
          key={i}
          x1={40}
          x2={W - 40}
          y1={H * fy}
          y2={H * fy}
          stroke="#b8b0a1"
          strokeOpacity={0.06}
          strokeDasharray="2 8"
        />
      ))}
    </>
  );
}
