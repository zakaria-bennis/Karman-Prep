"use client";
// A question's figure draws itself in the first time it is shown (founder, 2026-11-23: "make sure
// that is still actively drawn in, not loaded in"). The grid fades up, each line is traced from end
// to end, the points and bars grow in, then the words appear; a table comes in row by row. It runs
// on whatever the figure engine puts on the page (the engine loads lazily, so the drawing is
// watched for), uses the browser's own animations (no library in the quiz bundle), and leaves
// nothing behind: once played, every part is exactly as drawn. With reduced motion, or a second
// look at the same question, the figure is simply there.
import { useEffect, useLayoutEffect, type RefObject } from "react";

// before the browser paints: a figure already on the page when the effect runs must not show undrawn
// for a frame first
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Figures already drawn in on this visit: going back to a question does not replay it. */
const drawn = new Set<string>();

const SHAPES = "path, line, polyline, polygon, circle, ellipse, rect";
const EASE = "cubic-bezier(0.25, 0.8, 0.3, 1)";

/** Spread `count` starts over at most `span` ms, never more than `most` ms apart. */
const gap = (count: number, span: number, most: number) =>
  count > 1 ? Math.min(most, span / (count - 1)) : 0;

function visible(el: Element) {
  if (el.closest("defs, marker, title")) return false;
  const style = getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function painted(value: string) {
  return value !== "none" && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)|transparent/.test(value);
}

function drawSvg(svg: SVGSVGElement) {
  const grid: Element[] = [];
  const lines: { el: SVGGeometryElement; length: number }[] = [];
  const shapes: SVGGraphicsElement[] = [];
  for (const el of svg.querySelectorAll<SVGGraphicsElement>(SHAPES)) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);
    const filled = painted(style.fill);
    const stroked = painted(style.stroke);
    if (!filled && !stroked) continue;
    if (/grid/.test(el.getAttribute("stroke") ?? "")) grid.push(el);
    else if (!filled && style.strokeDasharray === "none" && el instanceof SVGGeometryElement) {
      const length = el.getTotalLength();
      if (length > 1) lines.push({ el, length });
      else shapes.push(el);
    } else shapes.push(el);
  }
  const words = [...svg.querySelectorAll("text")].filter(visible);

  for (const el of grid)
    el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 320,
      easing: "ease-out",
      fill: "backwards",
    });

  const lineGap = gap(lines.length, 420, 90);
  lines.forEach(({ el, length }, i) =>
    el.animate(
      [
        { strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
        { strokeDasharray: `${length}`, strokeDashoffset: "0" },
      ],
      { duration: 650, delay: 120 + i * lineGap, easing: EASE, fill: "backwards" }
    )
  );

  const afterLines = 120 + (lines.length ? 360 : 0);
  const shapeGap = gap(shapes.length, 420, 40);
  shapes.forEach((el, i) => {
    // a bar grows up from its base; a point or a shaded region swells from its middle
    const bar = el.tagName === "rect";
    // a part placed with its own transform only fades: a CSS transform would replace it
    const grow = !el.hasAttribute("transform");
    if (grow) {
      el.style.transformBox = "fill-box";
      el.style.transformOrigin = bar ? "50% 100%" : "50% 50%";
    }
    const from = grow
      ? { opacity: 0, transform: bar ? "scaleY(0)" : "scale(0.5)" }
      : { opacity: 0 };
    const to = grow ? { opacity: 1, transform: "none" } : { opacity: 1 };
    el.animate([from, to], {
      duration: 380,
      delay: afterLines + i * shapeGap,
      easing: "cubic-bezier(0.34, 1.4, 0.64, 1)",
      fill: "backwards",
    });
  });

  const afterShapes = afterLines + (shapes.length ? 260 : 0);
  const wordGap = gap(words.length, 300, 25);
  words.forEach((el, i) =>
    el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 300,
      delay: afterShapes + i * wordGap,
      easing: "ease-out",
      fill: "backwards",
    })
  );
}

function drawTable(table: HTMLTableElement) {
  const rows = [...table.querySelectorAll("tr")];
  const rowGap = gap(rows.length, 480, 70);
  rows.forEach((row, i) =>
    row.animate(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: 320,
        delay: i * rowGap,
        easing: EASE,
        fill: "backwards",
      }
    )
  );
}

/** Draws in the figure (or figures) under `ref` the first time `key` is shown. */
export function useFigureDraw(ref: RefObject<HTMLElement | null>, key: string, still: boolean) {
  useBeforePaint(() => {
    const root = ref.current;
    if (!root || still || drawn.has(key)) return;
    if (typeof Element.prototype.animate !== "function") return;
    let done = false;
    const tryDraw = () => {
      if (done) return;
      // the engine's drawings, and the older stored ones; never a button's icon
      const figures = [...root.querySelectorAll<SVGSVGElement>("svg")].filter(
        (svg) =>
          (svg.matches("[data-figure-view]") ||
            (!!svg.closest(".themed-question-figure") && !svg.closest("button"))) &&
          !!svg.querySelector(SHAPES)
      );
      const tables = [...root.querySelectorAll("table")];
      if (!figures.length && !tables.length) return;
      done = true;
      drawn.add(key);
      observer.disconnect();
      figures.forEach(drawSvg);
      tables.forEach(drawTable);
    };
    // the engine and stored drawings arrive after the first render; the drawing starts with them,
    // before the browser paints them, so nothing shows undrawn first
    const observer = new MutationObserver(tryDraw);
    observer.observe(root, { childList: true, subtree: true });
    tryDraw();
    const giveUp = window.setTimeout(() => observer.disconnect(), 8000);
    return () => {
      observer.disconnect();
      window.clearTimeout(giveUp);
    };
  }, [ref, key, still]);
}
