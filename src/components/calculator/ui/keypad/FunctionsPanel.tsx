// The Functions panel (K-4, K-5, A11Y-5, VIS-KEYPAD-25 to 30): a popover above the Functions key, a
// group named "Functions" holding, per shipped category of panelCategories(), an h3 in the
// reference's wording (shown upper case) and a group of buttons, named by CATEGORY_HEADINGS, that
// show entry.label and are named by entry.spoken. The Keypad owns its open, closing and closed
// states; the popover opens and closes at once (VIS-KEYPAD-30), so "closing" lasts no time. A
// closing panel is inert, so a tap on it inserts nothing.

import type { JSX } from "react";
import { panelCategories, type PanelEntry } from "@/lib/calculator/core/latex/operator-names";

/** VIS-KEYPAD-29: the reference's heading for each category id (CATEGORY_HEADINGS order). */
const VISIBLE_HEADINGS: Readonly<Record<number, string>> = {
  1: "Trig Functions",
  2: "Inverse Trig Functions",
  3: "Statistics",
  4: "List Operations",
  5: "Visualizations",
  6: "Probability Distributions",
  7: "Inference",
  8: "Calculus",
  9: "Hyperbolic Trig Functions",
  10: "Geometry",
  11: "Custom Colors",
  12: "Number Theory",
  13: "Matrices",
  14: "Complex",
  15: "Advanced",
};

/** VIS-KEYPAD-28: "sin⁻¹" and "logₐ" set as typeset exponents and subscripts. */
function FunctionLabel(props: { label: string }): JSX.Element {
  const { label } = props;
  if (label.endsWith("⁻¹")) {
    return (
      <>
        {label.slice(0, -2)}
        <sup>−1</sup>
      </>
    );
  }
  if (label.endsWith("ₐ")) {
    return (
      <>
        {label.slice(0, -1)}
        <sub>
          <i>a</i>
        </sub>
      </>
    );
  }
  return <>{label}</>;
}

export interface FunctionsPanelProps {
  id: string; // aria-controls target of the Functions key
  state: "open" | "closing";
  onInsert(entry: PanelEntry): void;
}

// The installed @types/react (18) has no `inert` prop; React 19 renders it as a boolean attribute.
const INERT: object = { inert: true };

/** Keeps focus in the row: a panel button's mousedown never moves focus to the button (K-5). */
const keepFocus = (event: { preventDefault(): void }) => event.preventDefault();

export function FunctionsPanel(props: FunctionsPanelProps): JSX.Element {
  const { id, state, onInsert } = props;
  const closing = state === "closing";
  return (
    <div
      id={id}
      className="kc-functions-panel"
      role="group"
      aria-label="Functions"
      data-state={state}
      {...(closing ? INERT : {})}
    >
      {panelCategories().map((category) => (
        <div key={category.id} className="kc-functions-category">
          <h3>{VISIBLE_HEADINGS[category.id] ?? category.heading}</h3>
          <div role="group" aria-label={category.heading}>
            {category.entries.map((entry) => (
              <button
                key={entry.spoken}
                type="button"
                className="kc-function"
                aria-label={entry.spoken}
                onMouseDown={keepFocus}
                onClick={() => onInsert(entry)}
              >
                <FunctionLabel label={entry.label} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
