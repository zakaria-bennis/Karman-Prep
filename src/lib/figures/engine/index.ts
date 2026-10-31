// ============================================================
// The figure engine's front door: one FigureSpec in, one Scene out.
// buildScene dispatches on spec.type to the builder for that type. Tables
// are native HTML (TableView) and never a Scene, so a table spec throws.
// ============================================================

import { buildChart, CHART_TYPES } from "./charts";
import { buildGeometry2d } from "./geometry2d";
import { buildPlane, type Box } from "./plane";
import type { ScaleOptions, Scene } from "./scene";
import { buildSolid3d } from "./solid3d";
import type { FigureSpec } from "./spec";

export type { Box } from "./plane";

const CHARTS: readonly string[] = CHART_TYPES;

/**
 * The Scene of a drawn FigureSpec in `box`. Throws for `type: table`, which TableView draws.
 * `opts.scale` draws a shape or solid at a given px per world unit (figure choices).
 */
export function buildScene(spec: FigureSpec, box: Box, opts: ScaleOptions = {}): Scene {
  switch (spec.type) {
    case "plane":
      return buildPlane(spec, box);
    case "geometry2d":
      return buildGeometry2d(spec, box, opts);
    case "solid3d":
      return buildSolid3d(spec, box, opts);
    case "table":
      throw new Error("buildScene: a table spec is HTML, not a Scene; render it with TableView");
    default:
      if (CHARTS.includes(spec.type)) return buildChart(spec, box);
      throw new Error(`buildScene: no builder for figure type "${spec.type}"`);
  }
}

/**
 * The box a figure is laid out in before it scales to its container (SVG viewBox).
 * Planes use the box their function samples were computed in
 * (scripts/figures/sample-functions.ts), charts the ChartFigure box, and shapes a 4:3 box.
 */
export function defaultBox(spec: FigureSpec): Box {
  if (spec.type === "plane") return { width: 640, height: 480 };
  if (CHARTS.includes(spec.type)) return { width: 600, height: 400 };
  return { width: 400, height: 300 };
}
