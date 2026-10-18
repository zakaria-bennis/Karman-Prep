"use client";

// The format chooser of a coordinate pair or function coordinate (c-transfer TR-60 to TR-63, table
// 10.1): a role="menu" of "Point", "Table row" and, for a function coordinate, "Evaluate f(a)",
// shown disabled with its TR-62 reason until TR-31 ships. Lazy with the Transfer control (D4): only
// TransferControl.tsx renders it. Portalled to the body and fixed to the viewport so no quiz
// container clips or transforms it; anchored to the control by placeChooser (TR-63).

import { useEffect, useId, useLayoutEffect, useRef, type JSX, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { TransferChooser as ChooserOptions } from "@/lib/calculator-transfer/classify";
import type { TransferTrigger } from "@/lib/calculator-transfer/payload";

export type ChooserFormat = "point" | "tableRow" | "evaluate";

export const CHOOSER_MARGIN_PX = 16; // TR-63: inside the viewport by 16 px
export const CHOOSER_GAP_PX = 4;
export const CHOOSER_ITEM_PX = { fine: 32, coarse: 44 } as const; // TR-63

// TR-61, TR-70: the format last used per question key (a new question, or a retake, has none).
const lastFormats = new Map<string, ChooserFormat>();
export const resetLastFormats = (): void => lastFormats.clear();

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * TR-63: above the item and the control when the menu fits there, else below both (the side with
 * more room when neither fits), never over the control; right-aligned with the control and kept
 * 16 px inside the viewport.
 */
export function placeChooser(
  item: Rect,
  control: Rect,
  menu: { width: number; height: number },
  viewport: { width: number; height: number }
): { left: number; top: number } {
  const m = CHOOSER_MARGIN_PX;
  const above = Math.min(item.top, control.top) - CHOOSER_GAP_PX - menu.height;
  const below = Math.max(item.bottom, control.bottom) + CHOOSER_GAP_PX;
  const fitsAbove = above >= m;
  const fitsBelow = below + menu.height <= viewport.height - m;
  const top =
    fitsAbove || (!fitsBelow && above + menu.height - m > viewport.height - m - below)
      ? Math.max(m, above)
      : Math.min(below, Math.max(m, viewport.height - m - menu.height));
  const left = Math.min(
    Math.max(m, control.right - menu.width),
    Math.max(m, viewport.width - m - menu.width)
  );
  return { left, top };
}

export interface TransferChooserProps {
  id: string;
  options: ChooserOptions;
  questionKey: string;
  coarse: boolean; // TR-63: 44 px items for coarse reveal, 32 px for fine
  control: HTMLElement; // the menu button
  item: HTMLElement | null; // the item the control belongs to (null for a cluster)
  onChoose(format: "point" | "tableRow", trigger: TransferTrigger): void;
  onClose(returnFocus: boolean): void;
}

export function TransferChooser(props: TransferChooserProps): JSX.Element {
  const { options, questionKey, coarse, control, item, onChoose, onClose } = props;
  const menu = useRef<HTMLDivElement>(null);
  const lastDown = useRef<string | null>(null);
  const reasonId = useId();
  const entries: { format: ChooserFormat; label: string; disabled: boolean }[] = [
    { format: "point", label: "Point", disabled: false },
    { format: "tableRow", label: "Table row", disabled: false },
    ...(options.evaluate
      ? [{ format: "evaluate" as const, label: options.evaluate.label, disabled: true }]
      : []),
  ];
  const elements = () => [
    ...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []),
  ];
  const focusAt = (k: number) => {
    const list = elements();
    list[(k + list.length) % list.length]?.focus({ preventScroll: true });
  };

  // TR-61: the last format used in this question, else Point; TR-63: the position, kept while
  // the page scrolls or resizes.
  useLayoutEffect(() => {
    const m = menu.current;
    if (m === null) return;
    const place = () => {
      const r = m.getBoundingClientRect();
      const { left, top } = placeChooser(
        (item ?? control).getBoundingClientRect(),
        control.getBoundingClientRect(),
        { width: r.width, height: r.height },
        { width: window.innerWidth, height: window.innerHeight }
      );
      m.style.left = `${left}px`;
      m.style.top = `${top}px`;
    };
    place();
    const last = lastFormats.get(questionKey);
    focusAt(
      Math.max(
        0,
        entries.findIndex((e) => e.format === last)
      )
    );
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
    // Opening places and focuses once; the listeners keep the place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Table 10.1: a click or tap outside the menu and the control closes it.
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      const target = e.target;
      if (target instanceof Node && (menu.current?.contains(target) || control.contains(target)))
        return;
      onClose(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [control, onClose]);

  const choose = (k: number, trigger: TransferTrigger) => {
    const entry = entries[k];
    if (entry === undefined || entry.disabled || entry.format === "evaluate") return; // TR-62
    lastFormats.set(questionKey, entry.format);
    onChoose(entry.format, trigger);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = elements();
    const at = list.findIndex((el) => el === document.activeElement);
    const handled = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      handled();
      focusAt(at + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Home" || e.key === "End") {
      handled();
      focusAt(e.key === "Home" ? 0 : list.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      handled();
      choose(at, "keyboard");
    } else if (e.key === "Escape") {
      handled();
      onClose(true);
    } else if (e.key === "Tab") {
      e.stopPropagation(); // focus returns to the control and Tab moves on from there
      onClose(true);
    } else if (/^\p{L}$/u.test(e.key)) {
      const k = entries.findIndex((entry) =>
        entry.label.toLowerCase().startsWith(e.key.toLowerCase())
      );
      if (k >= 0) {
        handled();
        focusAt(k);
      }
    }
  };

  return createPortal(
    <div
      ref={menu}
      id={props.id}
      role="menu"
      aria-label="Transfer as"
      data-transfer-chooser=""
      data-reveal={coarse ? "coarse" : "fine"}
      onKeyDown={onKeyDown}
    >
      {entries.map((entry, k) => (
        <button
          key={entry.format}
          type="button"
          role="menuitem"
          tabIndex={-1}
          data-format={entry.format}
          aria-disabled={entry.disabled ? "true" : undefined}
          aria-label={entry.format === "evaluate" ? entry.label : undefined}
          aria-describedby={entry.format === "evaluate" ? reasonId : undefined}
          onPointerDown={(e) => {
            lastDown.current = e.pointerType;
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            const type = lastDown.current;
            lastDown.current = null;
            choose(k, type === "touch" || type === "pen" ? "touch" : type ? "mouse" : "keyboard");
          }}
        >
          {entry.label}
          {entry.format === "evaluate" && options.evaluate && (
            <span id={reasonId} data-transfer-reason="">
              {options.evaluate.reason}
            </span>
          )}
        </button>
      ))}
    </div>,
    document.body
  );
}
