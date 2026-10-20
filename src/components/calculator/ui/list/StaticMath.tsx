// Read-only typeset math for regression results (RT-23, RT-30): MathQuill's static math inside a
// span whose accessible name is the spoken form, so a screen reader hears "R squared equals 0.9 4 1
// 5" rather than the drawn glyphs. Focusable when `focusable` (the EQUATION and statistics are
// tab stops in the reference).

import { useLayoutEffect, useRef, type JSX } from "react";
import { renderStaticMath } from "../../math-field/MathField";

export function StaticMath(props: {
  latex: string;
  label: string;
  className?: string;
  focusable?: boolean;
}): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (ref.current !== null) renderStaticMath(ref.current, props.latex);
  }, [props.latex]);
  return (
    <span
      role="img"
      aria-label={props.label}
      className={`kc-static-math${props.className ? ` ${props.className}` : ""}`}
      tabIndex={props.focusable ? 0 : undefined}
    >
      <span ref={ref} aria-hidden="true" data-latex={props.latex} />
    </span>
  );
}
