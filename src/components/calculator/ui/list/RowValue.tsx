// A row's evaluation line (R-5, NM-38): a muted "=" followed by the value in a small raised box,
// right-aligned on its own line below the math. A list result shows one box per element, wrapping,
// the first 30 elements and then a last box holding "…". The kc-visually-hidden text carries the
// value, "equals 1, 2, 3, …", for the textbox's description (A11Y-3); it holds the line's id, so the
// copy button's name stays out of that description. A row switched to its fraction (R-5) shows one
// box with the stacked fraction typeset by MathQuill, `-\frac{1}{8}` with the sign before the bar,
// spoken "equals negative 1 eighth". A trig row's DEG/RAD badge follows the value (AngleBadge).
//
// Click to copy (owner, 2026-10-22): the "=" and the boxes are one button named "Copy value". A
// click, a tap, Enter or Space copies the value as shown (copiedValueText) and, once it is on the
// clipboard, shows a small check and "Copied" for 1.2 s, then fades it (instantly under reduced
// motion), and announces "Copied". The note floats out of flow at the value's top-right corner, over
// the delete-button column, so the value never moves. A failed copy shows and says nothing.
// A pointer press leaves focus where it was, as the gutter controls do.

import { useEffect, useLayoutEffect, useRef, useState, type JSX, type ReactNode } from "react";
import type { Value } from "@/lib/calculator/core/eval/values";
import { formatValue } from "@/lib/calculator/core/eval/format";
import { fractionLatex, type DisplayFraction } from "@/lib/calculator/core/eval/fraction";
import { groupIntegerDigits } from "../../math-field/digit-groups";
import { renderStaticMath } from "../../math-field/MathField";
import { useAnnouncer } from "../a11y/announcer";
import { copiedValueText, copyText } from "./copy-value";
import { spokenValue } from "./fraction-toggle";
import { EDITOR_MESSAGES } from "./messages";

/** NM-38: a list result shows this many elements, then "…". */
export const MAX_LIST_ELEMENTS = 30;
const ELLIPSIS = "…";

/** How long "Copied" stays before it fades, and how long the fade takes. */
export const COPIED_SHOW_MS = 1200;
export const COPIED_FADE_MS = 300;

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

/** A check mark drawn as one stroke in currentColor. */
function CheckGlyph(): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      width={10}
      height={10}
      viewBox="0 0 10 10"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1.5 5.4 4 7.8 8.6 2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type CopiedPhase = "shown" | "leaving" | null;

/** The "Copied" note's phase and the call that copies `text` and starts it. */
function useCopy(text: string): { phase: CopiedPhase; copy(): void } {
  const announcer = useAnnouncer();
  const [phase, setPhase] = useState<CopiedPhase>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);
  const clear = () => timers.current.splice(0).forEach(clearTimeout);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clear();
    };
  }, []);
  const copy = () => {
    void copyText(text).then((ok) => {
      if (!ok || !alive.current) return;
      clear();
      setPhase("shown");
      announcer.announce(EDITOR_MESSAGES.copied, { key: "copy-value" });
      timers.current.push(
        setTimeout(() => setPhase("leaving"), COPIED_SHOW_MS),
        setTimeout(() => setPhase(null), COPIED_SHOW_MS + COPIED_FADE_MS)
      );
    });
  };
  return { phase, copy };
}

function CopyableValue(props: {
  text: string;
  children: ReactNode;
  badge?: ReactNode;
}): JSX.Element {
  const { phase, copy } = useCopy(props.text);
  return (
    <span className="kc-row-value-line">
      <button
        type="button"
        className="kc-row-value-copy"
        aria-label={EDITOR_MESSAGES.copyValue}
        onMouseDown={(e) => e.preventDefault()}
        onClick={copy}
      >
        <span className="kc-row-equals" aria-hidden="true">
          =
        </span>
        {props.children}
      </button>
      {phase !== null && (
        <span className="kc-row-copied" data-phase={phase} aria-hidden="true">
          <CheckGlyph />
          {EDITOR_MESSAGES.copied}
        </span>
      )}
      {props.badge}
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
      <div className="kc-row-value">
        <CopyableValue text={copiedValueText([], fraction)} badge={props.badge}>
          <FractionBox fraction={fraction} />
        </CopyableValue>
        <span className="kc-visually-hidden" id={props.id}>{`equals ${spoken}`}</span>
      </div>
    );
  }
  const { boxes, spoken } = valueParts(props.value, props.valueText);
  return (
    <div className="kc-row-value">
      <CopyableValue text={copiedValueText(boxes, null)} badge={props.badge}>
        {boxes.map((text, i) => (
          <span key={i} className="kc-row-value-box" aria-hidden="true">
            {groupIntegerDigits(text)}
          </span>
        ))}
      </CopyableValue>
      <span className="kc-visually-hidden" id={props.id}>
        {spoken}
      </span>
    </div>
  );
}
