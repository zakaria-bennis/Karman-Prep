// Karman-drawn glyphs for slider rows: the play triangle and pause bars inside the gutter's circle,
// the four loop-mode arrows (SLIDERS-31) and the speed chevrons (SLIDERS-33). Plain geometry on a
// 24-unit box in currentColor, sized to the reference's measurements (VIS-37); none is traced from
// the reference's icon font. Each is aria-hidden: the control around it carries the name.

import type { JSX } from "react";
import type { LoopMode } from "@/lib/calculator/sliders/model";

function Svg(props: { size: number; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {props.children}
    </svg>
  );
}

/** A right-pointing triangle with softened corners, nudged right to sit optically centred. */
export function PlayGlyph(props: { size?: number }): JSX.Element {
  return (
    <Svg size={props.size ?? 11}>
      <path
        d="M3.5 1.8 21.5 12 3.5 22.2Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Two upright bars. */
export function PauseGlyph(props: { size?: number }): JSX.Element {
  return (
    <Svg size={props.size ?? 11}>
      <path d="M4 2h5.5v20H4ZM14.5 2H20v20h-5.5Z" fill="currentColor" />
    </Svg>
  );
}

const HEAD = 4.2; // arrowhead length and half-width, in box units

function arrow(x1: number, x2: number, y: number): string {
  const d = x2 > x1 ? 1 : -1;
  return `M${x1} ${y}H${x2 - d * 0.6}M${x2 - d * HEAD} ${y - HEAD}L${x2} ${y}L${x2 - d * HEAD} ${y + HEAD}`;
}

/** SLIDERS-31: the loop mode's arrows: two-way, one-way, once (a stop bar) and indefinitely (dots). */
export function LoopModeGlyph(props: { mode: LoopMode; size?: number }): JSX.Element {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  let paths: JSX.Element[];
  switch (props.mode) {
    case "LOOP_FORWARD_REVERSE":
      paths = [
        <path key="a" d={arrow(3, 21, 8)} {...stroke} />,
        <path key="b" d={arrow(21, 3, 16)} {...stroke} />,
      ];
      break;
    case "LOOP_FORWARD":
      paths = [
        <path key="a" d={arrow(3, 21, 8)} {...stroke} />,
        <path key="b" d={arrow(3, 21, 16)} {...stroke} />,
      ];
      break;
    case "PLAY_ONCE":
      paths = [
        <path key="a" d="M3 15.5A4.2 4.2 0 0 1 11.4 15.5A4.2 4.2 0 0 1 3 15.5" {...stroke} />,
        <path key="b" d={arrow(7.2, 20, 11.3)} {...stroke} />,
      ];
      break;
    case "PLAY_INDEFINITELY":
      paths = [
        <path key="a" d="M3 12h.01M7 12h.01M11 12h.01" {...stroke} strokeWidth={2.6} />,
        <path key="b" d={arrow(15, 21, 12)} {...stroke} />,
      ];
      break;
  }
  return <Svg size={props.size ?? 16}>{paths}</Svg>;
}

/** SLIDERS-33: « (slower) or » (faster). */
export function SpeedGlyph(props: { faster: boolean; size?: number }): JSX.Element {
  const d = props.faster ? "M5 4l7 8-7 8M12 4l7 8-7 8" : "M19 4l-7 8 7 8M12 4l-7 8 7 8";
  return (
    <Svg size={props.size ?? 10}>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
