// A row's evaluation line (R-5, NM-38): a muted "=" followed by the value in a small raised box,
// right-aligned on its own line below the math. A list result shows one box per element, wrapping,
// the first 30 elements and then a last box holding "…". The visible boxes are aria-hidden; the
// kc-visually-hidden text carries the value, "equals 1, 2, 3, …", for the textbox's description
// (A11Y-3). A row switched to its fraction (R-5) shows one box with the stacked fraction typeset
// by MathQuill, `-\frac{1}{8}` with the sign before the bar, spoken "equals negative 1 eighth".
// A trig row's DEG/RAD badge follows the value (AngleBadge).

import { useLayoutEffect, useRef, type JSX, type ReactNode } from "react";
import type { Value } from "@/lib/calculator/core/eval/values";
import { formatValue } from "@/lib/calculator/core/eval/format";
import { fractionLatex, type DisplayFraction } from "@/lib/calculator/core/eval/fraction";
import { groupIntegerDigits } from "../../math-field/digit-groups";
import { renderStaticMath } from "../../math-field/MathField";
import { spokenValue } from "./fraction-toggle";

/** NM-38: a list result shows this many elements, then "…". */
export const MAX_LIST_ELEMENTS = 30;
const ELLIPSIS = "…";

export interface ValueParts {
  boxes: string[]; // the text of each box, T-10 digit grouping not yet applied
  spoken: string; // the assistive-technology text
}

/** The boxes and spoken text of a row's value: one box, or one per list element (NM-38). */
export function valueParts(value: Value | null, valueText: string): ValueParts {
  if (value?.type !== "list" || value.value.length === 0) {
    return { boxes: [valueText], spoken: `equals ${valueText}` };
  }
  const shown = value.value.slice(0, MAX_LIST_ELEMENTS).map((element) => formatValue(element));
  const more = value.value.length > MAX_LIST_ELEMENTS;
  return {
    boxes: more ? [...shown, ELLIPSIS] : shown,
    spoken: `equals ${shown.join(", ")}${more ? `, ${ELLIPSIS}` : ""}`,
  };
}

/** R-5: the value box holding the typeset stacked fraction. */
function FractionBox(props: { fraction: DisplayFraction }): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const latex = fractionLatex(props.fraction);
  useLayoutEffect(() => {
    if (ref.current !== null) renderStaticMath(ref.current, latex);
  }, [latex]);
  return (
    <span className="kc-row-value-box kc-row-value-fraction">
      <span ref={ref} data-latex={latex} />
    </span>
  );
}

export function RowValue(props: {
  id: string;
  value: Value | null;
  valueText: string;
  fraction?: DisplayFraction | null; // R-5: shown as this fraction
  badge?: ReactNode; // the DEG/RAD badge of a trig row, after the value
}): JSX.Element {
  const fraction = props.fraction ?? null;
  if (fraction !== null) {
    const spoken = spokenValue({ valueText: props.valueText, fraction, asFraction: true });
    return (
      <div className="kc-row-value" id={props.id}>
        <span className="kc-row-value-line" aria-hidden="true">
          <span className="kc-row-equals">=</span>
          <FractionBox fraction={fraction} />
          {props.badge}
        </span>
        <span className="kc-visually-hidden">{`equals ${spoken}`}</span>
      </div>
    );
  }
  const { boxes, spoken } = valueParts(props.value, props.valueText);
  return (
    <div className="kc-row-value" id={props.id}>
      <span className="kc-row-value-line" aria-hidden="true">
        <span className="kc-row-equals">=</span>
        {boxes.map((text, i) => (
          <span key={i} className="kc-row-value-box">
            {groupIntegerDigits(text)}
          </span>
        ))}
        {props.badge}
      </span>
      <span className="kc-visually-hidden">{spoken}</span>
    </div>
  );
}
