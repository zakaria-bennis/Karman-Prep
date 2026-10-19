// The Functions panel (K-4, K-5, A11Y-5): a group named "Functions" holding, per
// shipped category of panelCategories(), an h3 under CATEGORY_HEADINGS and a group of buttons that
// show entry.label and are named by entry.spoken. The Keypad owns its open, closing and closed
// states; the panel mounts with data-state="enter" and a style flush moves it to "open", so AN-2's
// opening transition runs. A closing panel is inert, so a tap on it while it fades inserts nothing.

import { useId, useLayoutEffect, useRef, useState, type JSX } from "react";
import { panelCategories, type PanelEntry } from "@/lib/calculator/core/latex/operator-names";

/** L-1/L-2 threshold: the shell's LAYOUT_DESKTOP_MIN_WIDTH, repeated so the keypad needs no import. */
export const FUNCTIONS_COVER_BELOW = 450;

/** "cover" (the stacked layout's keypad area) below 450 px, otherwise "above" the keypad. */
export function functionsPlacement(containerWidth: number): "above" | "cover" {
  return containerWidth < FUNCTIONS_COVER_BELOW ? "cover" : "above";
}

export interface FunctionsPanelProps {
  id: string; // aria-controls target of the Functions key
  placement: "above" | "cover"; // functionsPlacement(containerWidth) (Decisions)
  state: "open" | "closing";
  onInsert(entry: PanelEntry): void;
}

// The installed @types/react (18) has no `inert` prop; React 19 renders it as a boolean attribute.
const INERT: object = { inert: true };

/** Keeps focus in the row: a panel button's mousedown never moves focus to the button (K-5). */
const keepFocus = (event: { preventDefault(): void }) => event.preventDefault();

export function FunctionsPanel(props: FunctionsPanelProps): JSX.Element {
  const { id, placement, state, onInsert } = props;
  const headingPrefix = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  // Mounted with data-state="enter": a style flush, then "open", starts the opening transition.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel !== null) void panel.offsetHeight;
    setEntered(true);
  }, []);

  const closing = state === "closing";
  return (
    <div
      ref={panelRef}
      id={id}
      className="kc-functions-panel"
      role="group"
      aria-label="Functions"
      data-state={closing ? "closing" : entered ? "open" : "enter"}
      data-placement={placement}
      {...(closing ? INERT : {})}
    >
      {panelCategories().map((category) => {
        const headingId = `${headingPrefix}-heading-${category.id}`;
        return (
          <div key={category.id} className="kc-functions-category">
            <h3 id={headingId}>{category.heading}</h3>
            <div role="group" aria-labelledby={headingId}>
              {category.entries.map((entry) => (
                <button
                  key={entry.spoken}
                  type="button"
                  className="kc-function"
                  aria-label={entry.spoken}
                  onMouseDown={keepFocus}
                  onClick={() => onInsert(entry)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
