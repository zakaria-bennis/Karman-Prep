/*
 * Shared painting helpers for intros 4, 5 and 6 (pop-up book, ink in water, train windows).
 * Every intro ends on the chosen subject's ground scene, painted exactly as the Library paints
 * it (renderLibraryScene + paintPicture), so the hand-over to the open box shows no jump.
 */
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { ctx2d, makeCanvas } from "@/lib/painting/noise";
import { renderLibraryScene } from "@/lib/painting/library/scenes";
import { layoutFor, type Layout, type Slug } from "@/lib/painting/library/seam";
import type { TimeOfDay } from "@/lib/painting/light";
import type { Subject } from "../registry";

export const SLUG: Record<Subject, Slug> = { math: "math", rw: "reading-writing" };
export const NAME: Record<Subject, string> = { math: "Math", rw: "Reading and Writing" };
export const SUBJECTS: Subject[] = ["math", "rw"];

export interface Tint {
  hue: number;
  sat: number;
}

/** The day's painting hue, as the shell sets it. */
export function readTint(): Tint {
  const cs = getComputedStyle(document.documentElement);
  const hue = parseFloat(cs.getPropertyValue("--hue"));
  const sat = parseFloat(cs.getPropertyValue("--hs"));
  return { hue: Number.isFinite(hue) ? hue : 208, sat: Number.isFinite(sat) ? sat : 55 };
}

/** The part of the screen clear of the rail (desktop) or the brand and tab bar (phone). */
export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function contentArea(w: number, h: number): Area {
  if (w >= 768) {
    const x = 100;
    const y = 72;
    return { x, y, w: w - x - 24, h: h - y - 28 };
  }
  const y = 76;
  return { x: 16, y, w: w - 32, h: h - y - 96 };
}

export function layoutOf(w: number, h: number): Layout {
  return layoutFor(w, h);
}

/** Paints a picture into a canvas as finished brushwork (no opening animation). */
export function paintStill(
  canvas: HTMLCanvasElement,
  src: HTMLCanvasElement,
  w: number,
  h: number,
  done?: () => void,
  brush?: number
): PaintHandle {
  return paintPicture(canvas, src, { animate: false, width: w, height: h, done, brush });
}

/** Paints the subject's ground scene into a full-screen canvas, as the Library does. */
export function paintGround(
  canvas: HTMLCanvasElement,
  s: Subject,
  w: number,
  h: number,
  time: TimeOfDay,
  tint: Tint,
  done?: () => void
): PaintHandle {
  const pic = renderLibraryScene(SLUG[s], layoutFor(w, h), time, tint, h / w);
  return paintStill(canvas, pic.src, w, h, done);
}

/** A soft, blurred copy of a canvas (downscaled and scaled back up, which every browser does). */
export function blurredCopy(src: HTMLCanvasElement, amount = 14): HTMLCanvasElement {
  const small = makeCanvas(
    Math.max(2, Math.round(src.width / amount)),
    Math.max(2, Math.round(src.height / amount))
  );
  const sg = ctx2d(small);
  sg.imageSmoothingQuality = "high";
  sg.drawImage(src, 0, 0, small.width, small.height);
  const out = makeCanvas(src.width, src.height);
  const og = ctx2d(out);
  og.imageSmoothingQuality = "high";
  og.drawImage(small, 0, 0, out.width, out.height);
  return out;
}

/** Copies one canvas into another of the same backing size. */
export function copyCanvas(to: HTMLCanvasElement, from: HTMLCanvasElement) {
  to.width = from.width;
  to.height = from.height;
  ctx2d(to).drawImage(from, 0, 0);
}

/** Device pixel ratio for hand-drawn canvases, capped so big screens stay quick. */
export const dprOf = () => Math.min(window.devicePixelRatio || 1, 2);

/** Sizes a canvas for CSS pixels w x h and returns its context scaled to CSS pixels. */
export function sized(c: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const d = dprOf();
  c.width = Math.max(1, Math.round(w * d));
  c.height = Math.max(1, Math.round(h * d));
  const g = ctx2d(c);
  g.setTransform(d, 0, 0, d, 0, 0);
  return g;
}

export const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
