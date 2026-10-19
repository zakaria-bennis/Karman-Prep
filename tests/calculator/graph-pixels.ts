// Canvas pixel helpers for graph.spec.ts. Not a spec: Playwright and the ID checker
// skip it. Every helper but `px` runs in the page on the graph harness's canvases and scales CSS
// coordinates by `canvas.width / layersBox.width`; "composite" paints --kc-paper, then the layers
// in LAYER_ORDER, as the panel shows them.
import type { Page } from "@playwright/test";
import { worldToPx } from "@/lib/calculator/plot/viewport";
import { LAYER_ORDER } from "@/lib/calculator/render/renderer";
import { ROLE_VARS } from "@/lib/calculator/theme/vars";

export type PixelLayer = (typeof LAYER_ORDER)[number] | "composite";

/** The in-page reader that `install` puts on globalThis. */
type Reader = {
  /** The layer's (or the composite's) RGBA pixels and the device px per CSS px. */
  image(layer: string): { data: Uint8ClampedArray; width: number; height: number; scale: number };
};

/** Installs the in-page reader once per document. */
async function install(page: Page): Promise<void> {
  await page.evaluate(
    ({ order, paperVar }) => {
      const g = globalThis as { __graphPixels?: Reader };
      if (g.__graphPixels !== undefined) return;
      g.__graphPixels = {
        image(layer) {
          const shadow = document.getElementById("root")!.shadowRoot!;
          const layers = shadow.querySelector<HTMLElement>("[data-graph-layers]")!;
          const canvas = (name: string) =>
            shadow.querySelector<HTMLCanvasElement>(`canvas[data-layer="${name}"]`)!;
          const first = canvas(order[0]);
          const { width, height } = first;
          const scale = width / layers.getBoundingClientRect().width;
          if (layer !== "composite") {
            const ctx = canvas(layer).getContext("2d")!;
            return { data: ctx.getImageData(0, 0, width, height).data, width, height, scale };
          }
          const out = document.createElement("canvas");
          out.width = width;
          out.height = height;
          const ctx = out.getContext("2d")!;
          const panel = shadow.querySelector<HTMLElement>("[data-graph-panel]")!;
          ctx.fillStyle = getComputedStyle(panel).getPropertyValue(paperVar).trim();
          ctx.fillRect(0, 0, width, height);
          for (const name of order) ctx.drawImage(canvas(name), 0, 0);
          return { data: ctx.getImageData(0, 0, width, height).data, width, height, scale };
        },
      };
    },
    { order: [...LAYER_ORDER] as string[], paperVar: ROLE_VARS.paper }
  );
}

/** `"#rrggbb"` of the pixel at CSS (x, y), or `"transparent"` where its alpha is 0. */
export async function pixel(page: Page, layer: PixelLayer, x: number, y: number): Promise<string> {
  await install(page);
  return page.evaluate(
    ({ layer, x, y }) => {
      const reader = (globalThis as { __graphPixels?: Reader }).__graphPixels!;
      const { data, width, scale } = reader.image(layer);
      const i = (Math.floor(y * scale) * width + Math.floor(x * scale)) * 4;
      if (data[i + 3] === 0) return "transparent";
      const hex = (v: number) => v.toString(16).padStart(2, "0");
      return `#${hex(data[i])}${hex(data[i + 1])}${hex(data[i + 2])}`;
    },
    { layer, x, y }
  );
}

/**
 * One boolean per CSS column: true when some composite pixel within ±1 CSS px of `yCss` is within
 * RGB distance `tol` of `hex`.
 */
export async function inkRow(
  page: Page,
  yCss: number,
  hex: string,
  tol: number
): Promise<boolean[]> {
  await install(page);
  return page.evaluate(
    ({ yCss, hex, tol }) => {
      const reader = (globalThis as { __graphPixels?: Reader }).__graphPixels!;
      const { data, width, height, scale } = reader.image("composite");
      const target = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
      const y0 = Math.max(0, Math.floor((yCss - 1) * scale));
      const y1 = Math.min(height - 1, Math.ceil((yCss + 1) * scale));
      const columns = Math.round(width / scale);
      const row: boolean[] = [];
      for (let c = 0; c < columns; c++) {
        const x0 = Math.floor(c * scale);
        const x1 = Math.min(width, Math.floor((c + 1) * scale));
        let hit = false;
        for (let y = y0; y <= y1 && !hit; y++) {
          for (let x = x0; x < x1 && !hit; x++) {
            const i = (y * width + x) * 4;
            const d = Math.hypot(
              data[i] - target[0],
              data[i + 1] - target[1],
              data[i + 2] - target[2]
            );
            hit = d <= tol;
          }
        }
        row.push(hit);
      }
      return row;
    },
    { yCss, hex, tol }
  );
}

/**
 * The centroid, in CSS px, of the composite pixels within `radius` CSS px of `(x, y)` that are
 * within RGB distance `tol` of `hex`; null when none match.
 */
export async function inkCentroid(
  page: Page,
  [x, y]: readonly [number, number],
  radius: number,
  hex: string,
  tol: number
): Promise<[number, number] | null> {
  await install(page);
  return page.evaluate(
    ({ x, y, radius, hex, tol }) => {
      const reader = (globalThis as { __graphPixels?: Reader }).__graphPixels!;
      const { data, width, height, scale } = reader.image("composite");
      const target = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
      let sx = 0;
      let sy = 0;
      let n = 0;
      const lo = (v: number) => Math.max(0, Math.floor((v - radius) * scale));
      for (let py = lo(y); py <= Math.min(height - 1, Math.ceil((y + radius) * scale)); py++) {
        for (let pxl = lo(x); pxl <= Math.min(width - 1, Math.ceil((x + radius) * scale)); pxl++) {
          const cx = (pxl + 0.5) / scale;
          const cy = (py + 0.5) / scale;
          if (Math.hypot(cx - x, cy - y) > radius) continue;
          const i = (py * width + pxl) * 4;
          const d = Math.hypot(
            data[i] - target[0],
            data[i + 1] - target[1],
            data[i + 2] - target[2]
          );
          if (d > tol) continue;
          sx += cx;
          sy += cy;
          n++;
        }
      }
      return n === 0 ? null : ([sx / n, sy / n] as [number, number]);
    },
    { x, y, radius, hex, tol }
  );
}

/** The layer's unique opaque colours (sorted) and how many pixels have `0 < alpha < 255`. */
export async function layerColors(
  page: Page,
  layer: (typeof LAYER_ORDER)[number]
): Promise<{ opaque: string[]; partial: number }> {
  await install(page);
  return page.evaluate((layer) => {
    const reader = (globalThis as { __graphPixels?: Reader }).__graphPixels!;
    const { data } = reader.image(layer);
    const hex = (v: number) => v.toString(16).padStart(2, "0");
    const opaque = new Set<string>();
    let partial = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 255) opaque.add(`#${hex(data[i])}${hex(data[i + 1])}${hex(data[i + 2])}`);
      else if (a > 0) partial++;
    }
    return { opaque: [...opaque].sort(), partial };
  }, layer);
}

/** The default view, x -10 to 10 and y -7.5 to 7.5 (graph.spec.ts's sizes are all 4:3). */
const DEFAULT = { left: -10, right: 10, bottom: -7.5, top: 7.5 };

/** `worldToPx` for `DEFAULT` at `w`×`h` CSS px. */
export const px = (x: number, y: number, w: number, h: number): [number, number] =>
  worldToPx({ viewport: DEFAULT, size: { width: w, height: h }, dpr: 1 }, x, y);
