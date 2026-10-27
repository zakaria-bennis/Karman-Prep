export type PenIndex = 1 | 2 | 3 | 4 | 5;
export type InkPoint = { x: number; y: number; p?: number };

/** What a stroke is attached to (spec: Pencil, Anchoring). */
export type InkAnchor =
  | { kind: "figure"; figureId: string }
  | { kind: "text"; blockId: string; charOffset: number }
  | { kind: "choice"; letter: string }
  | { kind: "block"; blockId: string };

export type InkStroke = { id: number; pen: PenIndex; anchor: InkAnchor; points: InkPoint[] };
export type InkDocument = { strokes: InkStroke[] };

export type InkOp =
  | { kind: "add"; stroke: InkStroke }
  | { kind: "erase"; removed: InkStroke[] }
  | { kind: "clear"; removed: InkStroke[] };
