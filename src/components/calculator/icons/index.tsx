// Karman-drawn glyphs for the calculator UI (TH-18: icons come only from lucide-react or this
// folder). Each is inline SVG in currentColor, so the element around it sets the colour (the row
// tab paints --kc-row-color, R-1), and each is aria-hidden: the control around it carries the name.

import type { JSX } from "react";

const SIZE = 20;

/** R-1, D-12: a point row or table column, in its point style; hidden points show an outline. */
export function PointStyleGlyph(props: {
  style: "filled" | "open" | "cross";
  hidden?: boolean;
}): JSX.Element {
  const outline = props.hidden === true || props.style === "open";
  return (
    <svg
      className="kc-glyph"
      data-style={props.style}
      data-hidden={props.hidden === true ? "true" : undefined}
      width={SIZE}
      height={SIZE}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      {props.style === "cross" && props.hidden !== true ? (
        <path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" stroke="currentColor" strokeWidth={2.5} />
      ) : (
        <circle
          cx={10}
          cy={10}
          r={outline ? 4.5 : 5}
          fill={outline ? "none" : "currentColor"}
          stroke={outline ? "currentColor" : undefined}
          strokeWidth={outline ? 2 : undefined}
        />
      )}
    </svg>
  );
}

/**
 * R-2, D-6: the row and cell warning marker, a rounded equilateral triangle 22 units wide in
 * currentColor (the --kc-warning role) with an exclamation mark cut out in the list colour. Drawn
 * here from plain shapes; `size` is the rendered width in CSS px.
 */
export function WarningGlyph(props: { size?: number }): JSX.Element {
  const width = props.size ?? 22;
  return (
    <svg
      className="kc-glyph kc-warning-glyph"
      width={width}
      height={(width * 20) / 22}
      viewBox="0 0 22 20"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M11 3L20 18H2Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path
        className="kc-warning-mark"
        d="M11 8V12.2"
        fill="none"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <circle className="kc-warning-mark-dot" cx={11} cy={15.2} r={1.2} />
    </svg>
  );
}
