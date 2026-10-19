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
      <path d="M9.35 0h5.3v9.35H24v5.3h-9.35V24h-5.3v-9.35H0v-5.3h9.35z" fill="currentColor" />
    </Glyph>
  );
}

/**
 * A solid right-angled head at the lower left with a curved shaft that arches over to a thin tip at
 * the right; redo is the mirror image.
 */
export function UndoGlyph(props: { size?: number; redo?: boolean }): JSX.Element {
  return (
    <Glyph size={props.size ?? 21.12}>
      <path
        d="M0 6.3V17.2H11.4L7.75 13.7C12 10.3 18 9.4 23.4 10.9L24 9.3C21.5 5.6 17 3.8 12.5 4C9.2 4.2 6.3 6.2 4.1 10.2Z"
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
        d="M12.6 0.8L2.4 12L12.6 23.2M22 0.8L11.8 12L22 23.2"
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
        d="M2.6 2.6L21.4 21.4M21.4 2.6L2.6 21.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={4.6}
      />
    </Glyph>
  );
}

/** The kind glyph inside a row's colour icon; drawn white over the row colour. */
export type KindGlyph = "wave" | "point" | "region" | "region-strict";

export function ColourKindGlyph(props: { kind: KindGlyph }): JSX.Element {
  let body: JSX.Element;
  if (props.kind === "wave") {
    body = (
      <path
        d="M-1 15.5C1.2 7 4.6 3.6 7.6 7.8C10.2 11.6 11.8 19.8 16 18.2C19.4 16.9 21.4 9.6 25 7.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.8}
      />
    );
  } else if (props.kind === "point") {
    body = <circle cx={12} cy={12} r={2.6} fill="currentColor" />;
  } else {
    body = (
      <>
        <path d="M24 0V24H0Z" fill="currentColor" opacity={0.45} />
        <path
          d="M0 24L24 0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeDasharray={props.kind === "region-strict" ? "4.4 3" : undefined}
        />
      </>
    );
  }
  return <Glyph size={29}>{body}</Glyph>;
}
