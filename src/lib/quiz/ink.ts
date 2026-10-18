export type InkPoint = { x: number; y: number };
export type InkStroke = { id: number; color: string; points: InkPoint[] };
export function segmentDistance(p: InkPoint, a: InkPoint, b: InkPoint) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1))
  );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
/** Stroke eraser removes an entire touched stroke; precision eraser cuts its segments. */
export function eraseInk(
  strokes: InkStroke[],
  p: InkPoint,
  radius: number,
  wholeStroke: boolean
): InkStroke[] {
  return strokes.flatMap((stroke) => {
    const hits = stroke.points.map(
      (point, i) => segmentDistance(p, stroke.points[Math.max(0, i - 1)], point) <= radius
    );
    if (!hits.some(Boolean)) return [stroke];
    if (wholeStroke) return [];
    const parts: InkStroke[] = [];
    let points: InkPoint[] = [];
    const flush = () => {
      if (points.length) parts.push({ ...stroke, points });
      points = [];
    };
    stroke.points.forEach((point, i) => {
      if (hits[i]) flush();
      else points.push(point);
    });
    flush();
    return parts;
  });
}
