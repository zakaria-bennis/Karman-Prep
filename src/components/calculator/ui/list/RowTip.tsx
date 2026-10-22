// The hover tooltip of a small control inside a row: the DEG/RAD badge (owner decision,
// 2026-10-21). It looks like the toolbar's tooltip (PM-29: a black box with white
// text that appears 500 ms after the pointer rests, and at once on keyboard focus, and leaves
// 170 ms after the pointer does), but a row clips its overflow, so the box is portalled into the
// calculator root and placed with position: fixed below the anchor (above it when there is no room
// below), kept 2 px inside the root. Touch never opens it. It is aria-hidden: the anchor names
// itself.

import { useLayoutEffect, useRef, useState, type JSX, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTooltip, type TooltipHandlers } from "./Tooltip";

const GAP = 7; // anchor to box: the 5 px arrow plus 2 px
const EDGE = 2;

/** Places `tip` centred below `anchor` (above when it does not fit), inside `layer`. */
function place(tip: HTMLElement, anchor: HTMLElement, layer: Element): void {
  const a = anchor.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  const width = tip.offsetWidth;
  const height = tip.offsetHeight;
  const centre = a.left + a.width / 2;
  const left = Math.max(l.left + EDGE, Math.min(centre - width / 2, l.right - width - EDGE));
  let top = a.bottom + GAP;
  let side = "below";
  if (top + height > l.bottom - EDGE && a.top - GAP - height >= l.top + EDGE) {
    top = a.top - GAP - height;
    side = "above";
  }
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  // A transformed ancestor would make position: fixed relative to it; measure and correct once.
  const placed = tip.getBoundingClientRect();
  if (Math.abs(placed.left - left) > 0.5 || Math.abs(placed.top - top) > 0.5) {
    tip.style.left = `${left - (placed.left - left)}px`;
    tip.style.top = `${top - (placed.top - top)}px`;
  }
  tip.style.setProperty("--kc-tip-arrow", `${centre - left}px`);
  tip.dataset.side = side;
}

function RowTipBox(props: { text: string; anchor: RefObject<HTMLElement | null> }): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const [layer, setLayer] = useState<Element | null>(null);
  useLayoutEffect(() => {
    const anchor = props.anchor.current;
    setLayer(anchor?.closest(".kc-app") ?? anchor?.parentElement ?? null);
  }, [props.anchor]);
  useLayoutEffect(() => {
    const tip = ref.current;
    const anchor = props.anchor.current;
    if (tip === null || anchor === null || layer === null) return;
    place(tip, anchor, layer);
  }, [layer, props.anchor, props.text]);
  if (layer === null) return <></>;
  return createPortal(
    <span ref={ref} className="kc-row-tip" aria-hidden="true">
      {props.text}
    </span>,
    layer
  );
}

/**
 * The tooltip for one anchor: the handlers to spread on it, and the box to render while open.
 * `disabled` keeps it shut (for example while the anchor's menu is open).
 */
export function useRowTip(
  text: string,
  anchor: RefObject<HTMLElement | null>,
  disabled = false
): { handlers: TooltipHandlers; tip: JSX.Element | null; hide(): void } {
  const { open, handlers } = useTooltip(disabled);
  return {
    handlers,
    tip: open ? <RowTipBox text={text} anchor={anchor} /> : null,
    hide: () => handlers.onPointerDown(),
  };
}
