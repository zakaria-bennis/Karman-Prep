"use client";

// Karman's icon-only Transfer to Calculator control (AR-12, TR-41 to TR-59). It renders only
// where useCalculator() returns a v2 bridge (TR-4, OI-21). A mouse or hovering pen reveals it by
// hover (TR-54), a touch or pen tap on its item selects the item (TR-55 to TR-58), and keyboard
// focus always shows it (TR-59). Eager: no v2 code; the item comes from the lazy classifier (D4).

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ArrowUpRight, Calculator } from "lucide-react";
import type { TransferItem } from "@/lib/calculator-transfer/classify";
import { useCalculator, type V2Bridge } from "./CalculatorScope";
import { isCoreRejection, reportTransferRejection } from "./transfer-report";
import {
  isHoverPointer,
  isTap,
  transferSelection,
  triggerFor,
  type PointerSample,
} from "./transfer-selection";
import "./transfer-control.css";

export const TRANSFER_TOOLTIP = "Transfer to Calculator";
export const TOOLTIP_DELAY_MS = 300; // TR-51
export const FINE_TARGET_PX = 24; // TR-44
export const COARSE_TARGET_PX = 44; // TR-44, TR-55
export const INLINE_OVERLAP_PX = 4; // TR-46
const TOOLTIP_EDGE_PX = 8; // the tooltip flips left when its right edge would pass innerWidth - 8

/** TR-46: inline controls sit above the end of the item's last line, overlapping it by 4 px;
 * block controls sit inside the item's top-right corner. With no rects (jsdom, detached) the
 * styles stay as they are. */
export function placeControl(
  anchor: HTMLElement,
  item: HTMLElement,
  button: HTMLElement,
  placement: "inline" | "block",
  size: number
): void {
  const rects = item.getClientRects();
  if (rects.length === 0) return;
  const a = anchor.getBoundingClientRect();
  const r = placement === "inline" ? rects[rects.length - 1] : item.getBoundingClientRect();
  button.style.left = `${r.right - a.left - size}px`;
  button.style.top =
    placement === "inline" ? `${r.top - a.top - size + INLINE_OVERLAP_PX}px` : `${r.top - a.top}px`;
}

/** TR-51: the tooltip beside the button with no gap, vertically centred on it; right of the
 * button, or left of it when it would pass the viewport's right edge. */
function placeTooltip(anchor: HTMLElement, button: HTMLElement, tip: HTMLElement): void {
  const a = anchor.getBoundingClientRect();
  const b = button.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  if (b.width === 0 || t.width === 0) return;
  const right = b.right + t.width <= window.innerWidth - TOOLTIP_EDGE_PX;
  tip.style.left = `${(right ? b.right : b.left - t.width) - a.left}px`;
  tip.style.top = `${b.top - a.top + (b.height - t.height) / 2}px`;
}

export interface TransferControlProps {
  item: TransferItem;
  accessibleName: string;
  placement: "inline" | "block" | "cluster"; // TR-46, TR-42
}

export function TransferControl(props: TransferControlProps): JSX.Element | null {
  const bridge = useCalculator();
  return bridge?.version === "v2" ? <V2TransferControl {...props} bridge={bridge} /> : null;
}

type Listeners = [EventTarget, string, (event: PointerEvent) => void][];
const listen = (list: Listeners) => {
  for (const [target, type, fn] of list) target.addEventListener(type, fn as EventListener);
  return () => {
    for (const [target, type, fn] of list) target.removeEventListener(type, fn as EventListener);
  };
};

