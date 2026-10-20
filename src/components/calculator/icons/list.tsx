// Karman-drawn glyphs for the expression list: the toolbar (add, undo, redo, edit list, hide and
// show list), the row delete cross and the white kind glyphs inside a row's colour icon. Each is a
// filled single-colour shape in currentColor on a 24-unit box, drawn here from plain geometry to
// the sizes measured on the reference calculator (typography-icons VIS-50, VIS-51). Each is
// aria-hidden: the control around it carries the name.
//
// Provenance: every shape here is plain geometry chosen from the written descriptions (a sine, a
// circular arc, a cross, a gear built in gearPath, rectangles). None is traced or curve-fitted to the
// reference's icon pixels; only overall sizes and offsets were compared against screenshots.

import type { JSX, ReactNode } from "react";

function Glyph(props: {
  size: number;
  className?: string;
  overflow?: boolean; // ink may reach past the 24-unit box (a half-pixel offset)
  children: ReactNode;
}): JSX.Element {
  return (
    <svg
      className={props.className ?? "kc-glyph"}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      overflow={props.overflow === true ? "visible" : undefined}
      aria-hidden="true"
      focusable="false"
    >
      {props.children}
    </svg>
  );
}

/** A cross with rounded ends, arms about 22% of the box thick, centred a quarter pixel down-right. */
export function AddGlyph(props: { size?: number }): JSX.Element {
  return (
    <Glyph size={props.size ?? 17.6} overflow>
      <path
        d="M12.34 3.4V21.3M3.4 12.34H21.3"
        fill="none"
        stroke="currentColor"
        strokeWidth={5.28}
        strokeLinecap="round"
      />
    </Glyph>
  );
}

/**
 * VIS-50.3: a solid right-angled triangle head at the lower left, about 45% of the box tall, and a
 * shaft that is a circular arc (radius 11, stroke 3.8, about 16% of the box) rising from the head
 * over to the right; redo is the mirror image.
 */
export function UndoGlyph(props: { size?: number; redo?: boolean }): JSX.Element {
  return (
    <Glyph size={props.size ?? 21.12}>
      <g transform={props.redo === true ? "matrix(-1 0 0 1 24 0)" : undefined}>
        <path d="M0.5 6.5V17.5H11.5Z" fill="currentColor" />
        <path d="M5 13A11 11 0 0 1 23 10" fill="none" stroke="currentColor" strokeWidth={3.8} />
      </g>
    </Glyph>
  );
}

/** An eight-tooth gear with square teeth and a round hole about 35% of its width. */
function gearPath(): string {
  const teeth = 8;
  const outer = 12;
  const inner = 9;
  const half = 0.2; // half a tooth, in radians at the outer radius
  const pt = (r: number, a: number) =>
    `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`;
  const parts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i * 2 * Math.PI) / teeth;
    const base = half * (outer / inner) * 1.05; // the tooth's base, so its sides stay parallel
    parts.push(
      `${i === 0 ? "M" : "L"}${pt(inner, a - base)}`,
      `L${pt(outer, a - half)}`,
      `L${pt(outer, a + half)}`,
      `L${pt(inner, a + base)}`
    );
    const next = ((i + 1) * 2 * Math.PI) / teeth;
    parts.push(`A${inner} ${inner} 0 0 1 ${pt(inner, next - base)}`);
  }
  const hole = 4.2;
  return `${parts.join("")}Z M${12 + hole} 12a${hole} ${hole} 0 1 0 ${-2 * hole} 0a${hole} ${hole} 0 1 0 ${2 * hole} 0Z`;
}
const GEAR = gearPath();

export function EditListGlyph(props: { size?: number }): JSX.Element {
  return (
    <Glyph size={props.size ?? 17.6}>
      <path d={GEAR} fill="currentColor" fillRule="evenodd" />
    </Glyph>
  );
}

/** Two parallel chevrons pointing `direction`. */
export function DoubleChevronGlyph(props: {
  direction: "left" | "right" | "up" | "down";
  size?: number;
}): JSX.Element {
  const turn = { left: 0, up: 90, right: 180, down: 270 }[props.direction];
  return (
    <Glyph size={props.size ?? 17.6}>
      <path
        d="M13.2 0.8L3 12L13.2 23.2M22.6 0.8L12.4 12L22.6 23.2"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.2}
        transform={turn === 0 ? undefined : `rotate(${turn} 12 12)`}
      />
    </Glyph>
  );
}

/** Two crossing bars with square ends spanning about three quarters of the box. */
export function RemoveGlyph(props: { size?: number }): JSX.Element {
  return (
    <Glyph size={props.size ?? 18.4}>
      <path
        d="M1.6 0.95L22.4 21.75M22.4 0.95L1.6 21.75"
        fill="none"
        stroke="currentColor"
        strokeWidth={5.1}
      />
    </Glyph>
  );
}

/** The kind glyph inside a row's colour icon; drawn white over the row colour. */
export type KindGlyph = "wave" | "point" | "region" | "region-strict";

/** A plain sampled sine, x from 0 to 24 in 1-unit steps (period 20, amplitude 6). */
const WAVE = Array.from({ length: 25 }, (_, x) => {
  const y = 12 - 6 * Math.sin((2 * Math.PI * (x - 1)) / 20);
  return `${x === 0 ? "M" : "L"}${x} ${y.toFixed(2)}`;
}).join("");

