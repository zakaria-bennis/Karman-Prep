/**
 * The mystery box, ported from prototypes/daily10-end/parts.js (P.mystery and
 * P.boxIcon): an isometric gift box in the theme accent, ribbon in the
 * surface tint. The opening sequence is the Daily 10 agent's job; this is the
 * still box and its small icon.
 */
const rib = "color-mix(in srgb, rgb(var(--k-surface)) 88%, rgb(var(--k-text)))";
const ribD = "color-mix(in srgb, rgb(var(--k-surface)) 70%, rgb(var(--k-text)))";
const accent = "rgb(var(--k-accent))";
const mixA = (p: number, to: string) => `color-mix(in srgb, ${accent} ${p}%, ${to})`;

export function MysteryBox({ size = 150, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="-60 -80 120 140"
      width={size}
      height={(size * 140) / 120}
      aria-hidden="true"
      className={className}
    >
      <g>
        <path d="M-48 -19 L0 5 L0 49 L-48 25 Z" fill={accent} />
        <path d="M-29 -28.5 L-19 -23.5 L-19 39.5 L-29 34.5 Z" fill={rib} />
        <path d="M48 -19 L0 5 L0 49 L48 25 Z" fill={mixA(76, "#000")} />
        <path d="M19 -23.5 L29 -28.5 L29 34.5 L19 39.5 Z" fill={ribD} />
      </g>
      <g>
        <path d="M-48 -31 L0 -7 L0 5 L-48 -19 Z" fill={mixA(88, "#000")} />
        <path d="M48 -31 L0 -7 L0 5 L48 -19 Z" fill={mixA(66, "#000")} />
        <path d="M0 -55 L48 -31 L0 -7 L-48 -31 Z" fill={mixA(80, "#fff")} />
        <path
          d="M-29 -40.5 L19 -16.5 L29 -21.5 L-19 -45.5 Z M19 -45.5 L29 -40.5 L-19 -16.5 L-29 -21.5 Z"
          fill={rib}
        />
        <path d="M-29 -28.5 L-19 -23.5 L-19 -11.5 L-29 -16.5 Z" fill={ribD} />
        <path d="M19 -23.5 L29 -28.5 L29 -16.5 L19 -11.5 Z" fill={ribD} />
        <path
          d="M0 -33 C-10 -52 -30 -50 -22 -38 C-17 -32 -7 -33 0 -33 C7 -33 17 -32 22 -38 C30 -50 10 -52 0 -33 Z"
          fill={rib}
          stroke={ribD}
          strokeWidth="1.5"
        />
        <ellipse cx="0" cy="-33" rx="5" ry="3.6" fill={ribD} />
      </g>
    </svg>
  );
}

/** The same box at icon size (22 to 36 px) for counters and rows. */
export function BoxIcon({ size = 24 }: { size?: number }) {
  return <MysteryBox size={size} />;
}
