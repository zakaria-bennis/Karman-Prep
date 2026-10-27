// One axis of the settings popover (S-1, SETTINGS-19 and -24 to -26), laid out simply (founder
// decision, 2026-10-26): a row with the axis name and its show/hide switch, then the range the view
// shows as `[min] ≤ x ≤ [max]` (two MathFields), then a "Label and step" disclosure for the
// less-used parts: the `Label` field (while the axis shows; every keystroke sets the label) and
// `Step`, a third MathField (blank is Auto), hidden in polar mode (SETTINGS-15; y likewise). The
// disclosure starts open when the axis has a label or a step.
//
// The fields apply as you type, as the reference's do (SETTINGS-24): each edit is evaluated by the
// backend in the current angle mode, and while both bounds of the axis are valid (finite, min below
// max, a span between 1e-300 and 1e300) the view takes them. Otherwise both fields of the pair are
// marked invalid (a red underline, and their names end in "expression has error") and the graph
// keeps the last valid view. A field keeps what was typed (`-2\pi` stays `-2π`) until the view
// changes from elsewhere; it then shows the bound to 6 significant digits (SETTINGS-26). The step
// takes any expression with a finite value of 0 or more; blank or 0 is automatic, anything else is
// marked invalid and leaves the step unchanged (SETTINGS-25). Closing the popover unmounts this, so
// invalid text is dropped and the fields show the view again (SETTINGS-6). Each field is named as
// the reference names it: "X Axis Minimum: " and the spoken value, "X Axis Step Size:", "Label".

import { useContext, useEffect, useId, useLayoutEffect, useRef, useState, type JSX } from "react";
import type { AxisSettings } from "@/lib/calculator/core/api/types";
import { formatValueLatex } from "@/lib/calculator/core/eval/format";
import { MAX_ROW_CHARACTERS } from "@/lib/calculator/core/latex/limits";
import type { Viewport } from "@/lib/calculator/plot/viewport";
import type { MathField } from "../../math-field/MathField";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { MathFieldFactoryContext } from "../list/math-field-factory";
import { fieldTextbox } from "../list/row-model";
import { evaluateBoundLatex } from "./bounds";
import { SettingSwitchRow } from "./controls";

/** SETTINGS-26: a bound as the reference shows it, to 6 significant digits (-8.60887). */
export function boundLatex(value: number): string {
  return formatValueLatex({ type: "number", value: Number(value.toPrecision(6)) });
}

/** SETTINGS-24: whether min..max can be an axis of the view. */
export function isValidAxis(min: number, max: number): boolean {
  const span = max - min;
  return (
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min + 1e-8 * span > min &&
    span > 1e-300 &&
    span < 1e300
  );
}

/** SETTINGS-25: a step value: 0 is automatic (null), above 0 is the step, anything else invalid. */
export function stepFromValue(value: number | null): { step: number | null } | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return { step: value === 0 ? null : value };
}

/** "X Axis Minimum: negative 10", with " expression has error" while invalid (SETTINGS-10). */
function fieldName(label: string, speech: string, invalid: boolean): string {
  const name = speech === "" ? `${label}:` : `${label}: ${speech}`;
  return invalid ? `${name} expression has error` : name;
}

interface LiveFieldProps {
  label: string; // "X Axis Minimum", the start of the accessible name
  latex: string; // what the field shows while it is not holding typed text
  typed: boolean; // true while the field holds what was typed; `latex` is then not written
  invalid: boolean;
  onEdit(latex: string): void; // every edit, as typed
}

