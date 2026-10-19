// Karman-drawn glyphs for the expression list: the toolbar (add, undo, redo, edit list, hide and
// show list), the row delete cross and the white kind glyphs inside a row's colour icon. Each is a
// filled single-colour shape in currentColor on a 24-unit box, drawn here from plain geometry to
// the sizes measured on the reference calculator (typography-icons VIS-50, VIS-51). Each is
// aria-hidden: the control around it carries the name.

import type { JSX, ReactNode } from "react";

function Glyph(props: { size: number; className?: string; children: ReactNode }): JSX.Element {
  return (
    <svg
      className={props.className ?? "kc-glyph"}
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

/** A solid cross with square ends, arms about 22% of the box thick. */
export function AddGlyph(props: { size?: number }): JSX.Element {
  return (
    <Glyph size={props.size ?? 17.6}>
      <path d="M9.6 0h4.8v9.6H24v4.8h-9.6V24H9.6v-9.6H0V9.6h9.6z" fill="currentColor" />
    </Glyph>
  );
}

/**
 * A solid right-angled head at the lower left with a curved shaft that arches over and tapers to a
 * thin, raised tip at the right; redo is the mirror image.
 */
export function UndoGlyph(props: { size?: number; redo?: boolean }): JSX.Element {
  return (
    <Glyph size={props.size ?? 21.12}>
      <path
        d="M0.2 6.4V17.5H11.9L8 13.9C11.3 9.2 17.2 5.8 23.9 10.1L24 9.7C21.5 5.9 16.3 3.6 12.5 4.8C9.2 5.7 6.3 7 4.4 9.9Z"
        fill="currentColor"
        transform={props.redo === true ? "matrix(-1 0 0 1 24 0)" : undefined}
      />
    </Glyph>
  );
}

/** An eight-tooth gear with square teeth and a round hole about 30% of its width. */
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
  const hole = 3.6;
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
        d="M1.6 1.6L22.4 22.4M22.4 1.6L1.6 22.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={4.9}
      />
    </Glyph>
  );
}

/** The kind glyph inside a row's colour icon; drawn white over the row colour. */
export type KindGlyph = "wave" | "point" | "region" | "region-strict";

export function ColourKindGlyph(props: { kind: KindGlyph | null }): JSX.Element | null {
  if (props.kind === null) return null; // Edit list mode: a plain filled circle (EL-45)
  let body: JSX.Element;
  if (props.kind === "wave") {
    // One period of a sine-like stroke: in low just inside the left edge, a high narrow crest, a
    // trough two thirds across, then a steep climb out at the top right.
    body = (
      <path
        d="M0.5 17.3C3.3 10.8 4.9 5.9 7.5 5.9C10.1 5.9 13.2 18.7 16.7 18.7C18.9 18.7 21 11.3 23.5 6.9"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.6}
      />
    );
  } else if (props.kind === "point") {
    body = <circle cx={12} cy={12} r={3.1} fill="currentColor" />;
  } else {
    // A half-tinted disc split by the boundary; a strict boundary is a thinner dashed line, two
    // whole dashes about the centre and a short one cut by the rim at the top right.
    const strict = props.kind === "region-strict";
    body = (
      <>
        <path d="M24 0V24H0Z" fill="currentColor" opacity={0.5} />
        <path
          d="M0 24L24 0"
          fill="none"
          stroke="currentColor"
          strokeWidth={strict ? 2.4 : 2.8}
          strokeDasharray={strict ? "5.8 3.9" : undefined}
          strokeDashoffset={strict ? 0.7 : undefined}
        />
      </>
    );
  }
  return <Glyph size={29}>{body}</Glyph>;
}

/**
 * KP-32: the Show keypad glyph, a rounded keyboard outline with two rows of keys and a space bar,
 * its ink 28 by 17 px; the stacked list toolbar's Keypad toggle draws it 22 px wide.
 */
export function KeyboardGlyph(props: { width?: number }): JSX.Element {
  const width = props.width ?? 28;
  const keys: JSX.Element[] = [];
  for (let i = 0; i < 5; i++)
    keys.push(<rect key={`a${i}`} x={5.6 + i * 3.6} y={4.6} width={2.4} height={2.4} />);
  for (let i = 0; i < 4; i++)
    keys.push(<rect key={`b${i}`} x={7.4 + i * 3.6} y={8.2} width={2.4} height={2.4} />);
  return (
    <svg
      className="kc-glyph"
      width={width}
      height={(width * 17) / 28}
      viewBox="0 0 28 17"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x={1}
        y={1}
        width={26}
        height={15}
        rx={2.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
      <g fill="currentColor">
        {keys}
        <rect x={9.2} y={11.8} width={9.6} height={1.8} />
      </g>
    </svg>
  );
}

/** KP-32: the small filled triangle beside the keyboard, pointing up, 12 by 6 px. */
export function CaretUpGlyph(): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      width={12}
      height={6}
      viewBox="0 0 12 6"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 6L6 0L12 6Z" fill="currentColor" />
    </svg>
  );
}

/** EL-41: a table's Zoom Fit, four solid corner brackets around an empty middle. */
export function ZoomFitGlyph(props: { size?: number }): JSX.Element {
  return (
    <Glyph size={props.size ?? 20}>
      <path
        d="M1 1H9V4.2H4.2V9H1ZM15 1H23V9H19.8V4.2H15ZM1 15H4.2V19.8H9V23H1ZM19.8 15H23V23H15V19.8H19.8Z"
        fill="currentColor"
      />
    </Glyph>
  );
}

/** EL-41: a table's Add Regression, three solid dots rising to the right under a fitted line. */
export function RegressionGlyph(props: { size?: number }): JSX.Element {
  return (
    <Glyph size={props.size ?? 20}>
      <path d="M1.5 21.2L21.8 2.6L23.2 4.1L2.9 22.7Z" fill="currentColor" />
      <circle cx={5} cy={14} r={3} fill="currentColor" />
      <circle cx={12} cy={13} r={3} fill="currentColor" />
      <circle cx={19} cy={6} r={3} fill="currentColor" />
    </Glyph>
  );
}

/** EL-43: the Add item menu's table glyph, an outlined 3-row, 2-column grid (24 by 20 px). */
export function TableItemGlyph(): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      width={24}
      height={20}
      viewBox="0 0 24 20"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth={1.4}>
        <rect x={1.5} y={1.5} width={21} height={17} />
        <path d="M1.5 7.2H22.5M1.5 12.9H22.5M12 7.2V18.5" />
      </g>
      <rect x={1.5} y={1.5} width={21} height={5.7} fill="currentColor" opacity={0.35} />
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
