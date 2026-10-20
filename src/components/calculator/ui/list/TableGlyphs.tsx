// Glyphs drawn for tables and their regressions, our own drawings sized to the reference's boxes.

import type { JSX } from "react";
import { POINTS_DOTS, POINTS_DOT_RADIUS } from "../../icons/list";

/** The points glyph's scale in the gutter: the reference sets it 20 px tall there, 23.8 px in a
 *  colour icon, and offsets it inside the 30 px box by (2.82, 2.98). */
const GUTTER_SCALE = 20 / 23.8;

/**
 * RT-28: the gutter's Add Regression, drawn in its 30 px box: the column icon's four points at
 * three quarters strength, scaled into the box, and a thin fitted line through them. The line's
 * ends and width were measured from the reference's rendering at DPR 4 (2026-10-20).
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
      <g fill="currentColor" fillOpacity={0.75}>
        {POINTS_DOTS.map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={2.82 + cx * GUTTER_SCALE}
            cy={2.98 + cy * GUTTER_SCALE}
            r={POINTS_DOT_RADIUS * GUTTER_SCALE}
          />
        ))}
      </g>
      <path d="M18.77 5.5L11.24 24.5" stroke="currentColor" strokeWidth={0.95} />
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
