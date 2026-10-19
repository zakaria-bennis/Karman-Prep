// PM-29: the hover tooltip of the list toolbar and the Expand list button. A black box with white
// 14 px text appears 450 ms after the pointer rests on the button (and at once on keyboard focus,
// a Karman addition), 3 px below it with a 5 px arrow, centred on it and kept inside the
// calculator. A disabled (aria-disabled) button shows none; a press, pointer leave or blur hides
// it. The button's aria-label already names it, so the tooltip is aria-hidden.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type JSX,
  type PointerEvent,
} from "react";

export const TOOLTIP_DELAY_MS = 450;
const EDGE = 4; // the least distance kept from the calculator's edges

export interface TooltipHandlers {
  onPointerEnter(e: PointerEvent<HTMLElement>): void;
  onPointerLeave(): void;
  onPointerDown(): void;
  onFocus(e: FocusEvent<HTMLElement>): void;
  onBlur(): void;
}

/** Tooltip state for one button: whether it shows, and the handlers that drive it. */
export function useTooltip(disabled: boolean): { open: boolean; handlers: TooltipHandlers } {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const hide = () => {
    clear();
    setOpen(false);
  };
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );
  return {
    open: open && !disabled,
    handlers: {
      onPointerEnter(e) {
        if (disabled || e.pointerType === "touch") return;
        clear();
        timer.current = setTimeout(() => setOpen(true), TOOLTIP_DELAY_MS);
      },
      onPointerLeave: hide,
      onPointerDown: hide,
      onFocus(e) {
        if (!disabled && e.currentTarget.matches(":focus-visible")) setOpen(true);
      },
      onBlur: hide,
    },
  };
}

/** The tooltip box, rendered inside its button; shifted sideways to stay inside `.kc-app`. */
export function Tooltip(props: { text: string }): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const tip = ref.current;
    const app = tip?.closest(".kc-app");
    if (tip === null || app === null || app === undefined) return;
    const t = tip.getBoundingClientRect();
    const a = app.getBoundingClientRect();
    const shift =
      t.left < a.left + EDGE
        ? a.left + EDGE - t.left
        : t.right > a.right - EDGE
          ? a.right - EDGE - t.right
          : 0;
    tip.style.setProperty("--kc-tip-shift", `${shift}px`);
  }, [props.text]);
  return (
    <span ref={ref} className="kc-tooltip" aria-hidden="true">
      {props.text}
    </span>
  );
}
