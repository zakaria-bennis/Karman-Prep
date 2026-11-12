/*
 * Paints the misty valley at dawn behind the "page isn't here" screen and lays slow bands of mist over
 * it. Fetched on demand by LostMist; never import this file from anything a route loads up front.
 */
import { hanken, youngSerif } from "@/components/portal/fonts";
import { prefersStill } from "@/lib/painting/motion";
import { paintPicture } from "@/lib/painting/painterly";
import { renderLandscape } from "@/lib/painting/scenes";

/** "River through the misty valley" in src/lib/painting/scenes.ts. */
const MISTY_VALLEY = 1;

/* A tiny seeded random, so the mist is the same on every visit. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** Soft, wide bands of mist, thickest through the middle of the picture. */
function mistBands(canvas: HTMLCanvasElement, w: number, h: number) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rnd = seeded(11);
  for (let i = 0; i < 30; i++) {
    const x = rnd() * w;
    const y = h * (0.22 + rnd() * 0.5);
    const rx = w * (0.16 + rnd() * 0.26);
    const ry = 24 + rnd() * 60;
    const band = ctx.createRadialGradient(x, y, 0, x, y, rx);
    band.addColorStop(0, "rgba(244,242,238,0.5)");
    band.addColorStop(1, "rgba(244,242,238,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = band;
    ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  }
}

/** Paints the screen and keeps it fitted to the window. Returns the clean-up. */
export function paintMist(
  root: HTMLElement,
  picture: HTMLCanvasElement,
  drift: HTMLCanvasElement
): () => void {
  root.classList.add(hanken.variable, youngSerif.variable);
  root.toggleAttribute("data-still", prefersStill());
  let handle: ReturnType<typeof paintPicture> | null = null;
  const paint = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    handle?.stop();
    handle = paintPicture(picture, renderLandscape(MISTY_VALLEY, "dawn"), {
      animate: false,
      width: w,
      height: h,
    });
    mistBands(drift, Math.round(w * 1.24), h);
    root.setAttribute("data-painted", "");
  };
  paint();
  let timer = 0;
  const onResize = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(paint, 200);
  };
  window.addEventListener("resize", onResize);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("resize", onResize);
    handle?.stop();
  };
}
