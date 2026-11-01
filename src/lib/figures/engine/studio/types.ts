/**
 * The studio render style: an opt-in layer of depth (shading, shadows, gradients)
 * drawn around a Bluebook Scene. The Scene itself is never changed: every studio
 * shape is drawn in addition to it, or restyles how one of its items is painted,
 * so positions, labels, arrowheads, dashes and marks stay exactly Bluebook's.
 *
 * Colors are CSS expressions built only from the --figure-* theme roles
 * (figure-roles.css, figure-studio.css) with color-mix() and relative oklch(),
 * so the studio look follows every site theme, light and dark.
 */

/** A CSS color, or a gradient of the layer by id. */
export type StudioPaint = string | { grad: string };

export type StudioStop = { offset: number; color: string; opacity?: number };

/** user: coordinates in the scene's units; box: fractions of the painted shape's bounding box. */
export type StudioGradient =
  | {
      id: string;
      kind: "linear";
      units: "user" | "box";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stops: StudioStop[];
    }
  | {
      id: string;
      kind: "radial";
      units: "user" | "box";
      cx: number;
      cy: number;
      r: number;
      fx: number;
      fy: number;
      stops: StudioStop[];
    };

/** The filters FigureView defines for a studio figure (blurs in scene units). */
export type StudioFilter = "blur1" | "blur2" | "blur4" | "blur7" | "lift" | "glow";

export type StudioShape = {
  d: string;
  fill?: StudioPaint;
  stroke?: StudioPaint;
  strokeWidth?: number;
  opacity?: number;
  filter?: StudioFilter;
  /** The id of a clip path of the layer. */
  clip?: string;
  transform?: string;
  /** What the shape is, for tests and inspection (data-studio). */
  kind: string;
};

/** How one Bluebook item is painted instead; its geometry never changes. */
export type StudioRestyle = {
  fill?: StudioPaint;
  stroke?: StudioPaint;
  strokeWidth?: number;
  filter?: StudioFilter;
};

export type StudioLayer = {
  gradients: StudioGradient[];
  clips: { id: string; d: string }[];
  /** Shapes drawn just before Bluebook item i (scene.items.length: after every item but text). */
  before: Record<number, StudioShape[]>;
  restyle: Record<number, StudioRestyle>;
};
