/**
 * The studio render style's front door: a Bluebook Scene in, the studio layer
 * that FigureView draws around it out (FigureView `style="studio"`). The Scene is
 * read, never changed, so the Bluebook render stays exactly as it was.
 */
import type { Scene } from "../scene";
import type { FigureSpec } from "../spec";
import { CHART_TYPES } from "../spec-types";
import { chartStudio, commonStudio, geometryStudio, planeStudio } from "./flat";
import { LayerBuilder } from "./paint";
import { solidStudio } from "./solid";
import type { StudioLayer } from "./types";

export type { StudioLayer } from "./types";

/** The studio layer for `scene`, the Bluebook Scene of `spec` (as buildScene or choiceScenes drew it). */
export function studioLayer(spec: FigureSpec, scene: Scene): StudioLayer {
  const b = new LayerBuilder();
  if (spec.type === "solid3d") {
    solidStudio(spec, scene, b);
    commonStudio(scene, b);
  } else if (spec.type === "geometry2d") geometryStudio(spec, scene, b);
  else if (spec.type === "plane") planeStudio(spec, scene, b);
  else if ((CHART_TYPES as readonly string[]).includes(spec.type)) chartStudio(spec, scene, b);
  else commonStudio(scene, b);
  return b.layer;
}
