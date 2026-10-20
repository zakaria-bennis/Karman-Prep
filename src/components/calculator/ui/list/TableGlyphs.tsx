// Glyphs drawn for tables and their regressions, our own drawings sized to the reference's boxes.

import type { JSX } from "react";

/**
 * RT-28: the gutter's Add Regression, drawn in its 30 px box: four scattered points either side
 * of a steep fitted line, the points lighter than the line.
 */
export function AddRegressionGlyph(): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      width={30}
      height={30}
      viewBox="0 0 30 30"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor" fillOpacity={0.7}>
        <circle cx={11.4} cy={11.9} r={2} />
        <circle cx={20.1} cy={9.3} r={2} />
        <circle cx={17.1} cy={16.9} r={2} />
        <circle cx={9.8} cy={20.2} r={2} />
      </g>
      <path d="M18.4 5.8L11.4 23.3" stroke="currentColor" strokeWidth={1.1} />
    </svg>
  );
}

/** RT-30: the EQUATION insert icon: a sheet with a solid spine and a rule, an arrow pointing in. */
export function InsertGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M7.1 6.5h10.4a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H7.1a1.5 1.5 0 0 1-1.5-1.5V8a1.5 1.5 0 0 1 1.5-1.5ZM10.5 7.6v10.8h7.4V7.6Z"
      />
      <path fill="currentColor" d="M10.5 15.2h7.4v.9h-7.4Z" />
      <path
        d="M20.4 5.6l-6.9 6.9M13.2 9v4.2h4.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}
