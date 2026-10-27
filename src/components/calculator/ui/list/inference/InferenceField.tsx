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
  // the value read for one LaTeX; a blank field sets no state at all
  const [read, setRead] = useState<{ latex: string; value: number } | null>(null);
  const blank = latex.trim() === "";
  useEffect(() => {
    if (blank) return;
    const helper = engine.HelperExpression({ latex });
    const onValue = () => setRead({ latex, value: helper.numericValue });
    helper.observe("numericValue", onValue);
    return () => {
      helper.unobserve("numericValue", onValue);
      helper.destroy();
    };
  }, [engine, latex, blank]);
  return !blank && read !== null && read.latex === latex ? read.value : NaN;
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
      onEnter: () => {
        if (latest.current.onEnter === undefined) return f.blur();
        // the field's last keystroke may not have reached its form yet: hand it over first, and
        // act once the form has rendered with it
        latest.current.onChange(f.latex());
        setTimeout(() => latest.current.onEnter?.(), 0);
      },
      onArrowOut: () => undefined,
      onDeleteOutOf: () => undefined,
      onFocus: () => setFocused(true),
      onBlur: () => {
        setFocused(false);
        // a last keystroke whose edit has not arrived yet must not be lost to the sync below
        if (f.latex() !== latest.current.latex) latest.current.onChange(f.latex());
      },
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
    const f = field.current,
      el = host.current;
    const root = el?.getRootNode() as Document | ShadowRoot | undefined;
    const editing = el != null && root !== undefined && el.contains(root.activeElement);
    if (f !== null && !editing && f.latex() !== props.latex) f.latex(props.latex);
  }, [props.latex]);

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
