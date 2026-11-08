import type { InkAnchor, InkPoint, InkStroke } from "./types";

/** Live positions of anchor targets, in pane-content pixels. */
export interface AnchorLayout {
  /** Figure origin plus pixels per viewBox unit. */
  figure(id: string): { left: number; top: number; scaleX: number; scaleY: number } | null;
  /** The character's box origin and the font size (px per em) at that character. */
  char(blockId: string, offset: number): { left: number; top: number; em: number } | null;
  choice(letter: string): { left: number; top: number; em: number } | null;
  block(blockId: string): { left: number; top: number; em: number } | null;
}

/** What the pointer started on. It decides the anchor of the whole stroke. */
export type AnchorHit = InkAnchor;

type Frame = { left: number; top: number; sx: number; sy: number };

function frameFor(anchor: InkAnchor, layout: AnchorLayout): Frame | null {
  switch (anchor.kind) {
    case "figure": {
      const f = layout.figure(anchor.figureId);
      return f && { left: f.left, top: f.top, sx: f.scaleX, sy: f.scaleY };
    }
    case "text": {
      const c = layout.char(anchor.blockId, anchor.charOffset);
      return c && { left: c.left, top: c.top, sx: c.em, sy: c.em };
    }
    case "choice": {
      const c = layout.choice(anchor.letter);
      return c && { left: c.left, top: c.top, sx: c.em, sy: c.em };
    }
    case "block": {
      const b = layout.block(anchor.blockId);
      return b && { left: b.left, top: b.top, sx: b.em, sy: b.em };
    }
  }
}

/** Converts pane points into the anchor's own units: viewBox units for figures, em elsewhere. */
export function toAnchored(
  hit: AnchorHit,
  layout: AnchorLayout,
  panePoints: InkPoint[]
): { anchor: InkAnchor; points: InkPoint[] } {
  const f = frameFor(hit, layout) ?? { left: 0, top: 0, sx: 1, sy: 1 };
  return {
    anchor: hit,
    points: panePoints.map((p) => ({
      x: (p.x - f.left) / f.sx,
      y: (p.y - f.top) / f.sy,
      ...(p.p === undefined ? {} : { p: p.p }),
    })),
  };
}

/** Places a stored stroke in the current layout, or null when its anchor is gone. */
export function toPane(stroke: InkStroke, layout: AnchorLayout): { x: number; y: number }[] | null {
  const f = frameFor(stroke.anchor, layout);
  if (!f) return null;
  return stroke.points.map((p) => ({ x: f.left + p.x * f.sx, y: f.top + p.y * f.sy }));
}
