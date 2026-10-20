// The graph controls' own glyphs (GP-40 to GP-42), drawn for this package: a wrench for Graph
// settings and a plus or minus for the zoom buttons. Each fills in currentColor.

import { useId } from "react";

const svgProps = {
  className: "kc-glyph",
  "aria-hidden": true,
  focusable: false,
} as const;

/**
 * GP-40: an open-end wrench at 45°, its round-ended handle low left with a small hole, its head
 * high right with the jaw opening towards the right (16 px).
 */
export function GraphWrenchGlyph(): JSX.Element {
  // One clip path per glyph, so two calculators on a page never share an id.
  const jaw = `kc-wrench-jaw-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg {...svgProps} width={16} height={16} viewBox="0 0 16 16">
      <clipPath id={jaw}>
        {/* The whole box, less the jaw's slot and the hole in the handle (even-odd). */}
        <path
          clipRule="evenodd"
          d="M0 0H16V16H0Z M12.1 5.61L17.3 2.61L15.9 0.19L10.7 3.19Z M2.55 13.9A0.65 0.65 0 1 0 1.25 13.9A0.65 0.65 0 1 0 2.55 13.9Z"
        />
      </clipPath>
      <g clipPath={`url(#${jaw})`} fill="currentColor">
        <path d="M1.9 13.9L8.6 7.2" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="11" cy="4.7" r="4.6" />
      </g>
    </svg>
  );
}

/** GP-41: Zoom in and Zoom out, a plus or a minus with 2.3 px bars (12 px). */
export function GraphZoomGlyph(props: { out?: boolean }): JSX.Element {
  return (
    <svg {...svgProps} width={12} height={12} viewBox="0 0 12 12">
      <path
        d={
          props.out === true
            ? "M0 4.85H12V7.15H0Z"
            : "M4.85 0H7.15V4.85H12V7.15H7.15V12H4.85V7.15H0V4.85H4.85Z"
        }
        fill="currentColor"
      />
    </svg>
  );
}

/** GP-42: Home, a house under a separate eaved roof with a chimney and a door (16 px). */
export function GraphHomeGlyph(): JSX.Element {
  return (
    <svg {...svgProps} width={16} height={16} viewBox="0 0 16 16">
      <path
        d="M0.6 8.4L8 1.9L15.4 8.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      <path d="M11.2 1.9H13V5.6L11.2 4Z" fill="currentColor" />
      <path d="M2.6 8.7L8 4L13.4 8.7V14H9.2V10.4H6.8V14H2.6Z" fill="currentColor" />
    </svg>
  );
}
