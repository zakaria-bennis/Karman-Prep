// Point-of-interest dots (POI-1, POI-13): small translucent grey discs for the selected row's points and a
// larger disc in the text colour for each point whose label is open. Drawn on the points layer
// after the row points, which drawPointLayer has already cleared and scaled.

import { worldToPx, type ViewSpec } from "../plot/viewport";
import {
  POI_DOT_ALPHA,
  POI_DOT_TEXT_SHARE,
  POI_OPEN_RADIUS_PX,
  POI_RADIUS_PX,
  TRACE_RADIUS_PX,
} from "./constants";
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
  theme: Pick<RenderTheme, "paper" | "text" | "poiInk">,
  dots: readonly PoiDot[]
): void {
  const { width, height } = view.size;
  if (theme.poiInk === true) {
    // On glass: each closed point is a disc of pure ink inside a rim of the paper's colour, so it
    // reads on any curve; an open one is a ring of ink.
    for (const dot of dots) {
      const [x, y] = worldToPx(view, dot.x, dot.y);
      if (!(x >= -8 && x <= width + 8 && y >= -8 && y <= height + 8)) continue;
      ctx.beginPath();
      ctx.arc(x, y, POI_RADIUS_PX + 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = theme.paper;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, dot.open ? POI_RADIUS_PX - 1 : POI_RADIUS_PX - 0.5, 0, 2 * Math.PI);
      if (dot.open) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = theme.text;
        ctx.stroke();
      } else {
        ctx.fillStyle = theme.text;
        ctx.fill();
      }
    }
    return;
  }
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
        ctx.globalAlpha = open ? 1 : POI_DOT_ALPHA;
        ctx.beginPath();
      }
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
    }
    if (started) ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** POI-14, GP-36: the trace dot, a TRACE_RADIUS_PX disc in the traced curve's colour. */
export function drawTraceDot(
  ctx: Ctx,
  view: ViewSpec,
  dot: { x: number; y: number; color: string },
  theme?: Pick<RenderTheme, "text" | "poiInk">
): void {
  const [x, y] = worldToPx(view, dot.x, dot.y);
  if (theme?.poiInk === true) {
    // On glass: the curve's colour inside a rim of ink, a little larger, so it is easy to follow.
    ctx.beginPath();
    ctx.arc(x, y, TRACE_RADIUS_PX + 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = theme.text;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, TRACE_RADIUS_PX, 0, 2 * Math.PI);
    ctx.fillStyle = dot.color;
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.arc(x, y, TRACE_RADIUS_PX, 0, 2 * Math.PI);
  ctx.fillStyle = dot.color;
  ctx.fill();
}
