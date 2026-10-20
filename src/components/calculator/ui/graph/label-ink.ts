// The ink under a label spot (GP-38), as Desmos measures it: the graph's transparent layer canvases
// (grid, curves, points and dots) and the graph controls as solid blocks, drawn at half size, and
// the alpha summed over the spot through an integral image, divided by 200 per full-size px.

import type { Box, InkSampler } from "./label-placement";

const SCALE = 0.5;

/**
 * An InkSampler over `canvases` (each covering the whole graph) plus `blocks` (graph px), or null
 * when no 2D context is available (jsdom).
 */
export function readInk(
  canvases: readonly HTMLCanvasElement[],
  blocks: readonly Box[],
  graph: { width: number; height: number }
): InkSampler | null {
  const w = Math.round(graph.width * SCALE),
    h = Math.round(graph.height * SCALE);
  if (!(w > 0 && h > 0) || canvases.length === 0) return null;
  const mask = canvases[0].ownerDocument.createElement("canvas");
  mask.width = w;
  mask.height = h;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = mask.getContext("2d", { willReadFrequently: true });
  } catch {
    return null;
  }
  if (ctx === null) return null;
  for (const c of canvases) if (c.width > 0 && c.height > 0) ctx.drawImage(c, 0, 0, w, h);
  // Only alpha is read, so the blocks keep the context's default (opaque) fill.
  for (const b of blocks)
    ctx.fillRect(
      b.left * SCALE,
      b.top * SCALE,
      (b.right - b.left) * SCALE,
      (b.bottom - b.top) * SCALE
    );
  const data = ctx.getImageData(0, 0, w, h).data;
  // sums[(y + 1)(w + 1) + x + 1] = alpha summed over [0, x] × [0, y]
  const sums = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += data[(y * w + x) * 4 + 3];
      sums[(y + 1) * (w + 1) + x + 1] = sums[y * (w + 1) + x + 1] + row;
    }
  }
  const clamp = (v: number, hi: number) => Math.min(hi, Math.max(0, v));
  return (box: Box): number => {
    const l = clamp(Math.floor(box.left * SCALE), w),
      r = clamp(Math.ceil(box.right * SCALE), w),
      t = clamp(Math.floor(box.top * SCALE), h),
      b = clamp(Math.ceil(box.bottom * SCALE), h);
    if (l >= r || t >= b) return 0;
    const at = (x: number, y: number) => sums[y * (w + 1) + x];
    const sum = at(r, b) - at(l, b) - at(r, t) + at(l, t);
    return sum / 200 / (SCALE * SCALE);
  };
}
