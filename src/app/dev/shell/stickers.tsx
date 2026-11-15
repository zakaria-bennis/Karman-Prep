// Karman's own menu stickers, drawn here in code (no icon library). Each is a small filled picture with
// a pale die-cut edge so it reads on glass over any land. The colours are kept quiet on purpose
// (founder, 2026-11-15: "a little too colorful"): cream, sand and plum ink, with one soft tint each.
// A part marked data-move is the piece that stirs when its row is hovered (see shell.module.css).
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

const INK = "#3b3442";
const CREAM = "#fff8ee";
const SAND = "#e4d5bc";
const CLAY = "#c88e68";
const SAGE = "#8fa68f";
const MIST = "#8fa5bd";
const DUSK = "#a9a3c2";
const HONEY = "#d9b06a";
const WOOD = "#b08a68";

const ART: Record<StickerName, ReactNode> = {
  // a page with its corner folded and a seal: done
  homework: (
    <>
      <path d="M12 6h16l9 9v24a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill={CREAM} />
      <path d="M28 6l9 9h-6a3 3 0 0 1-3-3z" fill={SAND} />
      <path d="M14 17h10M14 23h14M14 29h7" stroke={SAND} strokeWidth="2.6" strokeLinecap="round" />
      <g data-move="pop">
        <circle cx="33" cy="34" r="9" fill={SAGE} />
        <path
          d="M28.600 34.200l3.100 3.100 5.600-6"
          stroke={CREAM}
          strokeWidth="2.800"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </>
  ),
  // books standing on a shelf; one is pulled out when the row is hovered
  library: (
    <>
      <rect x="7" y="11" width="8" height="27" rx="2" fill={SAGE} />
      <path d="M7 17h8M7 32h8" stroke={CREAM} strokeWidth="1.800" />
      <rect x="16" y="15" width="6" height="23" rx="2" fill={SAND} />
      <g data-move="pull">
        <rect x="23" y="8" width="9" height="30" rx="2" fill={CLAY} />
        <path d="M23 14h9M23 31h9" stroke={CREAM} strokeWidth="1.800" />
      </g>
      <g transform="rotate(13 37 38)">
        <rect x="33" y="13" width="7" height="25" rx="2" fill={MIST} />
        <path d="M33 19h7" stroke={CREAM} strokeWidth="1.800" />
      </g>
      <rect x="3" y="38" width="42" height="4.500" rx="2.250" fill={INK} />
    </>
  ),
  // a target with an arrow in the middle
  practice: (
    <>
      <circle cx="22" cy="26" r="17" fill={CREAM} />
      <circle cx="22" cy="26" r="12.500" fill={CLAY} />
      <circle cx="22" cy="26" r="8" fill={CREAM} />
      <circle cx="22" cy="26" r="3.600" fill={CLAY} />
      <g data-move="dart">
        <path d="M22 26L39 9" stroke={INK} strokeWidth="2.800" strokeLinecap="round" />
        <path d="M36 5.500l1.200 5.300 5.300 1.200 3-3.500-4.300-1.200L40 3z" fill={INK} />
      </g>
    </>
  ),
  // the classroom: a chalkboard on its stand
  class: (
    <>
      <path d="M15 35l-4 9M33 35l4 9" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <rect x="4" y="6" width="40" height="29" rx="5" fill={WOOD} />
      <rect x="7.500" y="9.500" width="33" height="22" rx="2.500" fill="#667f72" />
      <g data-move="chalk">
        <path
          d="M13 16h11M13 21.500h16M13 27h7"
          stroke={CREAM}
          strokeWidth="2.200"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
      <rect x="27" y="33" width="9" height="3" rx="1.500" fill={CREAM} />
    </>
  ),
  // a calendar page with the sun on it
  schedule: (
    <>
      <rect x="7" y="9" width="34" height="33" rx="6" fill={CREAM} />
      <path d="M7 15a6 6 0 0 1 6-6h22a6 6 0 0 1 6 6v5H7z" fill={CLAY} />
      <path d="M16 5v8M32 5v8" stroke={INK} strokeWidth="3.200" strokeLinecap="round" />
      <g data-move="spin">
        <circle cx="24" cy="31" r="5" fill={HONEY} />
        <path
          d="M24 22.500v2M24 37.500v2M15.500 31h2M30.500 31h2M18 25l1.400 1.400M28.600 35.600L30 37M30 25l-1.400 1.400M19.400 35.600L18 37"
          stroke={HONEY}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </>
  ),
  // a peak with snow and a flag on top
  progress: (
    <>
      <path d="M3 41l13-21 12 21z" fill={DUSK} />
      <path d="M12 41L29 12l16 29z" fill={SAGE} />
      <path d="M29 12l-5.600 9.600 3.400-1.800 2.200 3 2.400-3 3.200 1.600z" fill={CREAM} />
      <path d="M29 13V4" stroke={INK} strokeWidth="2.400" strokeLinecap="round" />
      <path data-move="flag" d="M29 4l9 3.200-9 3.200z" fill={CLAY} />
    </>
  ),
  // a trophy
  rewards: (
    <>
      <path
        d="M14 11H8.500c0 6 2.500 9.500 7 10.500M34 11h5.500c0 6-2.500 9.500-7 10.500"
        stroke={HONEY}
        strokeWidth="3.200"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M13 6h22v10a11 11 0 0 1-22 0z" fill={HONEY} />
      <path d="M21 26h6v8h-6z" fill={HONEY} />
      <rect x="13" y="33" width="22" height="8" rx="3" fill={INK} />
      <path
        data-move="pop"
        d="M24 9.500l1.700 3.500 3.800.5-2.800 2.700.7 3.800-3.400-1.800-3.400 1.800.7-3.800-2.800-2.700 3.800-.5z"
        fill={CREAM}
      />
    </>
  ),
  // two speech bubbles
  chat: (
    <>
      <path
        d="M9 7h21a6 6 0 0 1 6 6v9a6 6 0 0 1-6 6H18l-7 6v-6.300A6 6 0 0 1 5 22v-9a6 6 0 0 1 6-6z"
        fill={MIST}
      />
      <g data-move="pop">
        <path
          d="M22 21h16a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5v5l-6-5H22a5 5 0 0 1-5-5v-7a5 5 0 0 1 5-5z"
          fill={CREAM}
        />
        <circle cx="24.500" cy="29.500" r="1.900" fill={INK} />
        <circle cx="30" cy="29.500" r="1.900" fill={INK} />
        <circle cx="35.500" cy="29.500" r="1.900" fill={INK} />
      </g>
    </>
  ),
  // a cog
  settings: (
    <g data-move="spin">
      <circle
        cx="24"
        cy="24"
        r="14.500"
        fill="none"
        stroke={DUSK}
        strokeWidth="8"
        strokeDasharray="6.300 5.090"
      />
      <circle cx="24" cy="24" r="12.500" fill={DUSK} />
      <circle cx="24" cy="24" r="5" fill={CREAM} />
    </g>
  ),
  // a satchel: everything else is kept in here
  more: (
    <>
      <path
        d="M17 14v-3a7 7 0 0 1 14 0v3"
        stroke={INK}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="6" y="13" width="36" height="28" rx="7" fill={WOOD} />
      <g data-move="flap">
        <path d="M6 20a7 7 0 0 1 7-7h22a7 7 0 0 1 7 7v3c0 5-8 8-18 8S6 28 6 23z" fill={CLAY} />
        <rect x="20.500" y="26" width="7" height="9" rx="2.500" fill={CREAM} />
      </g>
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
