// The phone keypad and the graph (owner decision, 2026-10-21). On a phone (a touch calculator
// under 450 by 495 px, the compact touch layout) the open keypad must not hide the graph:
// - the graph's view is centred above the part of the graph the open keypad covers (keypadInset,
//   measured from the full keypad and held while it stays open; GraphPanel moves the view);
// - a touch on the graph while the keypad is open shrinks it to a thin Show keypad bar and goes on
//   to pan, trace or open a label; the bar, a focused row or the keypad closing brings it back;
// - upright (the stacked layout), the list keeps the height it has above the full keypad, so the
//   graph grows into the space the bar frees and shrinks back with the keys (phoneKeypadState and
//   base.css; the tray's height change is the animation, and the view keeps its centre and scale).
// Desktop and tablet layouts keep the reference behaviour (a graph touch puts the keypad away).

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";

export interface PhoneKeypadOptions {
  phone: boolean;
  keypadOpen: boolean;
  engine: CalculatorEngine;
  graph: RefObject<HTMLElement | null>;
  keypad: RefObject<HTMLElement | null>;
  /** Re-measure when the container changes size. */
  sizeKey: string;
}

export interface PhoneKeypad {
  minimized: boolean;
  keypadInset: number;
  /** A pointer went down on the graph. */
  onGraphPointerDown(event: { pointerType: string }): void;
  restore(): void;
}

/**
 * The calculator root's data-phone-keypad: set only upright on a phone with the keypad open,
 * "open" with the keys and "bar" while the keypad is a thin bar. Undefined elsewhere (the side by
 * side layout of a phone on its side keeps its keypadInset behaviour).
 */
export function phoneKeypadState(o: {
  phone: boolean;
  layout: "desktop" | "stacked";
  keypadOpen: boolean;
  minimized: boolean;
}): "open" | "bar" | undefined {
  if (!o.phone || o.layout !== "stacked" || !o.keypadOpen) return undefined;
  return o.minimized ? "bar" : "open";
}

/** CSS px of `graph`'s height that `cover` overlaps. */
export function overlapPx(graph: DOMRect, cover: DOMRect): number {
  const px = Math.min(graph.bottom, cover.bottom) - Math.max(graph.top, cover.top);
  return px > 0 && cover.width > 0 ? Math.min(px, graph.height) : 0;
}

export function usePhoneKeypad(o: PhoneKeypadOptions): PhoneKeypad {
  const { phone, keypadOpen, engine, graph, keypad, sizeKey } = o;
  const [minimized, setMinimized] = useState(false);
  const [keypadInset, setInset] = useState(0);
  const active = phone && keypadOpen;

  if (!active && minimized) setMinimized(false);

  useLayoutEffect(() => {
    if (!active) {
      setInset(0);
      return;
    }
    if (minimized) return; // measured from the full keypad; the bar keeps it
    const g = graph.current?.getBoundingClientRect();
    const k = keypad.current?.getBoundingClientRect();
    setInset(g === undefined || k === undefined ? 0 : Math.round(overlapPx(g, k)));
  }, [active, minimized, graph, keypad, sizeKey]);

  // Focusing a row while the keypad is a bar brings the keys back.
  useEffect(() => {
    if (!minimized) return;
    let last = engine.getSnapshot().focusedRowId;
    return engine.subscribe(() => {
      const next = engine.getSnapshot().focusedRowId;
      if (next !== last && next !== null) setMinimized(false);
      last = next;
    });
  }, [engine, minimized]);

  return {
    minimized: active && minimized,
    keypadInset,
    onGraphPointerDown(event) {
      if (active && event.pointerType === "touch") setMinimized(true);
    },
    restore: () => setMinimized(false),
  };
}
