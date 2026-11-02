/**
 * Scene: what a builder produces from a FigureSpec. Role-colored primitives
 * with no DOM and no real colors; FigureView maps roles to theme variables.
 */
export type Role =
  | "ink"
  | "ink-muted"
  | "grid"
  | "fill-faint"
  | "fill-shade"
  | "highlight"
  /** The figure's own background: the separator line between touching bars or bins. */
  | "paper";

/**
 * Stroke weights. "dashed", "dotted" and "dashdot" are the line patterns that tell
 * the series of a line chart apart without color, as Bluebook does.
 */
export type Weight = "line" | "grid" | "dashed" | "dotted" | "dashdot";

export type SceneItem =
  | {
      t: "path";
      d: string;
      role: Role;
      weight: Weight;
      fill?: Role;
      /** How a fill treats overlapping rings: evenodd leaves holes unshaded. */
      fillRule?: "evenodd";
      /** false: a fill with no outline (a shaded region); it is no obstacle for labels. */
      stroke?: false;
      arrows?: "start" | "end" | "both";
      partId?: string;
    }
  | {
      t: "text";
      x: number;
      y: number;
      text: string;
      role: Role;
      anchor: "start" | "middle" | "end";
      /** Variables (x, y) print in italic, as in Bluebook. */
      italic?: boolean;
      /**
       * Degrees the text turns about (x, y), clockwise as in SVG: -90 reads bottom to
       * top (a y-axis title), -45 slopes up to the right (crowded category names).
       */
      rotate?: number;
      partId?: string;
    }
  | {
      t: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      role: Role;
      weight?: Weight;
      fill?: Role;
      partId?: string;
    };

export type SceneIssue = {
  code:
    | "label_collision"
    | "clipped"
    | "off_line"
    | "missing_label"
    | "arrow_rule"
    | "unsampled_function"
    | "unsampled_region"
    | "region_unmarked"
    | "frame_mismatch"
    /** Tick labels the spec asked for were too crowded to draw; some were left out. */
    | "crowded_ticks"
    /** A label drawn away from what it names (outside its angle). */
    | "label_drift";
  partId?: string;
  detail: string;
};

/** Tick labels an axis drew less often than the spec's steps asked for (plane-axes.ts). */
export type ThinnedTicks = { axis: "x" | "y"; asked: number; drawn: number };

export type Scene = {
  width: number;
  height: number;
  items: SceneItem[];
  issues: SceneIssue[];
  description: string;
  /** Shapes and solids: px per world unit. Figure choices draw a set at one scale with it. */
  scale?: number;
  /** Shapes: every named point where it is drawn, in px (the checks find angles by it). */
  points?: Record<string, [number, number]>;
  /** Planes and charts: axes whose tick labels were thinned (the checks explain a missing tick number). */
  thinned?: ThinnedTicks[];
  /** Where the drawing starts in its box, when it was padded to a larger box (centered). */
  offset?: [number, number];
};

/** Layout options a shape or solid builder accepts. */
export type ScaleOptions = {
  /** px per world unit, instead of fitting the box: a set of figures drawn at one scale. */
  scale?: number;
};
