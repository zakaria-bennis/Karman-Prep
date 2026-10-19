// The graph controls' own glyphs (GP-40 to GP-42), drawn for this package: a wrench for Graph
// settings and a plus or minus for the zoom buttons. Each fills in currentColor.

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
  return (
    <svg {...svgProps} width={16} height={16} viewBox="0 0 16 16">
      <clipPath id="kc-wrench-jaw">
        {/* The whole box, less the jaw's slot and the hole in the handle (even-odd). */}
        <path
          clipRule="evenodd"
          d="M0 0H16V16H0Z M12.1 5.61L17.3 2.61L15.9 0.19L10.7 3.19Z M2.55 13.9A0.65 0.65 0 1 0 1.25 13.9A0.65 0.65 0 1 0 2.55 13.9Z"
        />
      </clipPath>
      <g clipPath="url(#kc-wrench-jaw)" fill="currentColor">
        <path d="M1.9 13.9L8.6 7.2" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" />
        <circle cx="11" cy="4.7" r="4.4" />
      </g>
    </svg>
  );
}

/** GP-41: Zoom in and Zoom out, a plus or a minus with 2 px bars (12 px). */
export function GraphZoomGlyph(props: { out?: boolean }): JSX.Element {
  return (
    <svg {...svgProps} width={12} height={12} viewBox="0 0 12 12">
      <path
        d={props.out === true ? "M0 5H12V7H0Z" : "M5 0H7V5H12V7H7V12H5V7H0V5H5Z"}
        fill="currentColor"
      />
    </svg>
  );
}
