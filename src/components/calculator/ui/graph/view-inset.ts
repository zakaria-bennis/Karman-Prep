// The phone keypad over the graph (owner decision, 2026-10-21): while the open keypad covers the
// bottom `inset` px of the graph, the view's centre sits in the middle of the part still visible
// above it, at the same scale, and the keypad closing moves it back. Home goes to the default view
// raised the same way, and Home shows whenever the view is off that raised default.

import { useEffect, useRef } from "react";
import {
  defaultViewport,
  isDefaultViewport,
  type PixelSize,
  type Viewport,
} from "@/lib/calculator/plot/viewport";
import { dragViewport } from "@/lib/calculator/render/view-input";

/** `v` moved so a point at its centre shows `px` CSS px higher on a graph of `size`. */
export function raiseView(v: Viewport, size: PixelSize, px: number): Viewport {
  return px === 0 ? v : dragViewport({ viewport: v, size, dpr: 1 }, 0, -px);
}

/** Home's view with `inset` px of the graph covered: the default view, centred above the cover. */
export function insetHome(size: PixelSize, inset: number): Viewport {
  return raiseView(defaultViewport(size), size, inset / 2);
}

/** Whether `v` is Home's view with `inset` px of the graph covered. */
export function isInsetHome(v: Viewport, size: PixelSize, inset: number): boolean {
  return isDefaultViewport(raiseView(v, size, -inset / 2), size);
}

/**
 * Calls `shift(px)` each time `inset` changes once the graph is sized: the view's centre should
 * move up by `px` (down when negative), half the change, so it stays mid-way in the visible part.
 */
export function useInsetShift(inset: number, sized: boolean, shift: (px: number) => void): void {
  const applied = useRef(0);
  const latest = useRef(shift);
  latest.current = shift;
  useEffect(() => {
    if (!sized || inset === applied.current) return;
    const px = (inset - applied.current) / 2;
    applied.current = inset;
    latest.current(px);
  }, [inset, sized]);
}
