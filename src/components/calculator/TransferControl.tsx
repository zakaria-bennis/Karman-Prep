"use client";

// Karman's icon-only Transfer to Calculator control (AR-12, TR-41 to TR-59). It renders only
// where useCalculator() returns a v2 bridge (TR-4, OI-21). A mouse or hovering pen reveals it by
// hover (TR-54), a touch or pen tap on its item selects the item (TR-55 to TR-58), and keyboard
// focus always shows it (TR-59). Eager: no v2 code; the item comes from the lazy classifier (D4).

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ArrowUpRight, Calculator } from "lucide-react";
import type { TransferItem } from "@/lib/calculator-transfer/classify";
import { useCalculator, type V2Bridge } from "./CalculatorScope";
import { questionIdFromKey } from "./question-key";
import { isCoreRejection, reportTransferRejection } from "./transfer-report";
import {
  isHoverPointer,
  isTap,
  transferSelection,
  triggerFor,
  type PointerSample,
} from "./transfer-selection";
import styles from "./TransferControl.module.css";
import "./transfer-control.css";

export const TRANSFER_TOOLTIP = "Transfer to Calculator";
export const TOOLTIP_DELAY_MS = 300; // TR-51

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
    timer: null as ReturnType<typeof setTimeout> | null,
    shown: false, // focused || selected, for the synchronous data-visible write
  });
  const inlineOrBlock = placement !== "cluster";
  const visible = focused || selected || hovered;
  pointer.current.shown = focused || selected;

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
    // Written synchronously, so a reveal never waits for a render (DOM contract).
    const sync = () => {
      const on = p.overItem || p.overControl;
      if (inlineOrBlock) a.dataset.visible = String(p.shown || on);
      setHovered(on);
    };
    const enter = (key: "overItem" | "overControl") => (e: PointerEvent) => {
      if (!isHoverPointer(e)) return;
      p[key] = true;
      p.hoverType = e.pointerType;
      sync();
    };
    const leave = (key: "overItem" | "overControl") => (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      p[key] = false;
      sync();
    };
    const hideTip = () => {
      if (p.timer !== null) clearTimeout(p.timer);
      p.timer = null;
      setTooltip(false);
    };
    const list: Listeners = [
      [a, "pointerenter", enter("overControl")],
      [a, "pointerleave", leave("overControl")],
      [
        b,
        "pointerenter",
        (e) => {
          if (!isHoverPointer(e)) return;
          current.current.bridge.prefetch();
          if (p.timer === null) p.timer = setTimeout(() => setTooltip(true), TOOLTIP_DELAY_MS);
        },
      ],
      [
        b,
        "pointerleave",
        (e) => {
          if (e.buttons !== 0) p.lastDown = null; // a press dragged off never becomes a click
          hideTip(); // the tooltip takes no pointer, so leaving the button leaves both
        },
      ],
      [b, "pointercancel", () => (p.lastDown = null)],
    ];
    if (el instanceof HTMLElement) {
      el.setAttribute("data-transfer-item", "");
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
      hideTip();
      if (el instanceof HTMLElement) {
        el.removeAttribute("data-transfer-item");
        el.removeAttribute("data-transfer-selected");
      }
    };
  }, [placement, inlineOrBlock]);

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
    p.lastDown = null;
    transferSelection.clear();
    const { bridge: now, item: target } = current.current;
    const result = await now.transfer({ ...target.payload, questionKey: now.questionKey }, trigger);
    if (result.status === "rejected" && isCoreRejection(result))
      reportTransferRejection(questionIdFromKey(now.questionKey), target.ruleId); // TR-73
  }

  return (
    <span
      ref={anchor}
      data-transfer-control=""
      data-source-id={item.sourceId}
      data-placement={placement}
      data-visible={inlineOrBlock ? String(visible) : undefined}
      data-reveal={inlineOrBlock ? (selected ? "coarse" : "fine") : undefined}
      className={styles.anchor}
    >
      <button
        ref={button}
        type="button"
        aria-label={accessibleName}
        className={styles.button}
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
          if (pointer.current.lastDown === null) setTooltip(true);
        }}
        onBlur={() => {
          pointer.current.lastDown = null;
          setFocused(false);
          setTooltip(false);
        }}
        onClick={(e) => void activate(e)}
      >
        <span data-transfer-glyph="" aria-hidden="true" className={styles.glyph}>
          <Calculator size={16} />
          <ArrowUpRight size={16} />
        </span>
      </button>
      <span
        data-transfer-tooltip=""
        aria-hidden="true"
        hidden={!tooltip}
        className={styles.tooltip}
      >
        {TRANSFER_TOOLTIP}
      </span>
    </span>
  );
}
