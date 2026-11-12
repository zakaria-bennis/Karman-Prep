"use client";
/*
 * The box: squared, flat, no machine and no shadow (the approved Daily 10 box, moved here so the
 * Daily 10 ending and the Rewards page share one). It drops in and shivers; `wait` keeps it hopping
 * now and then, `shake` rattles it while a prize is picked, and `open` knocks the lid up on its
 * hinge and throws tokens out, each on its own arc. Everything holds still under reduced motion.
 */
import type { CSSProperties } from "react";
import s from "./rewards.module.css";

/** Where each token is thrown: how far sideways, and how high it flies before it falls. */
const TOSSES = [
  { dx: -58, dy: -74 },
  { dx: -26, dy: -96 },
  { dx: 6, dy: -104 },
  { dx: 34, dy: -90 },
  { dx: 62, dy: -70 },
];

export function RewardBox({
  open = false,
  wait = false,
  shake = false,
  tokens = true,
  size = 180,
}: {
  open?: boolean;
  wait?: boolean;
  shake?: boolean;
  /** Throw tokens out when it opens (the Daily 10's payout); a mystery box holds a prize instead. */
  tokens?: boolean;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 160 150"
      className={s.box}
      style={{ width: size }}
      data-open={open}
      data-wait={wait && !open && !shake}
      data-shake={shake && !open}
      aria-hidden="true"
    >
      {tokens && (
        <g>
          {/* Each token is thrown out of the box on its own arc: sideways at a steady speed
              (the outer group), up and then falling back under gravity (the inner one). */}
          {TOSSES.map((t, i) => (
            <g
              key={i}
              className={s.tokenX}
              style={{ "--dx": `${t.dx}px`, animationDelay: `${i * 55}ms` } as CSSProperties}
            >
              <g
                className={s.tokenY}
                style={{ "--dy": `${t.dy}px`, animationDelay: `${i * 55}ms` } as CSSProperties}
              >
                <circle cx="80" cy="74" r="7" className={s.token} />
                <path d="M77 74h6" className={s.tokenMark} />
              </g>
            </g>
          ))}
        </g>
      )}
      <rect x="28" y="70" width="104" height="70" rx="4" className={s.boxBody} />
      <path d="M80 70v70" className={s.boxRibbon} />
      <g className={s.boxLid}>
        <rect x="22" y="56" width="116" height="18" rx="4" className={s.boxLidFill} />
        <path d="M80 56v18" className={s.boxRibbon} />
      </g>
    </svg>
  );
}

/** One token, drawn like the ones the box throws. */
export function TokenIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={s.tokenIcon} aria-hidden="true">
      <circle cx="10" cy="10" r="8" className={s.token} />
      <path d="M6.6 10h6.8" className={s.tokenMark} />
    </svg>
  );
}

/** Thin rays turning slowly behind a new companion or a prize. */
export function Rays() {
  return (
    <span className={s.rays} aria-hidden="true">
      <svg viewBox="-50 -50 100 100">
        {Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d={i % 2 ? "M-1 -12 L0 -34 L1 -12Z" : "M-1.8 -12 L0 -48 L1.8 -12Z"}
            transform={`rotate(${i * 22.5})`}
            opacity={i % 2 ? 0.45 : 0.7}
          />
        ))}
      </svg>
    </span>
  );
}
