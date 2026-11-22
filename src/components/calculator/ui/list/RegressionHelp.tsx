// Short, in-app answers for the regression panels' "?" buttons. They replace links to an outside
// help site (founder, 2026-11-22: nothing is loaded from elsewhere): a press shows the note under
// the line in plain words, and a second press hides it.

import { useId, useState, type JSX } from "react";

export const REGRESSION_NOTES = {
  log: "Log mode fits the data's logarithms, which suits growth and decay. r² is measured on that scale.",
  exact: "This fit was found step by step, so its last digits might be off.",
  rmse: "RMSE is the typical distance from the points to the curve. Smaller means a closer fit.",
  negative: "R² is below zero when the model fits worse than a flat line at the average.",
  scale: "Very large or very small numbers lose digits. Try log mode or smaller units.",
} as const;

export function RegressionHelp(props: { label: string; note: string }): JSX.Element {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="kc-tr-help"
        aria-label={props.label}
        title={props.label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((was) => !was)}
      >
        ?
      </button>
      {open && (
        <span id={id} className="kc-tr-note" role="note">
          {props.note}
        </span>
      )}
    </>
  );
}
