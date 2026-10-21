// The line under a point row's math: its Label checkbox (EL-15), fading in with the value line.
// Drawn with our own markup and CSS.

import { useId, type JSX } from "react";

/**
 * EL-15: a point row's Label checkbox. Point labels are not drawn yet, so the box is shown for the
 * row's layout and stays unavailable (aria-disabled) rather than pretending to do something.
 */
export function PointLabelLine(props: { rowNumber: number }): JSX.Element {
  const id = `kc-label-${useId().replace(/:/g, "")}`;
  return (
    <div className="kc-row-under kc-point-label">
      <input
        id={id}
        type="checkbox"
        className="kc-checkbox"
        aria-disabled="true"
        aria-describedby={`${id}-note`}
        checked={false}
        onChange={() => undefined}
        onClick={(e) => e.preventDefault()}
      />
      <label htmlFor={id}>Label</label>
      <span id={`${id}-note`} hidden>
        Point labels for expression {props.rowNumber} are not available yet.
      </span>
    </div>
  );
}
