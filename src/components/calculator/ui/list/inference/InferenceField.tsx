// FN-59: an inference row's small math fields (the confidence level and the null value), each with
// its default shown greyed while empty (Desmos's "0.95", "0", "0.5"), and the number a field holds.
// The number comes from a HelperExpression, so the backend evaluates the LaTeX with the rows'
// definitions (`a` works when a row defines it) and the main thread never evaluates it (AR-51).

import { useContext, useEffect, useLayoutEffect, useRef, useState, type JSX } from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { MathField } from "../../../math-field/MathField";
import { MathFieldFactoryContext } from "../math-field-factory";

const MAX_FIELD_CHARACTERS = 256;

/** The number `latex` evaluates to with the rows' definitions; NaN while blank or undefined. */
export function useFieldNumber(
  engine: Pick<CalculatorEngine, "HelperExpression">,
  latex: string
): number {
  const [value, setValue] = useState(NaN);
  useEffect(() => {
    if (latex.trim() === "") {
      setValue(NaN);
      return;
    }
    const helper = engine.HelperExpression({ latex });
    const read = () => setValue(helper.numericValue);
    helper.observe("numericValue", read);
    return () => {
      helper.unobserve("numericValue", read);
      helper.destroy();
    };
  }, [engine, latex]);
  return value;
}

export function InferenceField(props: {
  latex: string;
  placeholder: string;
  label: string; // the field's accessible name, "Confidence level"
  onChange(latex: string): void;
  onEnter?(): void; // Enter; by default it leaves the field
  autoFocus?: boolean; // focus the field when it first appears
}): JSX.Element {
  const host = useRef<HTMLSpanElement>(null);
  const create = useContext(MathFieldFactoryContext);
  const field = useRef<MathField | null>(null);
  const [focused, setFocused] = useState(false);
  const latest = useRef(props);
  latest.current = props;

  useLayoutEffect(() => {
    const f = create(host.current!, {
      ariaLabel: latest.current.label,
      maxLength: MAX_FIELD_CHARACTERS,
      onEdit: (latex) => latest.current.onChange(latex),
      onEnter: () => (latest.current.onEnter ? latest.current.onEnter() : f.blur()),
      onArrowOut: () => undefined,
      onDeleteOutOf: () => undefined,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      onRefused: () => undefined,
    });
    f.latex(latest.current.latex);
    field.current = f;
    if (latest.current.autoFocus === true) f.focus();
    return () => {
      field.current = null;
      f.destroy();
    };
  }, [create]);

  // a new stored value (undo, another view) goes into the field unless the student is typing in it
  useLayoutEffect(() => {
    const f = field.current;
    if (f !== null && !focused && f.latex() !== props.latex) f.latex(props.latex);
  }, [props.latex, focused]);

  const empty = props.latex === "" && !focused;
  return (
    <span className="kc-inf-field" data-empty={empty ? "true" : undefined}>
      <span ref={host} className="kc-inf-field-math" />
      {empty && (
        <span className="kc-inf-placeholder" aria-hidden="true">
          {props.placeholder}
        </span>
      )}
    </span>
  );
}
