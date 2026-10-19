// Point-of-interest dots (POI-1, POI-13): small grey discs for the selected row's points and a
// larger disc in the text colour for each point whose label is open. Drawn on the points layer
// after the row points, which drawPointLayer has already cleared and scaled.

import { worldToPx, type ViewSpec } from "../plot/viewport";
import { POI_DOT_TEXT_SHARE, POI_OPEN_RADIUS_PX, POI_RADIUS_PX } from "./constants";
import type { PoiDot, RenderTheme } from "./types";

type Ctx = CanvasRenderingContext2D;

const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** POI-1: POI_DOT_TEXT_SHARE of the text colour over the paper, as #rrggbb. */
export function poiDotColor(theme: Pick<RenderTheme, "paper" | "text">): string {
  const p = channels(theme.paper),
    t = channels(theme.text);
  return `#${p
    .map((c, i) => Math.round(c + (t[i] - c) * POI_DOT_TEXT_SHARE))
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** The dots inside the view: every closed dot in one grey path, then every open dot. */
export function drawPoiDots(
  ctx: Ctx,
  view: ViewSpec,
  theme: Pick<RenderTheme, "paper" | "text">,
  dots: readonly PoiDot[]
): void {
  const { width, height } = view.size;
  for (const open of [false, true]) {
    const radius = open ? POI_OPEN_RADIUS_PX : POI_RADIUS_PX;
    let started = false;
    for (const dot of dots) {
      if (dot.open !== open) continue;
      const [x, y] = worldToPx(view, dot.x, dot.y);
      if (!(x >= -radius && x <= width + radius && y >= -radius && y <= height + radius)) continue;
      if (!started) {
        started = true;
        ctx.fillStyle = open ? theme.text : poiDotColor(theme);
        ctx.beginPath();
      }
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
    }
    if (started) ctx.fill();
  }
}

/** POI-14: the trace dot, in the traced curve's colour with a paper ring so it reads over the curve. */
export function drawTraceDot(
  ctx: Ctx,
  view: ViewSpec,
  theme: Pick<RenderTheme, "paper">,
  dot: { x: number; y: number; color: string }
): void {
  const [x, y] = worldToPx(view, dot.x, dot.y);
  ctx.beginPath();
  ctx.arc(x, y, POI_OPEN_RADIUS_PX + 1.5, 0, 2 * Math.PI);
  ctx.fillStyle = theme.paper;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, POI_OPEN_RADIUS_PX, 0, 2 * Math.PI);
  ctx.fillStyle = dot.color;
  ctx.fill();
}
