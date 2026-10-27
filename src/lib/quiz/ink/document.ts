import type { InkDocument, InkOp, InkPoint } from "./types";

export const MAX_STROKES = 500;
export const MAX_POINTS = 5000;

/** Strokes keep their drawing order; ids increase as strokes are drawn. */
function insertInOrder(doc: InkDocument, strokes: InkDocument["strokes"]): InkDocument {
  const ids = new Set(doc.strokes.map((s) => s.id));
  const merged = [...doc.strokes, ...strokes.filter((s) => !ids.has(s.id))];
  merged.sort((a, b) => a.id - b.id);
  return { strokes: merged.slice(-MAX_STROKES) };
}

export function applyInkOp(doc: InkDocument, op: InkOp): InkDocument {
  if (op.kind === "add") return insertInOrder(doc, [op.stroke]);
  if (op.kind === "restore") return insertInOrder(doc, op.strokes);
  const gone = new Set(op.removed.map((s) => s.id));
  return { strokes: doc.strokes.filter((s) => !gone.has(s.id)) };
}

/** The operation that undoes `op`. Erase and clear are undone by putting the strokes back. */
export function invertInkOp(op: InkOp): InkOp {
  if (op.kind === "add") return { kind: "erase", removed: [op.stroke] };
  if (op.kind === "restore") return { kind: "erase", removed: op.strokes };
  return { kind: "restore", strokes: op.removed };
}

export function capStroke(points: InkPoint[]): InkPoint[] {
  return points.length > MAX_POINTS ? points.slice(0, MAX_POINTS) : points;
}

/** Ramer-Douglas-Peucker simplification. */
export function simplifyStroke(points: InkPoint[], tolerance = 0.5): InkPoint[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const A = points[a];
    const B = points[b];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    let worst = -1;
    let index = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i].x - dx * points[i].y + B.x * A.y - B.y * A.x) / len;
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (worst > tolerance) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
