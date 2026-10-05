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

/** The smaller angle between two explicitly identified rays. Unresolved/straight rays are held. */
export function placeAngleMark(vertex: LayoutPoint, a: LayoutPoint, b: LayoutPoint, size: number) {
  const u = unitVector(vertex, a);
  const v = unitVector(vertex, b);
  if (!u || !v) return null;
  const cross = u.x * v.y - u.y * v.x;
  const bx = u.x + v.x;
  const by = u.y + v.y;
  const magnitude = Math.hypot(bx, by);
  if (Math.abs(cross) < 1e-8 || magnitude < 1e-8) return null;
  const radius = Math.min(size * 1.3, Math.min(u.length, v.length) * 0.18);
  const labelDistance = radius + size * 1.4;
  return {
    arc: `M ${vertex.x + u.x * radius} ${vertex.y + u.y * radius} A ${radius} ${radius} 0 0 ${cross > 0 ? 1 : 0} ${vertex.x + v.x * radius} ${vertex.y + v.y * radius}`,
    rightAngle: `M ${vertex.x + u.x * radius} ${vertex.y + u.y * radius} L ${vertex.x + (u.x + v.x) * radius} ${vertex.y + (u.y + v.y) * radius} L ${vertex.x + v.x * radius} ${vertex.y + v.y * radius}`,
    label: {
      x: vertex.x + (bx / magnitude) * labelDistance,
      y: vertex.y + (by / magnitude) * labelDistance,
    },
    perpendicular: Math.abs(u.x * v.x + u.y * v.y) < 1e-6,
  };
}
