// One axis of the settings popover (S-1; 09 Tasks 11 and 12): the `Show x-axis` checkbox, the
// `x-axis label` field committed on Enter or blur, the bounds line `[x minimum] ≤ x ≤ [x maximum]`
// as two MathFields from MathFieldFactoryContext that show the viewport bound while not focused,
// and the `x-axis step` field showing the step or blank (y likewise). S-7: a bound applies on
// Enter or blur once the backend evaluates it to a finite number that keeps min below max; the step
// takes a positive number or blank for automatic. An error shows below its field, which links it
// with aria-describedby and sets aria-invalid until a successful commit. Labels are <label>s.

import {
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import type { AxisSettings } from "@/lib/calculator/core/api/types";
import { formatValueLatex } from "@/lib/calculator/core/eval/format";
import { MAX_ROW_CHARACTERS } from "@/lib/calculator/core/latex/limits";
import type { Viewport } from "@/lib/calculator/plot/viewport";
import type { MathField } from "../../math-field/MathField";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { MathFieldFactoryContext } from "../list/math-field-factory";
import { EDITOR_MESSAGES } from "../list/messages";
import { fieldTextbox } from "../list/row-model";
import { evaluateBoundLatex } from "./bounds";

export interface SettingCheckProps {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
}

/** A checkbox named by the <label> around it; the popover and each axis section share it. */
export function SettingCheck(props: SettingCheckProps): JSX.Element {
  return (
    <label className="kc-settings-check">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

interface CommitInputProps {
  label: string;
  value: string; // shown whenever the field is not being edited
  inputMode?: "decimal";
  error?: string | null; // shown below the field and linked from it
  onCommit?(text: string): void; // Enter or blur, when the text differs from `value` or an error shows
}

/** A text field holding a draft while edited; Enter or blur commits it and shows `value` again. */
function CommitInput(props: CommitInputProps): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;
  const error = props.error ?? null;
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    // With an error showing, re-entering `value` is a commit too, so a valid entry clears it.
    if (draft !== props.value || error !== null) props.onCommit?.(draft);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commit();
  };
  return (
    <div className="kc-settings-field">
      <label htmlFor={id}>{props.label}</label>
      <input
        id={id}
        className="kc-settings-input"
        type="text"
        autoComplete="off"
        spellCheck={false}
        inputMode={props.inputMode}
        value={draft ?? props.value}
        aria-invalid={error !== null ? true : undefined}
        aria-describedby={error !== null ? errorId : undefined}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      {error !== null && (
        <p id={errorId} className="kc-settings-error">
          {error}
        </p>
      )}
    </div>
  );
}

interface BoundFieldProps {
  label: string;
  value: number;
  error: string | null;
  errorId: string; // the id of the element showing `error`
  onCommit(latex: string): void; // Enter or blur, with the latex the field holds
}

/** One bound as a MathField named `label`, showing `value` as LaTeX while not focused. */
function BoundField(props: BoundFieldProps): JSX.Element {
  const createField = useContext(MathFieldFactoryContext);
  const hostRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<MathField | null>(null);
  const [focused, setFocused] = useState(false);
  const displayed = formatValueLatex({ type: "number", value: props.value });
  const { label, error, errorId } = props;
  const onCommitRef = useRef(props.onCommit);

  useLayoutEffect(() => {
    onCommitRef.current = props.onCommit;
  });

  useLayoutEffect(() => {
    // Reads the typed latex before a blur's rerender writes the shown bound back.
    const commit = () => {
      const field = fieldRef.current;
      if (field !== null) onCommitRef.current(field.latex());
    };
    const field = createField(hostRef.current!, {
      ariaLabel: label,
      maxLength: MAX_ROW_CHARACTERS,
      onEdit: () => undefined,
      onEnter: commit,
      onArrowOut: () => undefined,
      onDeleteOutOf: () => undefined,
      onFocus: () => setFocused(true),
      onBlur: () => {
        commit();
        setFocused(false);
      },
      onRefused: () => undefined,
    });
    fieldRef.current = field;
    return () => {
      fieldRef.current = null;
      field.destroy();
    };
  }, [createField, label]);

  // The field's own deps rerun this for a new field; a focused field keeps what is typed.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field !== null && !focused && field.latex() !== displayed) field.latex(displayed);
  }, [createField, displayed, focused, label]);

  // After every render, so a new field gets the current error state too.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field === null) return;
    const textbox = fieldTextbox(field);
    if (error === null) {
      textbox.removeAttribute("aria-invalid");
      textbox.removeAttribute("aria-describedby");
    } else {
      textbox.setAttribute("aria-invalid", "true");
      textbox.setAttribute("aria-describedby", errorId);
    }
  });

  return <span className="kc-settings-bound" ref={hostRef} />;
}