/** One live math field, named `label: <spoken value>`. */
function LiveField(props: LiveFieldProps): JSX.Element {
  const { label, latex, typed, invalid } = props;
  const createField = useContext(MathFieldFactoryContext);
  const hostRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<MathField | null>(null);
  const onEditRef = useRef(props.onEdit);
  const [, setSpeechTick] = useState(0);

  useLayoutEffect(() => {
    onEditRef.current = props.onEdit;
  });

  useLayoutEffect(() => {
    const field = createField(hostRef.current!, {
      ariaLabel: `${label}:`,
      maxLength: MAX_ROW_CHARACTERS,
      onEdit: (text) => {
        onEditRef.current(text);
        setSpeechTick((n) => n + 1); // renames the field after the edit
      },
      onEnter: () => undefined,
      onArrowOut: () => undefined,
      onDeleteOutOf: () => undefined,
      onFocus: () => undefined,
      onBlur: () => undefined,
      onRefused: () => undefined,
    });
    fieldRef.current = field;
    return () => {
      fieldRef.current = null;
      field.destroy();
    };
  }, [createField, label]);

  // After every render: show `latex` unless the field holds typed text, then name the field from
  // what it shows and mark it invalid or not.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field === null) return;
    if (!typed && field.latex() !== latex) field.latex(latex);
    const textbox = fieldTextbox(field);
    textbox.setAttribute("aria-label", fieldName(label, field.speechText(), invalid));
    if (invalid) textbox.setAttribute("aria-invalid", "true");
    else textbox.removeAttribute("aria-invalid");
  });

  return (
    <span className="kc-settings-bound" data-invalid={invalid ? "true" : undefined} ref={hostRef} />
  );
}

type Side = "min" | "max";

/** `view` with this axis set to min..max: x is left..right, y bottom..top. */
function withAxis(view: Viewport, axis: "x" | "y", min: number, max: number): Viewport {
  return axis === "x" ? { ...view, left: min, right: max } : { ...view, bottom: min, top: max };
}

function axisOf(view: Viewport, axis: "x" | "y"): Record<Side, number> {
  return axis === "x" ? { min: view.left, max: view.right } : { min: view.bottom, max: view.top };
}

/** The value of typed latex: null when blank or not a finite number. */
function evaluateTyped(engine: Parameters<typeof evaluateBoundLatex>[0], latex: string) {
  return latex.trim() === "" ? Promise.resolve(null) : evaluateBoundLatex(engine, latex);
}

