// A slider row's limits editor (SLIDERS-15 to SLIDERS-18): `[min] ≤ a ≤ [max]   Step: [step]` in
// place of the track while the row is being edited, while a limit is invalid, and always (Step
// only) in Play indefinitely mode. The min and max fields are empty unless that limit was typed;
// typing one makes it hard and clearing it makes it soft again. Enter or Escape closes the editor
// onto the thumb (only while every limit is valid); Right at the end of a field moves to the next,
// Left at the start to the previous; Up goes to the row's math and Down to the next row. Tab past
// the last field and Shift+Tab before the first leave the editor (SLIDERS-25).

import { useContext, useLayoutEffect, useRef, type JSX } from "react";
import { setSliderLimit, type LimitField } from "@/lib/calculator/core/api/sliders";
import type { MathField, MathFieldOptions } from "../../math-field/MathField";
import { useEngine } from "../hooks/use-engine";
import { MathFieldFactoryContext } from "./math-field-factory";

const LABELS: Record<LimitField, string> = {
  min: "Slider Minimum:",
  max: "Slider Maximum:",
  step: "Slider Step Size:",
};
const MAX_LIMIT_CHARACTERS = 256;

export interface SliderLimitsProps {
  rowId: string;
  name: string; // display name, between the two ≤
  stepOnly: boolean; // Play indefinitely
  latex: Readonly<Record<LimitField, string>>; // "" for a soft min or max
  invalid: Readonly<Record<LimitField, boolean>>;
  valid: boolean; // every limit valid: Enter and Escape may close the editor
  autoFocus: LimitField | null;
  autoFocusKey: number; // a new key focuses autoFocus again
  onFocusChange(focused: boolean): void;
  onDone(): void; // Enter or Escape: close onto the thumb
  onLeave(direction: "up" | "down"): void;
  onTabOut(direction: "forward" | "back"): void; // Tab from the last field, Shift+Tab from the first
}

function LimitField(props: {
  field: LimitField;
  latex: string;
  invalid: boolean;
  register(field: LimitField, f: MathField | null): void;
  options: (field: LimitField) => MathFieldOptions;
}): JSX.Element {
  const host = useRef<HTMLSpanElement>(null);
  const create = useContext(MathFieldFactoryContext);
  const fieldRef = useRef<MathField | null>(null);
  const { field, register, options } = props;
  const latest = useRef(props.latex);
  latest.current = props.latex;
  useLayoutEffect(() => {
    const f = create(host.current!, options(field));
    f.latex(latest.current);
    fieldRef.current = f;
    register(field, f);
    return () => {
      register(field, null);
      fieldRef.current = null;
      f.destroy();
    };
    // The field lives as long as the editor; options read their callbacks through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [create, field]);
  useLayoutEffect(() => {
    const f = fieldRef.current;
    const root = host.current?.getRootNode() as Document | ShadowRoot | undefined;
    const editing = root !== undefined && host.current!.contains(root.activeElement);
    if (f !== null && f.latex() !== props.latex && !editing) {
      f.latex(props.latex);
    }
  }, [props.latex]);
  return (
    <span
      ref={host}
      className="kc-slider-limit"
      data-field={field}
      data-invalid={props.invalid ? "true" : undefined}
    />
  );
}

export function SliderLimits(props: SliderLimitsProps): JSX.Element {
  const engine = useEngine();
  const fields = useRef(new Map<LimitField, MathField>());
  const latest = useRef(props);
  latest.current = props;
  const order: LimitField[] = props.stepOnly ? ["step"] : ["min", "max", "step"];
  const orderRef = useRef(order);
  orderRef.current = order;

  const register = (field: LimitField, f: MathField | null) => {
    if (f === null) fields.current.delete(field);
    else fields.current.set(field, f);
  };
  const move = (field: LimitField, by: 1 | -1) => {
    const list = orderRef.current;
    const next = list[list.indexOf(field) + by];
    if (next !== undefined) fields.current.get(next)?.focus();
  };
  const options = (field: LimitField): MathFieldOptions => ({
    ariaLabel: LABELS[field],
    maxLength: MAX_LIMIT_CHARACTERS,
    onEdit: (latex: string) =>
      setSliderLimit(engine, latest.current.rowId, field, latex, performance.now()),
    onEnter: () => {
      if (latest.current.valid) latest.current.onDone();
    },
    onArrowOut: (direction) => latest.current.onLeave(direction),
    onMoveOutOf: (direction) => move(field, direction === "right" ? 1 : -1),
    onDeleteOutOf: () => undefined,
    onFocus: () => latest.current.onFocusChange(true),
    onBlur: () => latest.current.onFocusChange(false),
    onRefused: () => undefined,
  });

  useLayoutEffect(() => {
    if (props.autoFocus !== null) fields.current.get(props.autoFocus)?.focus();
  }, [props.autoFocus, props.autoFocusKey]);

  const field = (f: LimitField) => (
    <LimitField
      key={f}
      field={f}
      latex={props.latex[f]}
      invalid={props.invalid[f]}
      register={register}
      options={options}
    />
  );
  return (
    <div
      className="kc-slider-limits"
      onKeyDownCapture={(e) => {
        if (e.key === "Tab") {
          // SLIDERS-25: Tab leaves the last field for the thumb, Shift+Tab the first for delete.
          const field = (e.target as Element).closest<HTMLElement>(".kc-slider-limit")?.dataset
            .field;
          const list = orderRef.current;
          const edge = e.shiftKey ? list[0] : list[list.length - 1];
          if (field !== edge) return;
          e.preventDefault();
          e.stopPropagation();
          latest.current.onTabOut(e.shiftKey ? "back" : "forward");
          return;
        }
        if (e.key !== "Escape" || !latest.current.valid) return;
        e.preventDefault();
        e.stopPropagation();
        latest.current.onDone();
      }}
    >
      {!props.stepOnly && (
        <span className="kc-slider-interval">
          {field("min")}
          <span className="kc-slider-relation" aria-hidden="true">
            <span className="kc-slider-le">≤</span>
            <var>{props.name}</var>
            <span className="kc-slider-le">≤</span>
          </span>
          {field("max")}
        </span>
      )}
      <span className="kc-slider-step">
        <span className="kc-slider-step-label" aria-hidden="true">
          Step:
        </span>
        {field("step")}
      </span>
    </div>
  );
}
