/** Positions markings from the drawing's supplied coordinates, never its labels' values. */
export interface LayoutPoint {
  x: number;
  y: number;
}

const unitVector = (a: LayoutPoint, b: LayoutPoint) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  return length > 0 ? { x: dx / length, y: dy / length, length } : null;
};

export function placeLengthLabel(
  a: LayoutPoint,
  b: LayoutPoint,
  center: LayoutPoint,
  distance: number
) {
  const direction = unitVector(a, b);
  if (!direction) return null;
  const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let normal = { x: -direction.y, y: direction.x };
  if ((midpoint.x - center.x) * normal.x + (midpoint.y - center.y) * normal.y < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  return { x: midpoint.x + normal.x * distance, y: midpoint.y + normal.y * distance };
}

/** Approximate half-size of a one-line label in the figure serif (digits ≈ 0.5em wide). */
export function labelHalfExtent(text: string, fontSize: number) {
  const width = Math.max(1, [...text].length) * fontSize * 0.52;
  return { x: width / 2, y: fontSize * 0.36 };
}

/** Half-extent of a label box measured along a unit direction. */
const extentAlong = (half: LayoutPoint, dir: LayoutPoint) =>
  Math.abs(dir.x) * half.x + Math.abs(dir.y) * half.y;

/**
 * Side-length label centered on the side and pushed outward along the perpendicular
 * so the label box keeps the same visible `gap` from every side, whatever its slope.
 */
export function placeClearLengthLabel(
  a: LayoutPoint,
  b: LayoutPoint,
  center: LayoutPoint,
  gap: number,
  half: LayoutPoint
) {
  const direction = unitVector(a, b);
  if (!direction) return null;
  const normal = { x: -direction.y, y: direction.x };
  return placeLengthLabel(a, b, center, gap + extentAlong(half, normal));
}

/**
 * Angle marking with a consistent arc radius; the label sits inside the angle on its
 * bisector, far enough out that its box clears both rays by `gap`.
 */
export function placeClearAngleMark(
  vertex: LayoutPoint,
  a: LayoutPoint,
  b: LayoutPoint,
  arcRadius: number,
  gap: number,
  half: LayoutPoint
) {
  const u = unitVector(vertex, a);
  const v = unitVector(vertex, b);
  if (!u || !v) return null;
  const cross = u.x * v.y - u.y * v.x;
  const bx = u.x + v.x;
  const by = u.y + v.y;
  const magnitude = Math.hypot(bx, by);
  if (Math.abs(cross) < 1e-8 || magnitude < 1e-8) return null;
  const shortest = Math.min(u.length, v.length);
  const radius = Math.min(arcRadius, shortest * 0.3);
  const square = Math.min(arcRadius * 0.6, shortest * 0.2);
  const bisector = { x: bx / magnitude, y: by / magnitude };
  const halfAngle = Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y))) / 2;
  const reach = Math.hypot(half.x, half.y);
  const distance = Math.max(
    radius + gap + extentAlong(half, bisector),
    (reach + gap) / Math.max(Math.sin(halfAngle), 0.05)
  );
  return {
    arc: `M ${vertex.x + u.x * radius} ${vertex.y + u.y * radius} A ${radius} ${radius} 0 0 ${cross > 0 ? 1 : 0} ${vertex.x + v.x * radius} ${vertex.y + v.y * radius}`,
    rightAngle: `M ${vertex.x + u.x * square} ${vertex.y + u.y * square} L ${vertex.x + (u.x + v.x) * square} ${vertex.y + (u.y + v.y) * square} L ${vertex.x + v.x * square} ${vertex.y + v.y * square}`,
    label: { x: vertex.x + bisector.x * distance, y: vertex.y + bisector.y * distance },
    perpendicular: Math.abs(u.x * v.x + u.y * v.y) < 1e-6,
  };
}

/**
 * Vertex letter just outside the vertex, in the widest empty sector between the lines
 * that meet there (founder review 2026-10-22: labels clear of every line). For a corner
 * that is the outward bisector; a point in the middle of a straight side goes to the side
 * away from the figure's center; an isolated point goes directly away from the center.
 */
export function placeVertexLabel(
  vertex: LayoutPoint,
  neighbors: LayoutPoint[],
  center: LayoutPoint,
  gap: number,
  half: LayoutPoint
) {
  const angles = neighbors
    .map((n) => unitVector(vertex, n))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => Math.atan2(u.y, u.x))
    .sort((a, b) => a - b);
  const away = unitVector(center, vertex) ?? { x: 0, y: -1 };
  let dir = away;
  if (angles.length >= 1) {
    // Each empty sector runs from one ray to the next (wrapping around).
    let best: { width: number; mid: LayoutPoint; score: number } | null = null;
    angles.forEach((start, i) => {
      const end = i + 1 < angles.length ? angles[i + 1] : angles[0] + 2 * Math.PI;
      const width = end - start;
      const midAngle = start + width / 2;
      const mid = { x: Math.cos(midAngle), y: Math.sin(midAngle) };
      const score = mid.x * away.x + mid.y * away.y;
      // Prefer the widest sector; between equal ones, the one facing away from the center.
      if (!best || width > best.width + 1e-3 || (width > best.width - 1e-3 && score > best.score))
        best = { width, mid, score };
    });
    dir = best!.mid;
  }
  const length = Math.hypot(dir.x, dir.y);
  const unit = { x: dir.x / length, y: dir.y / length };
  const distance = gap + extentAlong(half, unit);
  return { x: vertex.x + unit.x * distance, y: vertex.y + unit.y * distance };
}
