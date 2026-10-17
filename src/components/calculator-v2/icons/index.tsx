// Karman-drawn glyphs for the calculator v2 UI (TH-18: icons come only from lucide-react or this
// folder). Each is inline SVG in currentColor, so the element around it sets the colour (the row
// tab paints --kc-row-color, R-1), and each is aria-hidden: the control around it carries the name.

import type { JSX } from "react";

const SIZE = 20;

/** R-1: a row whose graph is a curve, line set, region or relation; drawn as a solid stroke. */
export function LineStyleGlyph(props: { style: "solid" }): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      data-style={props.style}
      width={SIZE}
      height={SIZE}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 15.5C7.5 15.5 8.5 4.5 17 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** R-1: a point row; drawn as a filled dot. */
export function PointStyleGlyph(props: { style: "filled" }): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      data-style={props.style}
      width={SIZE}
      height={SIZE}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx={10} cy={10} r={5} fill="currentColor" />
    </svg>
  );
}
