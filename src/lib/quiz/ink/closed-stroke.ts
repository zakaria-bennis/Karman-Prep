import type { InkPoint } from "./types";

type Box = { left: number; top: number; width: number; height: number };

/** True when a finished stroke is roughly closed and surrounds a choice's letter badge ("Pick C?"). */
export function enclosedBadge(points: InkPoint[], badge: Box): boolean {
  if (points.length < 3) return false;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const box = {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
  const diagonal = Math.hypot(box.right - box.left, box.bottom - box.top);
  const first = points[0];
  const last = points[points.length - 1];
  if (diagonal === 0 || Math.hypot(last.x - first.x, last.y - first.y) >= 0.25 * diagonal)
    return false;
  const overlapW = Math.min(box.right, badge.left + badge.width) - Math.max(box.left, badge.left);
  const overlapH = Math.min(box.bottom, badge.top + badge.height) - Math.max(box.top, badge.top);
  if (overlapW <= 0 || overlapH <= 0) return false;
  return (overlapW * overlapH) / (badge.width * badge.height) >= 0.5;
}
