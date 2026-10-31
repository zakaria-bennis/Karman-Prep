"use client";

// ============================================================
// useMeasuredWidth: the content width of a figure's container, so a narrow
// screen lays the figure out at its own width and its text stays at least
// 12px (boxForWidth / fitBox in the figure engine). SpecFigure (FigureFrame)
// and ChartFigure share it.
//
// The width is null on the server and before the first measure, so the
// figure renders its default box there (SSR-safe). The ref is a callback ref:
// when the measured element changes (a table spec becomes a drawn one, so the
// <figure> mounts later), the observer moves to the new element.
// ============================================================

import { useLayoutEffect, useState } from "react";

/**
 * Width changes this small (px) are ignored, so a scrollbar appearing or
 * subpixel rounding never makes the figure redraw back and forth.
 */
export const WIDTH_HYSTERESIS_PX = 2;

/** The next width to lay out at: `measured`, unless it is within the hysteresis of `old`. */
export function nextWidth(old: number | null, measured: number): number {
  const w = Math.floor(measured);
  return old !== null && Math.abs(w - old) <= WIDTH_HYSTERESIS_PX ? old : w;
}

/** [ref for the measured element, its content width in px or null before it is measured]. */
export function useMeasuredWidth<T extends Element>(): [(el: T | null) => void, number | null] {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth((old) => nextWidth(old, entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, width];
}