export function AxisSection(props: { axis: "x" | "y" }): JSX.Element {
  const { axis } = props;
  const engine = useEngine();
  const { settings, viewport } = useEngineSnapshot(engine);
  const id = useId();
  const current = axis === "x" ? settings.xAxis : settings.yAxis;
  const bounds = axisOf(viewport, axis);
  const Axis = axis.toUpperCase();
  // Which fields hold typed text, whether the pair or the step is invalid.
  const [typed, setTyped] = useState({ min: false, max: false, step: false });
  const [pairInvalid, setPairInvalid] = useState(false);
  const [stepInvalid, setStepInvalid] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(current.label !== "" || current.step !== null);
  // The typed bounds' values (undefined: the field shows the view), the latest edit per field so
  // a slower evaluation never overwrites a newer one, and the axis this section last applied.
  const values = useRef<Record<Side, number | null | undefined>>({
    min: undefined,
    max: undefined,
  });
  const edits = useRef({ min: 0, max: 0, step: 0 });
  const applied = useRef<Record<Side, number> | null>(null);
  const appliedStep = useRef<number | null>(current.step);

  // Reads the engine's settings at the moment of the change, so nothing stale is written back.
  const update = (patch: Partial<AxisSettings>) =>
    engine.updateSettings(
      axis === "x"
        ? { xAxis: { ...engine.settings.xAxis, ...patch } }
        : { yAxis: { ...engine.settings.yAxis, ...patch } }
    );

  // The view moved from elsewhere (zoom, pan, the API): the bound fields show it again.
  useEffect(() => {
    const own = applied.current;
    if (own !== null && own.min === bounds.min && own.max === bounds.max) return;
    applied.current = null;
    values.current = { min: undefined, max: undefined };
    setTyped((t) => (t.min || t.max ? { ...t, min: false, max: false } : t));
    setPairInvalid(false);
  }, [bounds.min, bounds.max]);

  // The step changed from elsewhere (undo, the API): the step field shows it again.
  useEffect(() => {
    if (appliedStep.current === current.step) return;
    appliedStep.current = current.step;
    setTyped((t) => (t.step ? { ...t, step: false } : t));
    setStepInvalid(false);
  }, [current.step]);

  const editBound = (side: Side, latex: string) => {
    const edit = ++edits.current[side];
    setTyped((t) => (t[side] ? t : { ...t, [side]: true }));
    void evaluateTyped(engine, latex).then((value) => {
      if (edit !== edits.current[side]) return;
      values.current[side] = value;
      const view = engine.getSnapshot().viewport;
      const shown = axisOf(view, axis);
      const min = values.current.min === undefined ? shown.min : values.current.min;
      const max = values.current.max === undefined ? shown.max : values.current.max;
      if (min === null || max === null || !isValidAxis(min, max)) {
        setPairInvalid(true);
        return;
      }
      setPairInvalid(false);
      if (min === shown.min && max === shown.max) return;
      applied.current = { min, max };
      engine.setMathBounds(withAxis(view, axis, min, max));
    });
  };

  const editStep = (latex: string) => {
    const edit = ++edits.current.step;
    setTyped((t) => (t.step ? t : { ...t, step: true }));
    void evaluateTyped(engine, latex).then((value) => {
      if (edit !== edits.current.step) return;
      const parsed = latex.trim() === "" ? { step: null } : stepFromValue(value);
      setStepInvalid(parsed === null);
      if (parsed === null) return;
      appliedStep.current = parsed.step;
      update(parsed);
    });
  };

  const boundField = (side: Side) => (
    <LiveField
      label={`${Axis} Axis ${side === "min" ? "Minimum" : "Maximum"}`}
      latex={boundLatex(bounds[side])}
      typed={typed[side]}
      invalid={pairInvalid}
      onEdit={(latex) => editBound(side, latex)}
    />
  );

  const labelId = `${id}-label`;
  const detailsId = `${id}-details`;
  const showStep = !settings.polarGrid;
  const toggleDetails = () => {
    // Closing drops typed step text, as closing the popover does (SETTINGS-6).
    if (detailsOpen) {
      setTyped((t) => (t.step ? { ...t, step: false } : t));
      setStepInvalid(false);
    }
    setDetailsOpen((was) => !was);
  };
  return (
    <div className="kc-settings-axis">
      <SettingSwitchRow
        label={`${Axis}-Axis`}
        checked={current.show}
        onChange={(show) => update({ show })}
      />
      <div className="kc-settings-axis-line">
        <span className="kc-settings-bounds">
          {boundField("min")}
          <span className="kc-settings-relation" aria-hidden="true">
            <span>≤</span>
            <var>{axis}</var>
            <span>≤</span>
          </span>
          {boundField("max")}
        </span>
      </div>
      {(current.show || showStep) && (
        <button
          type="button"
          className="kc-axis-more"
          aria-expanded={detailsOpen}
          aria-controls={detailsOpen ? detailsId : undefined}
          onClick={toggleDetails}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            <path d="M4.5 2.5 8 6l-3.5 3.5" />
          </svg>
          {current.show && showStep ? "Label and step" : current.show ? "Label" : "Step"}
        </button>
      )}
      {detailsOpen && (current.show || showStep) && (
        <div className="kc-axis-details" id={detailsId}>
          {current.show && (
            <span className="kc-axis-field">
              <label className="kc-axis-field-name" htmlFor={labelId}>
                Label
              </label>
              <input
                id={labelId}
                className="kc-settings-label-input"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={`e.g. “${axis}”`}
                value={current.label}
                onChange={(event) => update({ label: event.currentTarget.value })}
              />
            </span>
          )}
          {showStep && (
            <span className="kc-axis-field kc-settings-step">
              <span className="kc-axis-field-name" aria-hidden="true">
                Step
              </span>
              <LiveField
                label={`${Axis} Axis Step Size`}
                latex={current.step === null ? "" : boundLatex(current.step)}
                typed={typed.step}
                invalid={stepInvalid}
                onEdit={editStep}
              />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
