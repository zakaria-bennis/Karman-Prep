// The lines under a row's math: the add-slider prompt of a row with undefined names (RC-10, R-6,
// SLIDERS-4, SLIDERS-8; owner, 2026-10-22: Desmos's own prompt, measured on live Desmos) and the
// Label checkbox of a point row (EL-15). Both fade in with the value line. Drawn with our own
// markup and CSS.

import { useId, type JSX } from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { displayName } from "@/lib/calculator/core/analysis";
import type { Announcer } from "../a11y/announcer";
import { addRowsAfter } from "./row-actions";

/** R-7: defines each name as `name=1` in new rows right after `rowId`, as one undo step. */
export function addSliders(
  engine: CalculatorEngine,
  announcer: Announcer | null,
  rowId: string,
  names: readonly string[]
): void {
  addRowsAfter(engine, announcer, rowId, names);
}

/** SLIDERS-4: at most this many name buttons, as on Desmos; "all" still adds every name. */
export const MAX_SLIDER_BUTTONS = 4;

/** Desmos's degree sign is the name `\degree`: its button shows ° and is spoken "degrees". */
const DEGREE = "\\degree";
const spokenName = (name: string) => (name === DEGREE ? "degrees" : displayName(name));

/** A name typeset as the row shows it: an italic letter and an upright subscript. */
export function NameText(props: { name: string }): JSX.Element {
  const shown = props.name === DEGREE ? "°" : displayName(props.name);
  const at = shown.indexOf("_");
  if (at < 0) return <>{shown}</>;
  return (
    <>
      {shown.slice(0, at)}
      <sub className="kc-letter-sub">{shown.slice(at + 1)}</sub>
    </>
  );
}

/**
 * R-6: "add slider:" then one button per name in order of first appearance (at most four), then
 * an accent "all"; a single name is one accent button and no "all". A button adds its sliders;
 * a click leaves focus to fall where it may (the button goes), Enter or Space returns focus to
 * the row's math (SLIDERS-8), as on Desmos.
 */
export function AddSliderLine(props: {
  names: readonly string[];
  afterSlider?: boolean; // SLIDERS-10: under a slider's limits
  onAdd(names: readonly string[], keyboard: boolean): void; // keyboard: Enter or Space, not a click
}): JSX.Element {
  const { names } = props;
  const single = names.length === 1;
  const labelId = `kc-add-slider-${useId().replace(/:/g, "")}`;
  return (
    <div
      className="kc-row-under kc-add-slider"
      data-after={props.afterSlider === true ? "slider" : undefined}
      role="group"
      aria-labelledby={labelId}
    >
      <span id={labelId} className="kc-add-slider-label">
        add slider:
      </span>
      {names.slice(0, MAX_SLIDER_BUTTONS).map((name) => (
        <button
          key={name}
          type="button"
          className="kc-letter-button"
          data-tone={single ? "accent" : undefined}
          aria-label={`Add slider for ${spokenName(name)}`}
          onClick={(e) => props.onAdd([name], e.detail === 0)}
        >
          <NameText name={name} />
        </button>
      ))}
      {!single && (
        <button
          type="button"
          className="kc-letter-button"
          data-tone="accent"
          data-word="true"
          aria-label="Add sliders for all"
          onClick={(e) => props.onAdd(names, e.detail === 0)}
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
