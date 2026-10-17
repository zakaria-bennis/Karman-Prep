// One axis of the settings popover (S-1; 09 Task 11): the `Show x-axis` checkbox, the `x-axis
// label` field committed on Enter or blur, the bounds line `[x minimum] ≤ x ≤ [x maximum]` as two
// MathFields from MathFieldFactoryContext that show the viewport bound while not focused, and the
// `x-axis step` field showing the step or blank (y likewise). Task 12 adds the bound and step
// commits (S-7). Labels are <label> elements.

import {
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import type { AxisSettings } from "@/lib/calculator-v2/core/api/types";
import { formatValueLatex } from "@/lib/calculator-v2/core/eval/format";
import { MAX_ROW_CHARACTERS } from "@/lib/calculator-v2/core/latex/limits";
import type { MathField } from "../../math-field/MathField";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { MathFieldFactoryContext } from "../list/math-field-factory";

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
  onCommit?(text: string): void; // Enter or blur, only when the text differs from `value`
}

/** A text field holding a draft while edited; Enter or blur commits it and shows `value` again. */
function CommitInput(props: CommitInputProps): JSX.Element {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    if (draft !== props.value) props.onCommit?.(draft);
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
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

/** One bound as a MathField named `label`, showing `value` as LaTeX while not focused. */
function BoundField(props: { label: string; value: number }): JSX.Element {
  const createField = useContext(MathFieldFactoryContext);
  const hostRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<MathField | null>(null);
  const [focused, setFocused] = useState(false);
  const displayed = formatValueLatex({ type: "number", value: props.value });
  const { label } = props;

  useLayoutEffect(() => {
    const field = createField(hostRef.current!, {
      ariaLabel: label,
      maxLength: MAX_ROW_CHARACTERS,
      onEdit: () => undefined,
      onEnter: () => undefined,
      onArrowOut: () => undefined,
      onDeleteOutOf: () => undefined,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
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

  return <span className="kc-settings-bound" ref={hostRef} />;
}

export function AxisSection(props: { axis: "x" | "y" }): JSX.Element {
  const { axis } = props;
  const engine = useEngine();
  const { settings, viewport } = useEngineSnapshot(engine);
  const current = axis === "x" ? settings.xAxis : settings.yAxis;
  const [min, max] =
    axis === "x" ? [viewport.left, viewport.right] : [viewport.bottom, viewport.top];
  // Reads the engine's settings at the moment of the change, so nothing stale is written back.
  const update = (patch: Partial<AxisSettings>) =>
    engine.updateSettings(
      axis === "x"
        ? { xAxis: { ...engine.settings.xAxis, ...patch } }
        : { yAxis: { ...engine.settings.yAxis, ...patch } }
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
        <BoundField label={`${axis} minimum`} value={min} />
        <span className="kc-settings-relation" aria-hidden="true">
          ≤ <var>{axis}</var> ≤
        </span>
        <BoundField label={`${axis} maximum`} value={max} />
      </div>
      <CommitInput
        label={`${axis}-axis step`}
        value={current.step === null ? "" : String(current.step)}
        inputMode="decimal"
      />
    </div>
  );
}
