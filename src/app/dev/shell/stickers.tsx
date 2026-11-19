// Karman's own menu icons, drawn here in code (no icon library). One family: a 24 grid, one line weight
// (1.6) with round ends, a faint wash of the text colour inside each main shape, and one small clay accent.
// They take the text colour, so they work on glass by day and by night.
// A part marked data-move is the piece that stirs when its row is hovered (see shell.module.css).
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

export type StickerName =
  | "homework"
  | "library"
  | "schedule"
  | "progress"
  | "mistakes"
  | "rewards"
  | "chat"
  | "settings"
  | "more";

const WASH = { fill: "currentColor", fillOpacity: 0.13 } as const;
const ACCENT = "var(--clay)";
// Each of the student's main icons has a color of its own (founder, 2026-11-16): green for Progress,
// gold for Rewards, orange for the Mistake Log, and a red, a green and a blue book for the Library.
const GREEN = "#2f9e6f";
const GOLD = "#e3a21a";
const ORANGE = "#e2772e";
const RED = "#c8553d";
const BLUE = "#4f7fc4";
const YELLOW = "#ffc81a";
// the calendar's red, and the two colors of a message thread: the blue of a sent message and the
// gray of one coming in (founder, 2026-11-16)
const CAL_RED = "#e5484d";
const SENT = "#1f8bff";
const COMING = "#8e8e93";

