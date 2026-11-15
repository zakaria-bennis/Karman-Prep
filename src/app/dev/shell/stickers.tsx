// Karman's own menu stickers, drawn here in code (no icon library). Each is a small filled picture from
// the portal's world, in the fox's colours, with a pale die-cut edge so it reads on glass over any land.
import type { ReactNode } from "react";

export type StickerName =
  | "homework"
  | "library"
  | "practice"
  | "class"
  | "schedule"
  | "progress"
  | "rewards"
  | "chat"
  | "settings"
  | "more";

const INK = "#2a2030";
const CREAM = "#fff8ee";
const SAND = "#ead9bd";
const FOX = "#e89a2c";
const HONEY = "#f6b652";
const LEAF = "#5e9c6b";
const PINE = "#3f7a55";
const SKY = "#6aa5dc";
const DEEP = "#4479b8";
const ROSE = "#ef8577";
const LILAC = "#9a8fd0";

const ART: Record<StickerName, ReactNode> = {
  // a page with its corner folded and a green seal: done
  homework: (
    <>
      <path d="M12 6h16l9 9v24a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill={CREAM} />
      <path d="M28 6l9 9h-6a3 3 0 0 1-3-3z" fill={SAND} />
      <path d="M14 17h10M14 23h14M14 29h7" stroke={SAND} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="33" cy="34" r="9" fill={LEAF} />
      <path
        d="M28.6 34.2l3.1 3.1 5.6-6"
        stroke={CREAM}
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  // two books and a leaf for a bookmark
  library: (
    <>
      <rect x="7" y="29" width="34" height="11" rx="3" fill={PINE} />
      <path d="M11 32h27v5H11z" fill={CREAM} />
      <g transform="rotate(-7 24 22)">
        <rect x="10" y="16" width="29" height="11" rx="3" fill={FOX} />
        <path d="M14 19h22v5H14z" fill={CREAM} />
        <path d="M17 16h5v11h-5z" fill={HONEY} />
      </g>
      <path d="M29 4c7 0 10 4 10 10-7 0-10-4-10-10z" fill={LEAF} />
      <path d="M30.5 5.5l6 6" stroke={PINE} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  // a pencil, mid-stroke
  practice: (
    <>
      <g transform="rotate(42 24 24)">
        <rect x="18.5" y="3" width="11" height="8" rx="3" fill={ROSE} />
        <path d="M18.5 10h11v4h-11z" fill="#c9ced6" />
        <path d="M18.5 14h11v19h-11z" fill={FOX} />
        <path d="M22.2 14h3.6v19h-3.6z" fill={HONEY} />
        <path d="M18.5 33h11L24 44z" fill={CREAM} />
        <path d="M21.9 39.8h4.2L24 44z" fill={INK} />
      </g>
      <path
        d="M6 40c4-3 8 2 12-1"
        stroke={INK}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  // the live class: a lit screen with a play mark and a live dot
  class: (
    <>
      <rect x="5" y="9" width="38" height="26" rx="6" fill={DEEP} />
      <rect x="8.5" y="12.5" width="31" height="19" rx="3.5" fill={SKY} />
      <path
        d="M20.5 16.5l9 5.5-9 5.5z"
        fill={CREAM}
        stroke={CREAM}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M18 35h12l2 6H16z" fill={DEEP} />
      <rect x="12" y="40" width="24" height="3.5" rx="1.75" fill={INK} />
      <circle cx="38" cy="10" r="5" fill={ROSE} />
    </>
  ),
  // a calendar page with the sun on it
  schedule: (
    <>
      <rect x="7" y="9" width="34" height="33" rx="6" fill={CREAM} />
      <path d="M7 15a6 6 0 0 1 6-6h22a6 6 0 0 1 6 6v5H7z" fill={ROSE} />
      <path d="M16 5v8M32 5v8" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="24" cy="31" r="5.2" fill={HONEY} />
      <path
        d="M24 22.5v2M24 37.5v2M15.5 31h2M30.5 31h2M18 25l1.4 1.4M28.6 35.6L30 37M30 25l-1.4 1.4M19.4 35.6L18 37"
        stroke={FOX}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  // a peak with snow and a flag on top
  progress: (
    <>
      <path d="M3 41l13-21 12 21z" fill={LILAC} />
      <path d="M12 41L29 12l16 29z" fill={LEAF} />
      <path d="M29 12l-5.6 9.6 3.4-1.8 2.2 3 2.4-3 3.2 1.6z" fill={CREAM} />
      <path d="M29 13V4" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M29 4l9 3.2-9 3.2z" fill={FOX} />
    </>
  ),
  // a Karman coin
  rewards: (
    <>
      <circle cx="24" cy="25" r="17" fill="#cc8020" />
      <circle cx="24" cy="23" r="17" fill={FOX} />
      <circle cx="24" cy="23" r="12.5" fill={HONEY} />
      <path
        d="M19.5 16v14M28.5 16l-8 7 8 7"
        stroke={CREAM}
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M39 4l1.2 3.3L43.5 8.5l-3.3 1.2L39 13l-1.2-3.3-3.3-1.2 3.3-1.2z" fill={CREAM} />
    </>
  ),
  // two speech bubbles
  chat: (
    <>
      <path
        d="M9 7h21a6 6 0 0 1 6 6v9a6 6 0 0 1-6 6H18l-7 6v-6.3A6 6 0 0 1 5 22v-9a6 6 0 0 1 6-6z"
        fill={SKY}
      />
      <path
        d="M22 21h16a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5v5l-6-5H22a5 5 0 0 1-5-5v-7a5 5 0 0 1 5-5z"
        fill={CREAM}
      />
      <circle cx="24.5" cy="29.5" r="1.9" fill={INK} />
      <circle cx="30" cy="29.5" r="1.9" fill={INK} />
      <circle cx="35.500" cy="29.5" r="1.9" fill={INK} />
    </>
  ),
  // a cog
  settings: (
    <>
      <circle
        cx="24"
        cy="24"
        r="14.5"
        fill="none"
        stroke={LILAC}
        strokeWidth="8"
        strokeDasharray="6.3 5.09"
      />
      <circle cx="24" cy="24" r="12.5" fill={LILAC} />
      <circle cx="24" cy="24" r="5" fill={CREAM} />
    </>
  ),
  // three river pebbles
  more: (
    <>
      <ellipse cx="10.5" cy="26" rx="6.5" ry="6" fill={FOX} />
      <ellipse cx="24" cy="23" rx="7" ry="6.5" fill={LEAF} />
      <ellipse cx="37.500" cy="26" rx="6.5" ry="6" fill={SKY} />
    </>
  ),
};

/** One sticker. The art is drawn twice: once fat and pale underneath (the die-cut edge), once on top. */
export function Sticker({ name, size = 32 }: { name: StickerName; size?: number }) {
  return (
    <svg
      viewBox="-3 -3 54 54"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-sticker
    >
      <g data-cut>{ART[name]}</g>
      <g>{ART[name]}</g>
    </svg>
  );
}
