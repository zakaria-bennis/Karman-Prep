/*
 * Paints the shared Library ground scene (the bridge and lake, or the meadow and book) into an
 * intro's own canvas, exactly as the Library world paints it, so an intro can land on it and hand
 * over to the page without a visible change.
 */
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import type { TimeOfDay } from "@/lib/painting/light";
import { renderLibraryScene } from "@/lib/painting/library/scenes";
import { layoutFor, type Slug } from "@/lib/painting/library/seam";
import type { Subject } from "./registry";

export const SLUG: Record<Subject, Slug> = { math: "math", rw: "reading-writing" };

/** The day's painting hue, as the shell sets it. */
export function readTint() {
  const cs = getComputedStyle(document.documentElement);
  const hue = parseFloat(cs.getPropertyValue("--hue"));
  const sat = parseFloat(cs.getPropertyValue("--hs"));
  return { hue: Number.isFinite(hue) ? hue : 208, sat: Number.isFinite(sat) ? sat : 55 };
}

export function paintGround(
  canvas: HTMLCanvasElement,
  s: Subject,
  time: TimeOfDay,
  width: number,
  height: number
): PaintHandle {
  const pic = renderLibraryScene(
    SLUG[s],
    layoutFor(width, height),
    time,
    readTint(),
    height / width
  );
  return paintPicture(canvas, pic.src, { animate: false, width, height });
}