/** A calendar page that shows today's date, and the right one tomorrow. */
function Today() {
  const [day, setDay] = useState<number | null>(null);
  useEffect(() => {
    const read = () => setDay(new Date().getDate());
    read();
    const timer = window.setInterval(read, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <>
      <rect x="4" y="5" width="16" height="15.500" rx="3" {...WASH} />
      {/* the red band across its top */}
      <path d="M4 10.200V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2.200Z" fill={CAL_RED} stroke="none" />
      <rect x="4" y="5" width="16" height="15.500" rx="3" />
      <path d="M8.500 3v3.400M15.500 3v3.400" />
      <text
        data-move="pop"
        x="12"
        y="18.100"
        textAnchor="middle"
        fontSize="7.800"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        {day ?? ""}
      </text>
    </>
  );
}

/** One book standing on the shelf: its spine in its color, two bands across it and a small label. */
const book = (x: number, top: number, w: number, color: string) => (
  <>
    <rect x={x} y={top} width={w} height={19.7 - top} rx="0.800" fill={color} fillOpacity="0.78" />
    <path d={`M${x} ${top + 2}h${w}M${x} ${17.9}h${w}`} strokeWidth="0.900" strokeOpacity="0.75" />
    <rect
      x={x + w / 2 - 0.8}
      y={top + 4}
      width="1.600"
      height="3.400"
      rx="0.400"
      fill="#fff8ea"
      fillOpacity="0.85"
      stroke="none"
    />
  </>
);

const ART: Record<StickerName, ReactNode> = {
  // a page with its homework as rows. The rows slide off one by one as if each were finished, a
  // tick lands with confetti flying out from its middle, and it begins again (founder, 2026-11-16)
  homework: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.600" {...WASH} />
      {[8, 12, 16].map((y, n) => (
        <path key={y} data-move="row" data-n={n} d={`M8.500 ${y}h7`} strokeWidth="1.900" />
      ))}
      {[
        [-9, -7, ACCENT],
        [9, -8, GOLD],
        [-10, 4, GREEN],
        [10, 5, BLUE],
        [-3, -11, GOLD],
        [3, 10, ACCENT],
      ].map(([x, y, color], n) => (
        <circle
          key={n}
          data-move="bit"
          cx="12"
          cy="12"
          r="1.100"
          fill={color as string}
          stroke="none"
          style={{ "--bx": `${x}px`, "--by": `${y}px` } as CSSProperties}
        />
      ))}
      <path
        data-move="done"
        d="M8.500 12.300l2.500 2.500 4.800-5.300"
        stroke={GREEN}
        strokeWidth="2.100"
      />
    </>
  ),
  // three books on a shelf: a red and a green standing together, and a blue one tipped over toward
  // them, leaning on the green and about to fall. Hovered, the blue one stands itself up against
  // the others and all three give a little bounce (founder, 2026-11-16). Each is a real book: a
  // spine, two bands and a label.
  library: (
    <>
      <g data-move="book" data-n="0">
        {book(3, 6.2, 4.4, RED)}
      </g>
      <g data-move="book" data-n="1">
        {book(7.8, 8, 4.2, GREEN)}
      </g>
      <g data-move="book" data-n="2">
        <g data-move="stand">{book(17, 6.9, 4, BLUE)}</g>
      </g>
      <path d="M2 20.500h20" />
    </>
  ),
  // a calendar page with a red band, showing today's date
  schedule: <Today />,
  // a graph: its two axes, a line climbing to a small arrowhead, and green shade under the line
  // (founder, 2026-11-16). Hovered, the line is drawn from its foot to its tip, the shade spreads
  // under it as it goes, and the arrowhead rides its end.
  progress: (
    <>
      <defs>
        <linearGradient id="kp-climb" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={GREEN} stopOpacity="1" />
          <stop offset="0.6" stopColor={GREEN} stopOpacity="0.5" />
          <stop offset="1" stopColor={GREEN} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path
        data-move="shade"
        d="M6.500 16.500L10.500 12.200L13.200 14.400L18.400 7.800V19H6.500Z"
        fill="url(#kp-climb)"
        stroke="none"
      />
      <path d="M4 4.500V19.500H20.500" />
      <path
        data-move="line"
        pathLength={1}
        d="M6.500 16.500L10.500 12.200L13.200 14.400L18.400 7.800"
      />
      {/* the arrowhead is drawn pointing along the line's last stretch, and kept small */}
      <g data-move="head">
        <path d="M15.800 7.500L18.700 7.400L19.100 10.300" />
      </g>
    </>
  ),
  // a trophy: a cup with a rim and two handles on a stem and a stepped foot, with a star on it and a
  // glint of light down its side. By night the star is yellow; by day the cup is yellow and the star
  // black (shell.module.css). The star is small, well inside the cup.
  rewards: (
    <>
      <path d="M7 4.200h10v5.200a5 5 0 0 1-10 0z" {...WASH} data-cup />
      <path d="M6.200 4.200h11.600" />
      <path d="M7 6H4.900a.7.700 0 0 0-.7.800c.3 2.500 1.400 4 3.400 4.600M17 6h2.100a.7.700 0 0 1 .7.800c-.3 2.500-1.400 4-3.400 4.600" />
      <path d="M12 14.400v2.300" />
      <path d="M9.600 16.700h4.800l.9 3.400H8.700z" {...WASH} data-cup />
      <path d="M7.400 20.500h9.200" />
      <path data-move="glint" d="M8.800 6.200v2.600" strokeOpacity="0.6" strokeWidth="1.200" />
      <path
        data-move="pop"
        data-star
        d="M12 5.800l.8 1.630 1.800.260-1.300 1.270.3 1.790L12 9.900l-1.600.850.3-1.790-1.300-1.270 1.800-.260z"
        fill={YELLOW}
        stroke={YELLOW}
        strokeWidth="0.500"
      />
    </>
  ),
  // a message thread: a small blue bubble behind, its tail to the right, and a big gray one in
  // front, its tail to the left, with the three white dots of someone typing, which bob one after
  // another (founder, 2026-11-16)
  chat: (
    <>
      <path
        d="M12.700 2.800h6a2.800 2.800 0 0 1 2.800 2.800v2.700a2.800 2.800 0 0 1-2.200 2.700l.5 2.500-3.400-2.400h-3.700a2.800 2.800 0 0 1-2.800-2.800V5.600a2.800 2.800 0 0 1 2.800-2.800z"
        fill={SENT}
      />
      <path
        d="M5.500 8h8.700a3 3 0 0 1 3 3v4.400a3 3 0 0 1-3 3H8.700l-3.800 2.600.6-2.700a3 3 0 0 1-3-2.900V11a3 3 0 0 1 3-3z"
        fill={COMING}
      />
      <g fill="#ffffff" stroke="none">
        <circle data-move="dot" data-n="0" cx="6.600" cy="13.200" r="1.100" />
        <circle data-move="dot" data-n="1" cx="9.850" cy="13.200" r="1.100" />
        <circle data-move="dot" data-n="2" cx="13.100" cy="13.200" r="1.100" />
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
  // The Mistake Log is a history (founder, 2026-11-18: the notepad looked too much like Homework):
  // a clock face inside an arrow that runs back round it, counter-clockwise. Its hands are orange.
  // Hovered, the arrow winds back a full turn and the hands sweep backward with it.
  mistakes: (
    <>
      <circle cx="12.500" cy="12.500" r="7.500" {...WASH} stroke="none" />
      <g data-move="rewind">
        <path d="M5.800 9.100A7.500 7.500 0 1 1 5 12.500" />
        <path d="M4.300 5.600l1.500 3.500 3.600-1" />
      </g>
      <path
        data-move="hand"
        data-n="0"
        d="M12.500 12.500V8.300"
        stroke={ORANGE}
        strokeWidth="1.900"
      />
      <path
        data-move="hand"
        data-n="1"
        d="M12.500 12.500l3 1.800"
        stroke={ORANGE}
        strokeWidth="1.900"
      />
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
