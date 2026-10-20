// Graph view input math (G-5, KB-8): keys, drag, pinch, wheel and resizes turned into viewports.
// Pure functions over the viewport arithmetic; GraphPanel applies the results through the engine.

import { INITIAL_GRAPH_SIZE } from "../core/api/document";
import {
  defaultViewport,
  isDefaultViewport,
  KEY_PAN_FRACTION,
  panViewport,
  pxToWorld,
  resizeViewport,
  ZOOM_KEY_FACTOR,
  zoomViewport,
  type PixelSize,
  type Viewport,
  type ViewSpec,
} from "../plot/viewport";
import { WHEEL_ZOOM_FACTOR } from "./constants";

export type GraphKeyField = "key" | "ctrlKey" | "metaKey" | "altKey" | "isComposing";
export type GraphKeyInput = Pick<KeyboardEvent, GraphKeyField>; // a native KeyboardEvent fits
export type Point = [number, number]; // CSS px in the layers' frame
export type PinchState = { mid: Point; distance: number };

const centre = (v: Viewport) => ({ x: (v.left + v.right) / 2, y: (v.bottom + v.top) / 2 });

/** KB-8's graph keys; null when the key is not a graph key or carries a modifier or composition. */
export function viewportForKey(input: GraphKeyInput, view: ViewSpec): Viewport | null {
  if (input.ctrlKey || input.metaKey || input.altKey || input.isComposing) return null;
  const v = view.viewport;
  const dx = KEY_PAN_FRACTION * (v.right - v.left);
  const dy = KEY_PAN_FRACTION * (v.top - v.bottom);
  switch (input.key) {
    case "ArrowRight":
      return panViewport(v, dx, 0);
    case "ArrowLeft":
      return panViewport(v, -dx, 0);
    case "ArrowUp":
      return panViewport(v, 0, dy);
    case "ArrowDown":
      return panViewport(v, 0, -dy);
    case "+":
    case "=":
      return zoomViewport(v, ZOOM_KEY_FACTOR, centre(v));
    case "-":
      return zoomViewport(v, 1 / ZOOM_KEY_FACTOR, centre(v));
    case "Home":
      return defaultViewport(view.size);
    default:
      return null;
  }
}

/** G-5: the paper follows the pointer, which moved (dxPx, dyPx) CSS px since `start`. */
export function dragViewport(start: ViewSpec, dxPx: number, dyPx: number): Viewport {
  const { viewport: v, size } = start;
  return panViewport(
    v,
    (-dxPx * (v.right - v.left)) / size.width,
    (dyPx * (v.top - v.bottom)) / size.height
  );
}

/** G-5: zooms by the contacts' distance ratio about their first midpoint, then pans with it. */
export function pinchViewport(start: ViewSpec, from: PinchState, to: PinchState): Viewport {
  // Contacts closer than 1 CSS px give no zoom.
  const ratio = from.distance < 1 ? 1 : to.distance / from.distance;
  if (!Number.isFinite(ratio)) return start.viewport;
  const [x, y] = pxToWorld(start, ...from.mid);
  const zoomed = zoomViewport(start.viewport, ratio, { x, y });
  return dragViewport(
    { ...start, viewport: zoomed },
    to.mid[0] - from.mid[0],
    to.mid[1] - from.mid[1]
  );
}

/**
 * G-5, GP-48: one wheel step zooms about the pointer by WHEEL_ZOOM_FACTOR, in for a wheel up
 * (dy < 0) and out for a wheel down, whatever the delta's size or mode; dy 0 changes nothing.
 */
export function wheelViewport(view: ViewSpec, dy: number, at: Point): Viewport {
  if (!(dy !== 0 && Number.isFinite(dy))) return view.viewport;
  const [x, y] = pxToWorld(view, ...at);
  const factor = dy < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
  return zoomViewport(view.viewport, factor, { x, y });
}

/**
 * The viewport for a new graph size: a default view (for `from`, or INITIAL_GRAPH_SIZE before the
 * first report) stays default; any other view keeps its centre and units per px.
 */
export function nextViewportForSize(v: Viewport, from: PixelSize | null, to: PixelSize): Viewport {
  if (isDefaultViewport(v, from ?? INITIAL_GRAPH_SIZE)) return defaultViewport(to);
  return from === null ? v : resizeViewport(v, from, to);
}
