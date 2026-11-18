"use client";

/*
 * The Challenge question's own painting (founder, 2026-11-08: "it has its own art, design and
 * animation"). Drawn in code, in the day painting's style: a sky in the painting's light (dawn,
 * day, sunset or night), the land in the painting's hue, a still lake, pines at the edges, and
 * two bright stars rising over the ridge, one for each of today's questions, twinkling softly
 * among a few small background stars (founder, 2026-11-08: "it can be stars, but make them look
 * nicer and cleaner, and I want them to twinkle"). Stars are round points of light with a soft
 * halo, never four-point sparkle shapes. Reduced motion: no twinkle. Brush edges come
 * from an SVG displacement filter, so the shapes read as paint rather than vector.
 *
 * Everything moves only on entrance, then holds still (nothing moves behind text).
 */
import { motion, type Transition } from "framer-motion";
import type { TimeOfDay } from "@/lib/painting/light";
import styles from "./challenge.module.css";

const settle: Transition = { type: "spring", stiffness: 70, damping: 18, mass: 1 };

/** A pine, as a stack of ragged tiers. x is the trunk, y the ground, h the height. */
function pine(x: number, y: number, h: number): string {
  const tiers = 6;
  let d = `M${x} ${y - h}`;
  for (let i = 1; i <= tiers; i++) {
    const ty = y - h + (h * i) / tiers;
    const w = (h * 0.34 * i) / tiers + 4;
    d += ` L${x + w} ${ty} L${x + w * 0.35} ${ty - 3}`;
  }
  for (let i = tiers; i >= 1; i--) {
    const ty = y - h + (h * i) / tiers;
    const w = (h * 0.34 * i) / tiers + 4;
    d += ` L${x - w * 0.35} ${ty - 3} L${x - w} ${ty}`;
  }
  return `${d} Z M${x - 3} ${y} h6 v14 h-6 Z`;
}

/** A row of pines along a slope, deterministic so every render matches. */
function grove(x0: number, x1: number, ground: (x: number) => number, base: number): string {
  let d = "";
  let k = 0;
  for (let x = x0; x <= x1; x += 26 + ((k * 37) % 19)) {
    const h = base + ((k * 53) % 41);
    d += pine(x, ground(x), h) + " ";
    k++;
  }
  return d;
}

/** Small background stars: x, y, radius (viewBox units), all in the sky above the ridge. */
const SMALL_STARS: [number, number, number][] = [
  [140, 120, 7],
  [262, 210, 5],
  [380, 90, 6],
  [560, 250, 5],
  [760, 80, 7],
  [1010, 120, 6],
  [1100, 300, 5],
  [300, 330, 4.5],
  [820, 360, 4.5],
  [60, 300, 5],
];

/** Loose sky strokes, Bob Ross style: start x, y, end x, width, how much each one bows. */
const SKY_STROKES: [number, number, number, number, number][] = [
  [-40, 78, 520, 26, 10],
  [380, 104, 1240, 18, 8],
  [60, 168, 760, 16, 14],
  [640, 196, 1180, 22, 6],
  [-20, 262, 420, 14, 8],
  [520, 318, 1010, 12, 10],
  [180, 352, 640, 10, 6],
];

const LAYERS = [
  {
    cls: "far",
    d: "M0 520 L90 470 L170 488 L260 420 L330 452 L420 380 L500 430 L590 400 L700 446 L780 410 L880 440 L960 392 L1060 436 L1130 418 L1200 440 L1200 800 L0 800 Z",
    rise: 30,
  },
  {
    cls: "mid",
    d: "M0 560 L120 520 L210 540 L300 492 L390 530 L470 506 L560 548 L660 516 L760 552 L850 512 L950 540 L1050 500 L1200 536 L1200 800 L0 800 Z",
    rise: 50,
  },
  {
    cls: "near",
    d: "M0 600 C140 572 260 590 380 584 C520 578 600 598 720 592 C860 586 980 570 1200 590 L1200 800 L0 800 Z",
    rise: 70,
  },
];

