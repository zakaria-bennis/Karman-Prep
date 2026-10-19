// The lines under a row's math that the reference shows for some rows: the add-slider prompt of a
// row with undefined names (RC-10, R-6, EL-36) and the Label checkbox of a point row (EL-15). Both
// fade in with the value line. Drawn with our own markup and CSS.

import { useId, type JSX } from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { displayName } from "@/lib/calculator/core/analysis";
import { nextSlot } from "@/lib/calculator/theme/roles";
import type { Announcer } from "../a11y/announcer";
import { EDITOR_MESSAGES } from "./messages";

/**
 * R-7: defines each name as `name=1` in new rows right after `rowId`, as one undo step. A name a
 * row already defines meanwhile is skipped; past the row limit nothing is added.
 */
export function addSliders(
  engine: CalculatorEngine,
  announcer: Announcer | null,
  rowId: string,
  names: readonly string[]
): void {
  const refused = engine.editRows((rows, ctx) => {
    const at = rows.findIndex((r) => r.id === rowId);
    if (at < 0 || names.length === 0) return null;
    const added = names.map((name, i) => ({
      id: ctx.nextId(),
      latex: `${name}=1`,
      color: nextSlot(at + 1 + i),
      hidden: false,
    }));
    return [...rows.slice(0, at + 1), ...added, ...rows.slice(at + 1)];
  });
  if (refused === "row-limit") announcer?.announce(EDITOR_MESSAGES.rowLimit);
}

export function AddSliderLine(props: {
  names: readonly string[];
  onAdd(names: readonly string[]): void;
}): JSX.Element {
  const { names } = props;
  const single = names.length === 1;
  return (
    <div className="kc-row-under kc-add-slider" role="group" aria-label="Add slider">
      <span className="kc-add-slider-label" aria-hidden="true">
        add slider:
      </span>
      {names.map((name) => (
        <button
          key={name}
          type="button"
          className="kc-letter-button"
          data-tone={single ? "accent" : undefined}
          aria-label={`Add slider for ${displayName(name)}`}
          onClick={() => props.onAdd([name])}
        >
          {displayName(name)}
        </button>
      ))}
      {!single && (
        <button
          type="button"
          className="kc-letter-button"
          data-tone="accent"
          data-word="true"
          aria-label="Add sliders for all"
          onClick={() => props.onAdd(names)}
        >
          all
        </button>
      )}
    </div>
  );
}

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
