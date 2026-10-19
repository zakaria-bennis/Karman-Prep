// PM-29 to PM-31 (popovers-menus.md VIS-29 to VIS-31): the hover tooltip of the list toolbar, the
// Expand list button and the graph controls. A black box with white 14 px text appears 500 ms
// after the pointer rests on the button (and at once on keyboard focus, a Karman addition) and
// fades in over 300 ms (CSS); below the button it sits 3 px under it, centred on it and kept 2 px
// inside the calculator, and to the left of a graph control it is centred 5 px from it. It leaves
// 170 ms after the pointer does, with no fade, and at once on a press or blur. A disabled
// (aria-disabled) button shows none. The button's aria-label already names it, so the tooltip is
// aria-hidden.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type JSX,
  type PointerEvent,
} from "react";

export const TOOLTIP_DELAY_MS = 500;
export const TOOLTIP_HIDE_MS = 170;
const EDGE = 2; // the least distance kept from the calculator's edges

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
      onPointerLeave() {
        clear();
        timer.current = setTimeout(() => setOpen(false), TOOLTIP_HIDE_MS);
      },
      onPointerDown: hide,
      onFocus(e) {
        if (!disabled && e.currentTarget.matches(":focus-visible")) setOpen(true);
      },
      onBlur: hide,
    },
  };
}

/** The tooltip box, rendered inside its button; below it, shifted sideways to stay inside `.kc-app`. */
export function Tooltip(props: { text: string; side?: "below" | "left" }): JSX.Element {
  const side = props.side ?? "below";
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const tip = ref.current;
    const app = tip?.closest(".kc-app");
    if (tip === null || app === null || app === undefined || side !== "below") return;
    const t = tip.getBoundingClientRect();
    const a = app.getBoundingClientRect();
    const shift =
      t.left < a.left + EDGE
        ? a.left + EDGE - t.left
        : t.right > a.right - EDGE
          ? a.right - EDGE - t.right
          : 0;
    tip.style.setProperty("--kc-tip-shift", `${shift}px`);
  }, [props.text, side]);
  return (
    <span ref={ref} className="kc-tooltip" data-side={side} aria-hidden="true">
      {props.text}
    </span>
  );
}