export function ColourKindGlyph(props: { kind: KindGlyph | null }): JSX.Element | null {
  if (props.kind === null) return null; // Edit list mode: a plain filled circle (EL-45)
  let body: JSX.Element;
  if (props.kind === "wave") {
    // VIS-51.9: a bold sine crossing the circle, one period of y = 12 - 6 sin(2 pi (x - 1) / 20).
    body = <path d={WAVE} fill="none" stroke="currentColor" strokeWidth={3.6} />;
  } else if (props.kind === "point") {
    body = <circle cx={12} cy={12} r={3.1} fill="currentColor" />;
  } else {
    // A half-tinted disc split by the boundary; a strict boundary is a thinner line of 6-unit
    // dashes with 4-unit gaps.
    const strict = props.kind === "region-strict";
    body = (
      <>
        <path d="M24 0V24H0Z" fill="currentColor" opacity={0.5} />
        <path
          d="M0 24L24 0"
          fill="none"
          stroke="currentColor"
          strokeWidth={strict ? 2.4 : 2.8}
          strokeDasharray={strict ? "6 4" : undefined}
        />
      </>
    );
  }
  return <Glyph size={29}>{body}</Glyph>;
}

/**
 * KP-32: the Show keypad glyph, a rounded keyboard outline 28 by 18 with thin (1.5) sides, two rows
 * of separate keys about 2.5 px square on a 4 px pitch (five, then four) and an 11 px space bar; the stacked list
 * toolbar's Keypad toggle draws it 22 px wide.
 */
export function KeyboardGlyph(props: { width?: number }): JSX.Element {
  const width = props.width ?? 28;
  const keys: JSX.Element[] = [];
  for (let i = 0; i < 5; i++)
    keys.push(<rect key={`a${i}`} x={5.2 + i * 4} y={4.2} width={2.6} height={2.6} />);
  for (let i = 0; i < 4; i++)
    keys.push(<rect key={`b${i}`} x={7.2 + i * 4} y={8.2} width={2.6} height={2.6} />);
  return (
    <svg
      className="kc-glyph"
      width={width}
      height={(width * 18) / 28}
      viewBox="0 0 28 18"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x={0.75}
        y={0.75}
        width={26.5}
        height={16.5}
        rx={2.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <g fill="currentColor">
        {keys}
        <rect x={9} y={12.2} width={11} height={2.4} />
      </g>
    </svg>
  );
}

/** KP-32: the small filled triangle beside the keyboard, pointing up, 12 by 7 px. */
export function CaretUpGlyph(): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      width={12}
      height={7}
      viewBox="0 0 12 7"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 7L6 0L12 7Z" fill="currentColor" />
    </svg>
  );
}

/** EL-41, RT-27: a table's Zoom Fit and its residuals' Zoom Fit. */
export function ZoomFitGlyph(props: { size?: number }): JSX.Element {
  // RT-27, TABLES-48: a magnifying glass holding a plus, as the reference's Zoom Fit reads.
  return (
    <Glyph size={props.size ?? 20}>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx={9.5} cy={9.5} r={6.6} strokeWidth={2} />
        <path d="M14.4 14.4L21 21" strokeWidth={2.8} />
        <path d="M9.5 6.4V12.6M6.4 9.5H12.6" strokeWidth={1.8} />
      </g>
    </Glyph>
  );
}

/** EL-43, VIS-52: the Add item menu's table glyph, a 3-column by 4-row grid with a solid header
 *  row (25 by 22 px). */
export function TableItemGlyph(): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      width={25}
      height={22}
      viewBox="0 0 25 22"
      aria-hidden="true"
      focusable="false"
    >
      <rect x={0.5} y={0.5} width={24} height={6} fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth={1}>
        <rect x={0.5} y={0.5} width={24} height={21} />
        <path d="M0.5 11.5H24.5M0.5 16.5H24.5M8.5 6.5V21.5M16.5 6.5V21.5" />
      </g>
    </svg>
  );
}

/** EL-45: Duplicate, two overlapping rounded sheets, the front one filled at its edge (24 box). */
export function DuplicateGlyph(props: { size?: number }): JSX.Element {
  return (
    <Glyph size={props.size ?? 20}>
      <g fill="none" stroke="currentColor" strokeWidth={2.2}>
        <rect x={8} y={2} width={13} height={15} rx={2} />
        <path d="M4.5 6.5V20a1.5 1.5 0 0 0 1.5 1.5H16.5" />
      </g>
    </Glyph>
  );
}

/** GP-40: the graph settings wrench, an open-ended head on a short round-ended handle (16 px). */
export function WrenchGlyph(): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10.6 0.6A4.6 4.6 0 0 0 6.2 6.6L0.9 11.9A2.1 2.1 0 0 0 4 15L9.3 9.7A4.6 4.6 0 0 0 15.3 5.3L12.6 7.9L10.1 7.4L9.5 4.9L12.1 2.2A4.6 4.6 0 0 0 10.6 0.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** GP-41: Zoom in and Zoom out, a plus or a minus with 2 px bars (12 px). */
export function ZoomGlyph(props: { out?: boolean }): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      width={12}
      height={12}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={props.out === true ? "M0 5H12V7H0Z" : "M5 0H7V5H12V7H7V12H5V7H0V5H5Z"}
        fill="currentColor"
      />
    </svg>
  );
}
