// The layered HiDPI canvas renderer of the graph (G-5; 01-interfaces-runtime.md section 10). Four
// stacked canvases, bottom to top shading, grid, curves and points, each with a device-px backing
// store; the paper is the panel's CSS background, so unshaded pixels stay transparent.

import { CURVE_VARS, FILL_ALPHA_VARS, ROLE_VARS } from "../theme/roles";
import { CURVE_SLOTS, type CurveSlot } from "../theme/skins";
import { AXIS_FONT } from "./constants";
import { drawCurveLayer, drawPointLayer, drawShadingLayer } from "./draw-geometry";
import { drawGridLayer } from "./draw-grid";
import { planGrid } from "./grid-plan";
import { buildShadingRects, type ShadingRect, type ShadingRegion } from "./shading";
import type { RenderFrame, RenderTheme } from "./types";

/** Bottom to top; one canvas each. */
export const LAYER_ORDER = ["shading", "grid", "curves", "points"] as const;

type Ctx = CanvasRenderingContext2D;
const PAPER_HEX = /^#[0-9a-f]{6}$/i;

/** The last shading rectangles and what they were built from. */
type ShadingMemo = {
  regions: ShadingRegion[];
  paper: string;
  width: number;
  height: number;
  dpr: number;
  rects: ShadingRect[];
};

const sameRegions = (p: readonly ShadingRegion[], q: readonly ShadingRegion[]) =>
  p.length === q.length &&
  p.every(
    (r, i) => r.spans === q[i].spans && r.color === q[i].color && r.fillAlpha === q[i].fillAlpha
  );

export class GraphRenderer {
  private readonly canvases: HTMLCanvasElement[];
  private readonly contexts: (Ctx | null)[];
  private shading: ShadingMemo | null = null;
  private destroyed = false;

  /** Appends one hidden canvas per LAYER_ORDER entry to `container` (08's DOM contract). */
  constructor(container: HTMLElement) {
    this.canvases = LAYER_ORDER.map((layer) => {
      const canvas = container.ownerDocument.createElement("canvas");
      canvas.className = "kc-graph-canvas";
      canvas.dataset.layer = layer;
      canvas.setAttribute("aria-hidden", "true");
      container.append(canvas);
      return canvas;
    });
    this.contexts = this.canvases.map(() => null);
  }

  /**
   * Draws `frame`. Nothing happens for a size with a side ≤ 0, a paper that is not `#rrggbb`, or
   * while a 2D context is unavailable (jsdom); otherwise the backing stores follow round(size·dpr).
   */
  render(frame: RenderFrame): void {
    if (this.destroyed) return;
    const { view, theme } = frame;
    const { width, height } = view.size;
    if (!(width > 0 && height > 0) || !PAPER_HEX.test(theme.paper)) return;
    const w = Math.round(width * view.dpr);
    const h = Math.round(height * view.dpr);
    if (!(w > 0 && h > 0)) return;
    for (const canvas of this.canvases) {
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    }
    const contexts = this.layerContexts();
    if (contexts === null) return;
    const [shading, grid, curves, points] = contexts;
    drawShadingLayer(shading, this.shadingRects(frame));
    grid.font = AXIS_FONT;
    const plan = planGrid(view, frame.grid, (text) => grid.measureText(text).width);
    drawGridLayer(grid, plan, theme, view);
    drawCurveLayer(curves, view, frame.rows);
    drawPointLayer(points, view, frame.rows);
  }

  /** Empties and removes every canvas (iOS Safari frees canvas memory only at 0×0); idempotent. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.shading = null;
    for (const canvas of this.canvases) {
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
    }
    this.contexts.fill(null);
  }

  /** Each layer's 2D context, or null while any is unavailable; a null one is asked again later. */
  private layerContexts(): Ctx[] | null {
    this.canvases.forEach((canvas, i) => {
      this.contexts[i] ??= canvas.getContext("2d");
    });
    return this.contexts.every((ctx) => ctx !== null) ? (this.contexts as Ctx[]) : null;
  }

  /**
   * The region rows' shading rectangles on the theme's paper, rebuilt only when a region's spans,
   * colour or fill, the paper, the size or the dpr changed (point- and curve-only redraws reuse it).
   */
  private shadingRects({ view, theme, rows }: RenderFrame): ShadingRect[] {
    const regions: ShadingRegion[] = [];
    for (const { geometry: g, color, fillAlpha } of rows) {
      if (g.kind === "region") regions.push({ spans: g.spans, color, fillAlpha });
    }
    const { size, dpr } = view;
    const memo = this.shading;
    if (
      memo !== null &&
      memo.paper === theme.paper &&
      memo.width === size.width &&
      memo.height === size.height &&
      memo.dpr === dpr &&
      sameRegions(memo.regions, regions)
    ) {
      return memo.rects;
    }
    const rects = buildShadingRects(regions, theme.paper, size, dpr);
    this.shading = {
      regions,
      paper: theme.paper,
      width: size.width,
      height: size.height,
      dpr,
      rects,
    };
    return rects;
  }
}

/** The skin's graph roles from the host's computed custom properties (section 6 variables). */
export function readRenderTheme(host: Element): RenderTheme {
  const style = getComputedStyle(host);
  const read = (name: string) => style.getPropertyValue(name).trim();
  const perSlot = <T>(value: (slot: CurveSlot) => T) =>
    Object.fromEntries(CURVE_SLOTS.map((slot) => [slot, value(slot)])) as Record<CurveSlot, T>;
  return {
    paper: read(ROLE_VARS.paper),
    text: read(ROLE_VARS.text),
    axis: read(ROLE_VARS.axis),
    gridMajor: read(ROLE_VARS.gridMajor),
    gridMinor: read(ROLE_VARS.gridMinor),
    focusRing: read(ROLE_VARS.focusRing),
    curves: perSlot((slot) => read(CURVE_VARS[slot])),
    fillAlpha: perSlot((slot) => parseFloat(read(FILL_ALPHA_VARS[slot]))),
  };
}