function V2TransferControl({
  item,
  accessibleName,
  placement,
  bridge,
}: TransferControlProps & { bridge: V2Bridge }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const current = useRef({ bridge, item });
  current.current = { bridge, item };
  const selected = useSyncExternalStore(
    transferSelection.subscribe,
    () => {
      const s = transferSelection.get();
      return s !== null && s.questionKey === bridge.questionKey && s.sourceId === item.sourceId;
    },
    () => false
  );
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const pointer = useRef({
    overItem: false,
    overControl: false,
    hoverType: "", // pointerType of the last accepted hover pointerenter
    lastDown: null as { pointerType: string } | null, // decision "Pointer record"
    focusing: false, // TR-68: activate() focuses the button, which shows no tooltip
    timer: null as ReturnType<typeof setTimeout> | null,
    focused: false,
    selected: false, // with focused, for the synchronous data-visible write
    tooltip: false,
    escaped: false, // TR-49: hidden by Escape until the pointer leaves and re-enters the item
    leftSinceEscape: false,
    place: () => {}, // places the button now (inline and block)
  });
  const inlineOrBlock = placement !== "cluster";
  const visible = focused || selected || hovered;
  pointer.current.focused = focused;
  pointer.current.selected = selected;
  pointer.current.tooltip = tooltip;

  // The item element, its marker and (inline and block) the hover and tap listeners.
  useEffect(() => {
    const a = anchor.current;
    const b = button.current;
    if (a === null || b === null) return;
    const p = pointer.current;
    const el =
      placement === "cluster"
        ? a.closest('[data-calculator="v2"]')?.parentElement
        : a.previousElementSibling;
    p.place = () => {
      if (inlineOrBlock && el instanceof HTMLElement) {
        const size = p.selected ? COARSE_TARGET_PX : FINE_TARGET_PX;
        placeControl(a, el, b, placement, size);
      }
    };
    // Written synchronously, so a reveal never waits for a render (DOM contract).
    const sync = () => {
      const on = (p.overItem || p.overControl) && !p.escaped;
      if (inlineOrBlock) {
        const shown = p.focused || p.selected || on;
        if (shown && a.dataset.visible !== "true") p.place();
        a.dataset.visible = String(shown);
      } else if (p.overItem) a.dataset.hover = "true";
      else delete a.dataset.hover;
      setHovered(on);
    };
    const enter = (key: "overItem" | "overControl") => (e: PointerEvent) => {
      if (!isHoverPointer(e)) return;
      // TR-49: only re-entering the item (or, for a cluster, the choice) after leaving it ends
      // an Escape; pointer events on the anchor or button never do.
      if (key === "overItem" && p.leftSinceEscape) {
        p.escaped = false;
        p.leftSinceEscape = false;
        delete a.dataset.escaped;
      }
      p[key] = true;
      p.hoverType = e.pointerType;
      sync();
    };
    const leave = (key: "overItem" | "overControl") => (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (key === "overItem" && p.escaped) p.leftSinceEscape = true;
      p[key] = false;
      sync();
    };
    const hideTip = () => {
      if (p.timer !== null) clearTimeout(p.timer);
      p.timer = null;
      setTooltip(false);
    };
    // TR-49: Escape hides a hover- or tap-revealed control and its tooltip, without moving focus,
    // and is consumed only when it hid something. A cluster that TR-42 keeps visible is skipped.
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!inlineOrBlock && window.matchMedia?.("(any-pointer: coarse)").matches) return;
      const hovered = (p.overItem || p.overControl) && !p.escaped;
      const hid = p.tooltip || p.timer !== null || p.selected || (!p.focused && hovered);
      if (!hid) return;
      hideTip();
      if (!p.focused && (hovered || p.selected)) {
        p.escaped = true;
        p.leftSinceEscape = false;
        if (!inlineOrBlock) a.dataset.escaped = "true";
      }
      if (p.selected) transferSelection.clear();
      sync();
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("keydown", escape);
    const list: Listeners = [
      [a, "pointerenter", enter("overControl")],
      [
        a,
        "pointerleave",
        (e) => {
          leave("overControl")(e);
          hideTip(); // the tooltip is inside the anchor, so it persists while over either
        },
      ],
      [
        b,
        "pointerenter",
        (e) => {
          if (!isHoverPointer(e)) return;
          current.current.bridge.prefetch();
          if (p.timer === null && !p.escaped)
            p.timer = setTimeout(() => {
              p.timer = null;
              setTooltip(true);
            }, TOOLTIP_DELAY_MS);
        },
      ],
      [
        b,
        "pointerleave",
        (e) => {
          if (e.buttons !== 0) p.lastDown = null; // a press dragged off never becomes a click
          // The tooltip persists while the pointer moves onto it (TR-51); anywhere else hides it.
          const to = e.relatedTarget;
          if (!(to instanceof Node && a.contains(to))) hideTip();
        },
      ],
      [b, "pointercancel", () => (p.lastDown = null)],
    ];
    if (el instanceof HTMLElement) {
      el.setAttribute("data-transfer-item", "");
      // A cluster's choice container reveals its control on hover (TR-42, AR-11).
      if (!inlineOrBlock)
        list.push([el, "pointerenter", enter("overItem")], [el, "pointerleave", leave("overItem")]);
      if (inlineOrBlock) {
        let down: PointerSample | null = null;
        let maxMove = 0;
        const sample = (e: PointerEvent): PointerSample => ({
          pointerType: e.pointerType,
          x: e.clientX,
          y: e.clientY,
          t: e.timeStamp,
        });
        list.push(
          [el, "pointerenter", enter("overItem")],
          [el, "pointerleave", leave("overItem")],
          [
            el,
            "pointerdown",
            (e) => {
              const contact = e.pointerType === "touch" || e.pointerType === "pen";
              down = contact ? sample(e) : null;
              maxMove = 0;
            },
          ],
          [
            el,
            "pointermove",
            (e) => {
              if (down !== null)
                maxMove = Math.max(maxMove, Math.hypot(e.clientX - down.x, e.clientY - down.y));
            },
          ],
          [el, "pointercancel", () => (down = null)],
          [
            el,
            "pointerup",
            (e) => {
              const start = down;
              down = null;
              const collapsed = window.getSelection?.()?.isCollapsed ?? true;
              if (start === null || !isTap(start, sample(e), maxMove, collapsed)) return;
              p.escaped = false; // TR-49: a tap on the item ends an Escape
              p.leftSinceEscape = false;
              const now = current.current;
              transferSelection.toggle({
                questionKey: now.bridge.questionKey,
                sourceId: now.item.sourceId,
              });
              now.bridge.prefetch();
            },
          ]
        );
      }
    }
    const stop = listen(list);
    return () => {
      stop();
      document.removeEventListener("keydown", escape);
      hideTip();
      if (el instanceof HTMLElement) {
        el.removeAttribute("data-transfer-item");
        el.removeAttribute("data-transfer-selected");
      }
    };
  }, [placement, inlineOrBlock]);

  // TR-57: while selected, a tap outside both the item and the control ends the selection. One
  // contact is tracked as on the item (largest movement, cancel ends it).
  useEffect(() => {
    const a = anchor.current;
    const el = a?.previousElementSibling;
    if (!selected || !inlineOrBlock || a === null || !(el instanceof HTMLElement)) return;
    let down: PointerSample | null = null;
    let maxMove = 0;
    const sample = (e: PointerEvent): PointerSample => ({
      pointerType: e.pointerType,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
    });
    const inside = (target: EventTarget | null) =>
      target instanceof Node && (el.contains(target) || a.contains(target));
    const capture: [string, (e: PointerEvent) => void][] = [
      [
        "pointerdown",
        (e) => {
          down = inside(e.target) ? null : sample(e);
          maxMove = 0;
        },
      ],
      [
        "pointermove",
        (e) => {
          if (down !== null)
            maxMove = Math.max(maxMove, Math.hypot(e.clientX - down.x, e.clientY - down.y));
        },
      ],
      ["pointercancel", () => (down = null)],
      [
        "pointerup",
        (e) => {
          const start = down;
          down = null;
          const collapsed = window.getSelection?.()?.isCollapsed ?? true;
          if (start !== null && !inside(e.target) && isTap(start, sample(e), maxMove, collapsed))
            transferSelection.clear();
        },
      ],
    ];
    for (const [type, fn] of capture) document.addEventListener(type, fn as EventListener, true);
    return () => {
      for (const [type, fn] of capture)
        document.removeEventListener(type, fn as EventListener, true);
    };
  }, [selected, inlineOrBlock]);

  // TR-46: place the button whenever it shows or its reveal size changes, and again while it
  // shows whenever the item resizes.
  useLayoutEffect(() => {
    const el = anchor.current?.previousElementSibling;
    if (!inlineOrBlock || !visible || !(el instanceof HTMLElement)) return;
    const place = pointer.current.place;
    place();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => place());
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, selected, inlineOrBlock]);

  // TR-51: the tooltip adjoins the button whenever it shows.
  useLayoutEffect(() => {
    const [a, b, t] = [anchor.current, button.current, tip.current];
    if (tooltip && a !== null && b !== null && t !== null) placeTooltip(a, b, t);
  }, [tooltip, visible, selected]);

  // The item shows the selected outline while tap-selected or while its control has focus.
  useEffect(() => {
    const el = anchor.current?.previousElementSibling;
    if (!inlineOrBlock || !(el instanceof HTMLElement)) return;
    if (selected || focused) el.setAttribute("data-transfer-selected", "true");
    else el.removeAttribute("data-transfer-selected");
  }, [selected, focused, inlineOrBlock]);

  const revealedByHoverPen = () => {
    const p = pointer.current;
    return p.hoverType === "pen" && (p.overItem || p.overControl);
  };

  async function activate(event: ReactMouseEvent) {
    event.stopPropagation();
    const p = pointer.current;
    const trigger = triggerFor(p.lastDown, revealedByHoverPen());
    // TR-68: the control has focus before the window opens, so the scope records it as the opener
    // on every engine (Safari never focuses a clicked button).
    p.focusing = true;
    button.current?.focus({ preventScroll: true });
    p.focusing = false;
    p.lastDown = null;
    transferSelection.clear();
    const { bridge: now, item: target } = current.current;
    const result = await now.transfer({ ...target.payload, questionKey: now.questionKey }, trigger);
    if (result.status === "rejected" && isCoreRejection(result))
      // TR-73. The id after the first ":" (question-key.ts's questionIdFromKey rule, written here
      // so the eager question-key module keeps only makeQuestionKey, AR-33)
      reportTransferRejection(
        now.questionKey.slice(now.questionKey.indexOf(":") + 1),
        target.ruleId
      );
  }

  return (
    <span
      ref={anchor}
      data-transfer-control=""
      data-source-id={item.sourceId}
      data-placement={placement}
      data-visible={inlineOrBlock ? String(visible) : undefined}
      data-reveal={inlineOrBlock ? (selected ? "coarse" : "fine") : undefined}
    >
      <button
        ref={button}
        type="button"
        aria-label={accessibleName}
        onPointerDown={(e) => {
          pointer.current.lastDown = { pointerType: e.pointerType };
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          pointer.current.lastDown = null;
          if (e.key === "Enter" || e.key === " ") e.stopPropagation();
        }}
        onFocus={() => {
          setFocused(true);
          bridge.prefetch();
          if (pointer.current.lastDown === null && !pointer.current.focusing) setTooltip(true);
        }}
        onBlur={() => {
          pointer.current.lastDown = null;
          setFocused(false);
          setTooltip(false);
        }}
        onClick={(e) => void activate(e)}
      >
        <span data-transfer-glyph="" aria-hidden="true">
          <Calculator size={16} />
          <ArrowUpRight size={16} />
        </span>
      </button>
      <span ref={tip} data-transfer-tooltip="" aria-hidden="true" hidden={!tooltip}>
        {TRANSFER_TOOLTIP}
      </span>
    </span>
  );
}
