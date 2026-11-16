// Karman's own menu icons, drawn here in code (no icon library). One family: a 24 grid, one line weight
// (1.6) with round ends, a faint wash of the text colour inside each main shape, and one small clay accent.
// They take the text colour, so they work on glass by day and by night.
// A part marked data-move is the piece that stirs when its row is hovered (see shell.module.css).
import type { ReactNode } from "react";

export type StickerName =
  | "homework"
  | "library"
  | "class"
  | "schedule"
  | "progress"
  | "mistakes"
  | "rewards"
  | "chat"
  | "settings"
  | "more";

const WASH = { fill: "currentColor", fillOpacity: 0.13 } as const;
const ACCENT = "var(--clay)";

const ART: Record<StickerName, ReactNode> = {
  // a page with its corner folded and a tick
  homework: (
    <>
      <path
        d="M7 3.500h7l4.500 4.500v10.500a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z"
        {...WASH}
      />
      <path d="M14 3.500V8h4.500" />
      <path
        data-move="pop"
        d="M8.500 14.200l2.200 2.200 4.400-4.800"
        stroke={ACCENT}
        strokeWidth="1.900"
      />
    </>
  ),
  // three books of three colours: two upright, the third slanted against them (founder, 2026-11-15)
  library: (
    <>
      {/* two books upright and together, each standing on the shelf */}
      <rect
        x="3.200"
        y="6.200"
        width="4.200"
        height="13.500"
        rx="0.900"
        fill="#7fa98f"
        fillOpacity="0.55"
      />
      <rect
        x="7.800"
        y="7.700"
        width="4.200"
        height="12"
        rx="0.900"
        fill="#d9b06a"
        fillOpacity="0.6"
      />
      {/* the third leans left against them, its foot on the shelf: turned about its own lower left corner,
          so no part of it goes below the shelf or into the book beside it */}
      <g data-move="slip" style={{ transformBox: "view-box", transformOrigin: "17.6px 19.7px" }}>
        <rect
          x="17.600"
          y="8.200"
          width="3.600"
          height="11.500"
          rx="0.900"
          transform="rotate(-17 17.600 19.700)"
          fill={ACCENT}
          fillOpacity="0.5"
          stroke={ACCENT}
        />
      </g>
      <path d="M2 20.500h20" />
    </>
  ),
  // the classroom: a chalkboard on its stand
  class: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2.200" {...WASH} />
      <path d="M8.500 16l-2 4.500M15.500 16l2 4.500" />
      <path data-move="chalk" d="M7 8.500h5M7 11.800h8" stroke={ACCENT} strokeWidth="1.900" />
    </>
  ),
  // a calendar page with one day marked
  schedule: (
    <>
      <rect x="4" y="5" width="16" height="15.500" rx="3" {...WASH} />
      <path d="M4 10h16M8.500 3v4M15.500 3v4" />
      <circle data-move="pop" cx="12" cy="15.200" r="2.100" fill={ACCENT} stroke="none" />
    </>
  ),
  // a line that climbs across a graph, ending on a clay point (founder, 2026-11-16: he did not like
  // the peak with a flag)
  progress: (
    <>
      <path d="M7 15.500l3.400-3.600 3 2.400 5-6.300v11.500H7z" {...WASH} stroke="none" />
      <path d="M4 4.500v15H20.500" />
      <path d="M7 15.500l3.400-3.600 3 2.400 5-6.300" />
      <circle data-move="pop" cx="18.400" cy="8" r="2" fill={ACCENT} stroke="none" />
    </>
  ),
  // a trophy
  rewards: (
    <>
      <path d="M7.500 3.800h9v5.700a4.500 4.500 0 0 1-9 0z" {...WASH} />
      <path d="M7.500 5.800H4.800c0 3 1.200 4.700 3.300 5.300M16.500 5.800h2.700c0 3-1.200 4.700-3.300 5.300" />
      <path d="M12 14v3.500M8.500 20.500h7M9.500 17.500h5" />
      <path
        data-move="pop"
        d="M12 5.700l.85 1.700 1.900.3-1.370 1.330.32 1.870L12 10l-1.700.9.320-1.870L9.250 7.700l1.900-.3z"
        fill={ACCENT}
        stroke="none"
      />
    </>
  ),
  // two speech bubbles
  chat: (
    <>
      <path
        d="M5.500 4h9A2.500 2.500 0 0 1 17 6.500v4a2.500 2.500 0 0 1-2.500 2.500H9l-3.500 3v-3A2.500 2.500 0 0 1 3 10.500v-4A2.500 2.500 0 0 1 5.500 4z"
        {...WASH}
      />
      <path d="M19.500 10.300a2.500 2.500 0 0 1 1.500 2.300v3a2.500 2.500 0 0 1-2.500 2.500v2.700l-3.200-2.700H13" />
      <g data-move="pop" fill={ACCENT} stroke="none">
        <circle cx="7.200" cy="8.500" r="1" />
        <circle cx="10" cy="8.500" r="1" />
        <circle cx="12.800" cy="8.500" r="1" />
      </g>
    </>
  ),
  // three sliders
  settings: (
    <>
      <path d="M4 7h7.500M17 7h3M4 12h2.500M12 12h8M4 17h9.500M19 17h1" />
      <circle cx="14.250" cy="7" r="2.250" {...WASH} />
      <circle
        data-move="pop"
        cx="9.250"
        cy="12"
        r="2.250"
        fill={ACCENT}
        fillOpacity="0.3"
        stroke={ACCENT}
      />
      <circle cx="16.250" cy="17" r="2.250" {...WASH} />
    </>
  ),
  // a little notepad, bound along its top, with lines of writing on it (founder, 2026-11-16: no
  // cross). Hovered, its pages flip up over the binding, quickly, one after another.
  mistakes: (
    <>
      <rect x="5" y="5" width="14" height="15.500" rx="2" {...WASH} />
      <path d="M8.500 3.300v3.200M12 3.300v3.200M15.500 3.300v3.200" />
      <path d="M8 10.800h8M8 13.800h8" />
      <path d="M8 16.800h4.500" stroke={ACCENT} />
      {[1, 2, 3].map((n) => (
        <rect
          key={n}
          data-move="page"
          x="5"
          y="5"
          width="14"
          height="15.500"
          rx="2"
          fill="currentColor"
          fillOpacity="0.22"
        />
      ))}
    </>
  ),
  // a satchel: everything else is kept in here
  more: (
    <>
      <rect x="3.500" y="8" width="17" height="12.500" rx="3" {...WASH} />
      <path d="M9 8V6.500a3 3 0 0 1 6 0V8" />
      <path
        data-move="flap"
        d="M3.500 12c2.500 2.200 5.500 3.300 8.500 3.300s6-1.100 8.500-3.300"
      />
      <rect x="10.750" y="13.800" width="2.500" height="3.600" rx="1" fill={ACCENT} stroke="none" />
    </>
  ),
};

export function Sticker({ name, size = 26 }: { name: StickerName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ART[name]}
    </svg>
  );
}
