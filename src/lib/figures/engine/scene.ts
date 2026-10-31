/**
 * Scene: what a builder produces from a FigureSpec. Role-colored primitives
 * with no DOM and no real colors; FigureView maps roles to theme variables.
 */
export type Role = "ink" | "ink-muted" | "grid" | "fill-faint" | "fill-shade" | "highlight";

export type Weight = "line" | "grid" | "dashed";

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
    | "region_unmarked";
  partId?: string;
  detail: string;
};

export type Scene = {
  width: number;
  height: number;
  items: SceneItem[];
  issues: SceneIssue[];
  description: string;
  /** Shapes and solids: px per world unit. Figure choices draw a set at one scale with it. */
  scale?: number;
  /** Where the drawing starts in its box, when it was padded to a larger box (centered). */
  offset?: [number, number];
};

/** Layout options a shape or solid builder accepts. */
export type ScaleOptions = {
  /** px per world unit, instead of fitting the box: a set of figures drawn at one scale. */
  scale?: number;
};
