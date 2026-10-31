/**
 * Part labels on a coordinate plane. Each label gets an anchor and a
 * preferred side from the part it names, then goes through placeLabels with
 * everything already drawn as obstacles (axes, curves, lines, dots and tick
 * labels; grid lines are ignored), so it never overlaps a line or another
 * label. A label with no room is a `label_collision`; one on a part the plane
 * does not draw is a `missing_label`.
 *
 * - point: beside the point, up and to the right first.
 * - segment, ray, line: at its middle (`at: "mid"`, the default) or at its
 *   drawn start or end, offset perpendicular, on the upper side.
 * - function: at the end of the curve inside the frame (`at: "start"` for
 *   its start), offset perpendicular to the curve there.
 */
import { placeLabels, type PendingLabel } from "./labels";
import type { SceneIssue, SceneItem } from "./scene";
import type { FigureSpec, Label, Part } from "./spec";

type Box = { width: number; height: number };
type Pt = [number, number];

/** The vertices of a path made only of M/L commands (lines and curves), in px. */
function vertices(d: string): Pt[] {
  const n = (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
  const out: Pt[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
  return out;
}

/** The unit normal of a→b on the upper side of the figure (y grows downward). */
function upperNormal(a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const n: Pt = [-dy / l, dx / l];
  return n[1] > 0 || (n[1] === 0 && n[0] < 0) ? [-n[0], -n[1]] : n;
}

function spotFor(
  label: Label,
  part: Part,
  drawn: SceneItem[],
  toPx: (p: Pt) => Pt
): { anchor: Pt; preferred: Pt } | null {
  const own = drawn.filter(
    (i): i is Extract<SceneItem, { t: "path" }> => i.t === "path" && i.partId === part.id
  );
  if (own.length === 0) return null;
  if (part.kind === "point") {
    return { anchor: toPx([part.x, part.y]), preferred: [Math.SQRT1_2, -Math.SQRT1_2] };
  }
  if (part.kind === "segment" || part.kind === "ray" || part.kind === "line") {
    const pts = vertices(own[0].d);
    const a = pts[0];
    const b = pts[pts.length - 1];
    const anchor: Pt =
      label.at === "start" ? a : label.at === "end" ? b : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return { anchor, preferred: upperNormal(a, b) };
  }
  if (part.kind === "function") {
    const runs = own.map((i) => vertices(i.d)).filter((r) => r.length >= 2);
    if (runs.length === 0) return null;
    if (label.at === "start") {
      const r = runs[0];
      return { anchor: r[0], preferred: upperNormal(r[0], r[1]) };
    }
    const r = runs[runs.length - 1];
    const end = r[r.length - 1];
    return { anchor: end, preferred: upperNormal(r[r.length - 2], end) };
  }
  return null;
}

/**
 * Text items for the spec's labels, placed clear of `items` (the plane drawn so
 * far), and the issues met. `toPx` maps world coordinates to the box.
 */
export function planeLabels(
  spec: FigureSpec,
  items: SceneItem[],
  box: Box,
  toPx: (p: Pt) => Pt
): { items: SceneItem[]; issues: SceneIssue[] } {
  const parts = new Map(spec.parts.map((p) => [p.id, p]));
  const issues: SceneIssue[] = [];
  const pending: PendingLabel[] = [];
  for (const label of spec.labels) {
    if (!label.text.trim()) continue;
    const part = parts.get(label.on);
    const spot = part ? spotFor(label, part, items, toPx) : null;
    if (!spot) {
      issues.push({
        code: "missing_label",
        partId: label.on,
        detail: `label "${label.text}" has no place on this part on a coordinate plane`,
      });
      continue;
    }
    pending.push({
      text: label.text,
      anchor: { x: spot.anchor[0], y: spot.anchor[1] },
      preferred: { dx: spot.preferred[0], dy: spot.preferred[1] },
      partId: label.on,
    });
  }
  const placed = placeLabels(items, pending, box);
  return { items: placed.items.slice(items.length), issues: [...issues, ...placed.issues] };
}
