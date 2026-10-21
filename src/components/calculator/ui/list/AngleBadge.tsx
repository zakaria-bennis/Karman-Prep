// The angle-mode badge (owner decision, 2026-10-21): a row whose math uses a trig function (sin,
// cos, tan, sec, csc, cot, their arc forms, or a ^{-1} inverse) shows a small quiet "DEG" or "RAD"
// for the calculator's angle mode, at the end of its value line or, without one, at the row's
// bottom right. It is not a control: it follows the setting, takes no focus, and on a desktop
// pointer its tooltip says "Angle mode. Change it in Settings." It is aria-hidden: the setting
// itself is announced and reachable in Settings. Hyperbolic functions ignore the angle mode, so
// `\sinh` shows none.

import { useRef, type JSX } from "react";
import { useRowTip } from "./RowTip";

export const ANGLE_BADGE_TIP = "Angle mode. Change it in Settings.";

/** sin to cot and arcsin to arccot, as a command or an operator name, never sinh or arcsinh. */
const TRIG = /\\(?:operatorname\{)?(?:arc)?(?:sin|cos|tan|sec|csc|cot)(?![a-zA-Z])/;

/** Whether a row's latex uses a trig function, so its value depends on the angle mode. */
export function usesTrig(latex: string): boolean {
  return TRIG.test(latex);
}

export function AngleBadge(props: {
  mode: "radians" | "degrees";
  placement: "value" | "row";
}): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const tip = useRowTip(ANGLE_BADGE_TIP, ref);
  const degrees = props.mode === "degrees";
  return (
    <>
      <span
        ref={ref}
        className="kc-angle-badge"
        data-placement={props.placement}
        aria-hidden="true"
        onPointerEnter={tip.handlers.onPointerEnter}
        onPointerLeave={tip.handlers.onPointerLeave}
        onPointerDown={tip.handlers.onPointerDown}
      >
        {degrees ? "DEG" : "RAD"}
      </span>
      {tip.tip}
    </>
  );
}