export default function ChallengeArt({ time, still }: { time: TimeOfDay; still: boolean }) {
  const enter = (delay: number, y = 0) =>
    still
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { ...settle, delay },
        };
  const draw = (delay: number) =>
    still
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration: 1.1, ease: [0.45, 0, 0.2, 1] as const, delay },
        };
  const pop = (delay: number) =>
    still
      ? {}
      : {
          initial: { scale: 0, rotate: 45, opacity: 0 },
          animate: { scale: 1, rotate: 0, opacity: 1 },
          transition: { type: "spring" as const, stiffness: 260, damping: 14, delay },
        };

  const leftGround = (x: number) => 650 - x * 0.12;
  const rightGround = (x: number) => 610 + (x - 1000) * 0.2;

  return (
    <motion.svg
      className={styles.art}
      data-time={time}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      {...(still
        ? {}
        : {
            initial: { scale: 1.08 },
            animate: { scale: 1 },
            transition: { duration: 1.8, ease: [0.16, 1, 0.3, 1] },
          })}
    >
      <defs>
        <linearGradient id="ch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.sky1} />
          <stop offset="0.55" className={styles.sky2} />
          <stop offset="0.78" className={styles.sky3} />
        </linearGradient>
        <radialGradient id="ch-glow">
          <stop offset="0" className={styles.glowIn} />
          <stop offset="1" className={styles.glowOut} />
        </radialGradient>
        <radialGradient id="ch-star-glow">
          <stop offset="0" className={styles.starGlowIn} />
          <stop offset="1" className={styles.starGlowOut} />
        </radialGradient>
        {/* A star's halo: bright at the middle, falling off fast, like a real point of light. */}
        <radialGradient id="ch-star-halo">
          <stop offset="0" stopColor="#fffdf6" stopOpacity="1" />
          <stop offset="0.18" stopColor="#fff6dc" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#ffeec4" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ffeec4" stopOpacity="0" />
        </radialGradient>
        {/* Ragged brush edges on every land shape. */}
        <filter id="ch-brush" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.08" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="12" />
        </filter>
        {/* Canvas grain over the whole picture. */}
        <filter id="ch-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.09 0" />
        </filter>
      </defs>

      <rect width="1200" height="800" fill="url(#ch-sky)" />
      {/* Bob Ross's sky: long, loose horizontal strokes. */}
      <g className={styles.skyStrokes} filter="url(#ch-brush)">
        {SKY_STROKES.map(([x0, y, x1, w, lift]) => (
          <path
            key={`${x0}-${y}`}
            d={`M${x0} ${y} C${x0 + (x1 - x0) * 0.35} ${y - lift} ${x0 + (x1 - x0) * 0.7} ${y + lift} ${x1} ${y - lift / 3}`}
            strokeWidth={w}
          />
        ))}
      </g>

      <motion.g {...enter(0.15, 60)}>
        <circle cx="880" cy="250" r="190" fill="url(#ch-glow)" />
        <circle cx="880" cy="250" r="58" className={styles.orb} filter="url(#ch-brush)" />
      </motion.g>

      {/* Two trails rising from the ridge to two dots of light: today's two questions. */}
      <g className={styles.trails} fill="none">
        <motion.path d="M330 452 C360 330 400 250 470 190" {...draw(0.55)} />
        <motion.path d="M700 446 C690 330 660 220 640 140" {...draw(0.75)} />
      </g>
      {/* A few small background stars, twinkling out of step. */}
      <g aria-hidden="true">
        {SMALL_STARS.map(([x, y, r], i) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={r}
            fill="url(#ch-star-halo)"
            className={styles.twinkle}
            style={{
              animationDelay: `${(i * 0.73) % 3.1}s`,
              animationDuration: `${2.6 + (i % 4) * 0.7}s`,
            }}
          />
        ))}
      </g>
      {[
        { x: 470, y: 190, s: 1, d: 1.5 },
        { x: 640, y: 140, s: 1.25, d: 1.7 },
      ].map((st, i) => (
        <g key={st.x} transform={`translate(${st.x} ${st.y}) scale(${st.s})`}>
          <motion.g {...pop(st.d)}>
            <circle r="70" fill="url(#ch-star-glow)" />
            {/* The star: a wide soft halo that breathes, a crisp round core, and two tiny round
                glints that come and go beside it. */}
            <circle
              r="30"
              fill="url(#ch-star-halo)"
              className={styles.halo}
              style={{ animationDelay: `${i * 1.1}s` }}
            />
            <circle r="5.5" className={styles.core} />
            <circle
              cx="13"
              cy="-11"
              r="1.8"
              className={styles.glint}
              style={{ animationDelay: `${0.4 + i * 0.9}s` }}
            />
            <circle
              cx="-15"
              cy="9"
              r="1.4"
              className={styles.glint}
              style={{ animationDelay: `${1.6 + i * 0.7}s` }}
            />
          </motion.g>
        </g>
      ))}

      {LAYERS.map((l, i) => (
        <motion.path
          key={l.cls}
          d={l.d}
          className={styles[l.cls]}
          filter="url(#ch-brush)"
          {...enter(0.05 + i * 0.08, l.rise)}
        />
      ))}

      {/* The lake, with the orb's broken reflection. */}
      <motion.g {...enter(0.3, 40)}>
        <path
          d="M0 640 C300 628 900 632 1200 640 L1200 800 L0 800 Z"
          className={styles.water}
          filter="url(#ch-brush)"
        />
        <g className={styles.ripples} filter="url(#ch-brush)">
          {[652, 668, 686, 706].map((y, i) => (
            <path
              key={y}
              d={`M${840 - 40 + i * 6} ${y} h${80 - i * 14}`}
              strokeWidth={4 - i * 0.6}
            />
          ))}
        </g>
      </motion.g>

      <motion.g className={styles.pines} filter="url(#ch-brush)" {...enter(0.22, 90)}>
        <path d={grove(-10, 250, leftGround, 120)} />
        <path d={grove(1010, 1220, rightGround, 110)} />
        <path d="M0 640 C120 618 220 626 300 652 L300 800 L0 800 Z M1000 620 C1080 600 1160 604 1200 612 L1200 800 L960 800 Z" />
      </motion.g>

      <rect width="1200" height="800" filter="url(#ch-grain)" opacity="0.6" />
    </motion.svg>
  );
}
