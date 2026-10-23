"use client";

// Founder review, 2026-10-22: when a figure sits alone in the left column beside the
// question text, its bottom lines up with the last line of that text (laptop and wider).
// Only a figure shorter than the text moves down; a taller figure stays at the top, since
// lining it up would push the question below the fold. Phones stack the two, so nothing
// moves there.

import { useEffect, type RefObject } from "react";

const DESKTOP = "(min-width: 768px)";

/** Bottom of an element's last text line, in its scrolling column's coordinates. */
function lastLineBottom(el: HTMLElement): number {
  const style = getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight);
  const fontSize = parseFloat(style.fontSize);
  // The line box carries half-leading under the glyphs; the visible line ends above it.
  const halfLeading =
    Number.isFinite(lineHeight) && Number.isFinite(fontSize) ? (lineHeight - fontSize) / 2 : 0;
  return columnY(el, el.getBoundingClientRect().bottom) - Math.max(0, halfLeading);
}

/** A viewport y converted to the coordinates of the element's scrolling column, in CSS
 *  pixels. A screen drawn scaled down (the founder's review pane shows a 1280px laptop
 *  screen at a smaller size) measures in scaled pixels, so undo that scale; otherwise the
 *  margin is off by the scale factor and the figure misses the text's last line. */
function columnY(el: HTMLElement, viewportY: number): number {
  const column = el.closest<HTMLElement>("[data-question-layout] > *");
  if (!column) return viewportY;
  const box = column.getBoundingClientRect();
  return toColumnY(viewportY, box.top, box.height, column.offsetHeight, column.scrollTop);
}

/** Viewport y → column y in CSS pixels, given the column's drawn and layout heights. */
export function toColumnY(
  viewportY: number,
  columnTop: number,
  drawnHeight: number,
  layoutHeight: number,
  scrollTop: number
): number {
  const scale = layoutHeight > 0 && drawnHeight > 0 ? drawnHeight / layoutHeight : 1;
  return (viewportY - columnTop) / scale + scrollTop;
}

/** The margin that puts the figure's bottom on the text's last line (0 if it is taller). */
export function figureAlignOffset(figureBottom: number, textBottom: number): number {
  const offset = textBottom - figureBottom;
  return offset > 1 ? Math.round(offset) : 0;
}

export function useFigureStemAlign(
  figureRef: RefObject<HTMLElement | null>,
  textRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  /** Changes when a different question (so different elements) is shown. */
  questionKey: string
) {
  useEffect(() => {
    const figure = figureRef.current;
    const text = textRef.current;
    if (!enabled || !figure || !text || typeof ResizeObserver === "undefined") return;
    const media = window.matchMedia?.(DESKTOP);
    let frame = 0;
    const align = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        figure.style.marginTop = "";
        if (!media?.matches) return;
        // Every figure renderer draws inside a <figure>; its border box is the visible edge.
        const drawn = figure.querySelector("figure") ?? figure;
        const bottom = columnY(figure, drawn.getBoundingClientRect().bottom);
        const offset = figureAlignOffset(bottom, lastLineBottom(text));
        if (offset) figure.style.marginTop = `${offset}px`;
      });
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(text);
    for (const child of figure.children) observer.observe(child);
    media?.addEventListener("change", align);
    let live = true;
    document.fonts?.ready.then(() => live && align());
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      media?.removeEventListener("change", align);
      figure.style.marginTop = "";
    };
  }, [figureRef, textRef, enabled, questionKey]);
}
