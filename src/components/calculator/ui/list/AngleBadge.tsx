// The angle-mode badge (owner decisions, 2026-10-21 and 2026-10-26): a row whose math uses a trig
// function (sin, cos, tan, sec, csc, cot, their arc forms, or a ^{-1} inverse) shows a small quiet
// "DEG" or "RAD" for the calculator's angle mode, at the end of its value line or, without one, at
// the row's bottom right. It is a button: a click, Enter or Space switches the whole calculator
// between radians and degrees, as Settings does, and every row follows. Desmos has no such control,
// so it is our own: a 24 px hit area around the small label, a pressed state, the new label fading
// in, and the change announced ("Angle set to degrees."). In complex mode, which works in radians,
// it is disabled and says so. Hyperbolic functions ignore the angle mode, so `\sinh` shows none.

import { useRef, type JSX } from "react";
import { useAnnouncer } from "../a11y/announcer";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { EDITOR_MESSAGES } from "./messages";
import { useRowTip } from "./RowTip";

/** The badge's tooltip: what a press does, or why it does nothing. */
export const angleBadgeTip = (mode: "radians" | "degrees", complex: boolean) =>
  complex
    ? "Complex mode uses radians."
    : `Angle mode. Switch to ${mode === "degrees" ? "radians" : "degrees"}.`;

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
  const engine = useEngine();
  const { settings } = useEngineSnapshot(engine);
  const announcer = useAnnouncer();
  const ref = useRef<HTMLButtonElement>(null);
  const complex = settings.complex;
  const tip = useRowTip(angleBadgeTip(props.mode, complex), ref);
  const degrees = props.mode === "degrees";
  const toggle = () => {
    if (complex) return;
    const next = degrees ? "radians" : "degrees";
    engine.updateSettings({ angleMode: next });
    announcer.announce(EDITOR_MESSAGES.angle(next));
  };
  return (
    <>
      <button
        ref={ref}
        type="button"
        className="kc-angle-badge"
        data-placement={props.placement}
        aria-label={`Angle mode: ${props.mode}.${complex ? "" : ` Switch to ${degrees ? "radians" : "degrees"}.`}`}
        aria-disabled={complex ? "true" : undefined}
        onClick={toggle}
        // a press keeps focus in the row's math, as the row's other small controls do
        onMouseDown={(e) => e.preventDefault()}
        {...tip.handlers}
      >
        <span key={props.mode} className="kc-angle-badge-label">
          {degrees ? "DEG" : "RAD"}
        </span>
      </button>
      {tip.tip}
    </>
  );
}