type BoundSide = "min" | "max";

/** `view` with one bound replaced: x minimum is left, x maximum right, y bottom and top. */
function withBound(view: Viewport, axis: "x" | "y", side: BoundSide, value: number): Viewport {
  if (axis === "x") return side === "min" ? { ...view, left: value } : { ...view, right: value };
  return side === "min" ? { ...view, bottom: value } : { ...view, top: value };
}

/** S-7 step text: blank is automatic (null), a finite number above 0 is the step, else invalid. */
function parseStep(input: string): { step: number | null } | null {
  const text = input.trim();
  const v = Number(text);
  if (text === "") return { step: null };
  return Number.isFinite(v) && v > 0 ? { step: v } : null;
}

export function AxisSection(props: { axis: "x" | "y" }): JSX.Element {
  const { axis } = props;
  const engine = useEngine();
  const { settings, viewport } = useEngineSnapshot(engine);
  const id = useId();
  const [boundErrors, setBoundErrors] = useState<Record<BoundSide, string | null>>({
    min: null,
    max: null,
  });
  const [stepError, setStepError] = useState<string | null>(null);
  // Each bound field's latest commit; an evaluation that a later commit replaced is dropped.
  const commits = useRef<Record<BoundSide, number>>({ min: 0, max: 0 });
  const current = axis === "x" ? settings.xAxis : settings.yAxis;
  const bounds: Record<BoundSide, number> =
    axis === "x"
      ? { min: viewport.left, max: viewport.right }
      : { min: viewport.bottom, max: viewport.top };
  const errorIds: Record<BoundSide, string> = { min: `${id}-min-error`, max: `${id}-max-error` };
  // Reads the engine's settings at the moment of the change, so nothing stale is written back.
  const update = (patch: Partial<AxisSettings>) =>
    engine.updateSettings(
      axis === "x"
        ? { xAxis: { ...engine.settings.xAxis, ...patch } }
        : { yAxis: { ...engine.settings.yAxis, ...patch } }
    );
  const showBoundError = (side: BoundSide, message: string | null) =>
    setBoundErrors((errors) =>
      errors[side] === message ? errors : { ...errors, [side]: message }
    );

  // S-7, AR-51: a changed bound is evaluated by the backend. A finite result replaces that bound of
  // the viewport current when it arrives if min stays below max on both axes; otherwise an error
  // shows and the view is unchanged. Latex equal to the shown bound changes nothing.
  const commitBound = (side: BoundSide, latex: string) => {
    const commit = ++commits.current[side];
    if (latex === formatValueLatex({ type: "number", value: bounds[side] })) {
      showBoundError(side, null);
      return;
    }
    void evaluateBoundLatex(engine, latex).then((value) => {
      if (commit !== commits.current[side]) return;
      if (value === null) return showBoundError(side, EDITOR_MESSAGES.boundNotNumber);
      const next = withBound(engine.getSnapshot().viewport, axis, side, value);
      if (!(next.left < next.right && next.bottom < next.top)) {
        return showBoundError(side, EDITOR_MESSAGES.boundOrder);
      }
      engine.setMathBounds(next);
      showBoundError(side, null);
    });
  };

  const commitStep = (text: string) => {
    const parsed = parseStep(text);
    if (parsed === null) {
      setStepError(EDITOR_MESSAGES.stepInvalid);
      return;
    }
    update(parsed);
    setStepError(null);
  };

  const boundField = (side: BoundSide) => (
    <BoundField
      label={`${axis} ${side === "min" ? "minimum" : "maximum"}`}
      value={bounds[side]}
      error={boundErrors[side]}
      errorId={errorIds[side]}
      onCommit={(latex) => commitBound(side, latex)}
    />
  );

  return (
    <div className="kc-settings-axis">
      <SettingCheck
        label={`Show ${axis}-axis`}
        checked={current.show}
        onChange={(show) => update({ show })}
      />
      <CommitInput
        label={`${axis}-axis label`}
        value={current.label}
        onCommit={(label) => update({ label })}
      />
      <div className="kc-settings-bounds">
        {boundField("min")}
        <span className="kc-settings-relation" aria-hidden="true">
          ≤ <var>{axis}</var> ≤
        </span>
        {boundField("max")}
      </div>
      {(["min", "max"] as const).map(
        (side) =>
          boundErrors[side] !== null && (
            <p key={side} id={errorIds[side]} className="kc-settings-error">
              {boundErrors[side]}
            </p>
          )
      )}
      <CommitInput
        label={`${axis}-axis step`}
        value={current.step === null ? "" : String(current.step)}
        inputMode="decimal"
        error={stepError}
        onCommit={commitStep}
      />
    </div>
  );
}
