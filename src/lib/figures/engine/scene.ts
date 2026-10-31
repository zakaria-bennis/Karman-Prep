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
  code: "label_collision" | "clipped" | "off_line" | "missing_label" | "arrow_rule";
  partId?: string;
  detail: string;
};

export type Scene = {
  width: number;
  height: number;
  items: SceneItem[];
  issues: SceneIssue[];
  description: string;
};
