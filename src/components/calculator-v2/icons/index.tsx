// Karman-drawn glyphs for the calculator v2 UI (TH-18: icons come only from lucide-react or this
// folder). Each is inline SVG in currentColor, so the element around it sets the colour (the row
// tab paints --kc-row-color, R-1), and each is aria-hidden: the control around it carries the name.

import type { JSX } from "react";

const SIZE = 20;

const DASHES = { solid: undefined, dashed: "4 3", dotted: "0.5 3.5" } as const;

/** R-1, D-12: a row whose graph is a curve, line set, region or relation, in its line style. */
export function LineStyleGlyph(props: { style: "solid" | "dashed" | "dotted" }): JSX.Element {
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
        strokeDasharray={DASHES[props.style]}
      />
    </svg>
  );
}

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
