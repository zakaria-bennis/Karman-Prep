// ============================================================
// buildGeometrySvg — deterministic 2D-geometry → SVG renderer.
//
// Turns the structured figure_geometry_data (shapes with {label,x,y}
// vertices, plus angle/length markings) into a clean, SAT-style SVG
// string. NO LLM emits the SVG — this is a pure, deterministic function
// (proposal Decision 1).
//
// Used in two places, which is why it lives in src/lib (not scripts/):
//   · src/components/learn/GeometryFigure.tsx renders it to students.
//   · the Stage-6.6 promotion gate (run via tsx) rasterizes it with
//     sharp and asks a vision model whether it matches the screenshot
//     before any student ever sees it.
//
// Coordinates are taken as-is (the extractor reads them in image/pixel
// space, y-down — same as SVG), so no axis flip. If a figure has < 2
// usable points we bail (renderable:false) and the caller keeps the
// screenshot.
// ============================================================

interface Pt {
  label?: string;
  x?: number | null;
  y?: number | null;
}
interface Shape {
  kind?: string;
  label?: string | null;
  vertices_or_points?: Pt[];
}
interface AngleMark {
  at_vertex?: string;
  measure?: string | null;
  right_angle?: boolean;
}
interface LengthMark {
  on_segment?: string[];
  value?: string | null;
}
export interface GeometryFigureData {
  kind?: string;
  shapes?: Shape[];
  angle_markings?: AngleMark[];
  length_markings?: LengthMark[];
  notes?: string | null;
}

export interface GeometrySvgResult {
  /** The SVG markup, or null when the figure can't be rendered. */
  svg: string | null;
  renderable: boolean;
  reason?: string;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const STROKE = "#1A1A1A";
const LABEL_FILL = "#1A1A1A";
const FONT = 'font-family="ui-serif, Georgia, serif"';

/** Collect every usable point, deduped by label (a vertex shared across
 *  shapes appears once), plus keep per-shape point lists for drawing. */
function collectPoints(shapes: Shape[]) {
  const byLabel = new Map<string, { x: number; y: number; label: string }>();
  const all: Array<{ x: number; y: number; label?: string }> = [];
  for (const sh of shapes) {
    for (const p of sh.vertices_or_points ?? []) {
      if (!isNum(p.x) || !isNum(p.y)) continue;
      all.push({ x: p.x, y: p.y, label: p.label });
      if (p.label && !byLabel.has(p.label))
        byLabel.set(p.label, { x: p.x, y: p.y, label: p.label });
    }
  }
  return { byLabel, all };
}

/**
 * Render figure_geometry_data to an SVG string.
 *
 * @param data figure_geometry_data (the "geometric" variant)
 * @returns { svg, renderable, reason }
 */
export function buildGeometrySvg(data: GeometryFigureData): GeometrySvgResult {
  const shapes = Array.isArray(data?.shapes) ? data.shapes : [];
  const { byLabel, all } = collectPoints(shapes);
  if (all.length < 2) {
    return { svg: null, renderable: false, reason: "no_coordinates" };
  }

  // viewBox from the bounding box of every point, with padding for labels.
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const pad = Math.max(24, (maxX - minX + maxY - minY) * 0.08);
  const vbX = minX - pad,
    vbY = minY - pad,
    vbW = maxX - minX + pad * 2,
    vbH = maxY - minY + pad * 2;
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2;
  // Scale-independent stroke/label sizing from the figure's extent.
  const unit = Math.max(vbW, vbH);
  const sw = Math.max(1, unit * 0.004);
  const fs = Math.max(9, unit * 0.04);
  const dot = sw * 2.2;

  const parts: string[] = [];

  // ── Shapes ──
  for (const sh of shapes) {
    const pts = (sh.vertices_or_points ?? []).filter((p) => isNum(p.x) && isNum(p.y)) as Array<{
      x: number;
      y: number;
    }>;
    if (pts.length === 0) continue;
    const kind = sh.kind ?? "other";
    if (kind === "point" || pts.length === 1) {
      parts.push(`<circle cx="${pts[0].x}" cy="${pts[0].y}" r="${dot}" fill="${STROKE}" />`);
    } else if (kind === "line_segment" || pts.length === 2) {
      parts.push(
        `<polyline points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${STROKE}" stroke-width="${sw}" />`
      );
    } else {
      // triangle / quadrilateral / polygon / other → closed polygon
      parts.push(
        `<polygon points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${STROKE}" stroke-width="${sw}" />`
      );
    }
  }

  // ── Length markings: value at the midpoint of segment [A,B] ──
  for (const lm of data.length_markings ?? []) {
    const seg = lm.on_segment ?? [];
    if (seg.length < 2 || !lm.value) continue;
    const a = byLabel.get(seg[0]);
    const b = byLabel.get(seg[seg.length - 1]);
    if (!a || !b) continue;
    const mx = (a.x + b.x) / 2,
      my = (a.y + b.y) / 2;
    // nudge perpendicular to the segment, away from centre
    const dx = b.x - a.x,
      dy = b.y - a.y,
      len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len,
      ny = dx / len;
    if ((mx + nx - cx) ** 2 + (my + ny - cy) ** 2 < (mx - cx) ** 2 + (my - cy) ** 2) {
      nx = -nx;
      ny = -ny;
    }
    parts.push(
      `<text x="${mx + nx * fs * 0.9}" y="${my + ny * fs * 0.9}" ${FONT} font-size="${fs * 0.85}" fill="${LABEL_FILL}" text-anchor="middle" dominant-baseline="middle">${esc(lm.value)}</text>`
    );
  }

  // ── Right-angle markers (small square at the vertex) ──
  for (const am of data.angle_markings ?? []) {
    if (!am.right_angle || !am.at_vertex) continue;
    const v = byLabel.get(am.at_vertex);
    if (!v) continue;
    const s = fs * 0.7;
    const ox = v.x < cx ? s : -s;
    const oy = v.y < cy ? s : -s;
    parts.push(
      `<path d="M ${v.x + ox} ${v.y} L ${v.x + ox} ${v.y + oy} L ${v.x} ${v.y + oy}" fill="none" stroke="${STROKE}" stroke-width="${sw * 0.8}" />`
    );
  }

  // ── Vertex labels (offset outward from the centroid) ──
  for (const { x, y, label } of byLabel.values()) {
    const ox = x - cx,
      oy = y - cy,
      mag = Math.hypot(ox, oy) || 1;
    const lx = x + (ox / mag) * fs * 1.1 + (Math.abs(ox) < 1 ? 0 : 0);
    const ly = y + (oy / mag) * fs * 1.1;
    parts.push(
      `<text x="${lx}" y="${ly}" ${FONT} font-size="${fs}" font-style="italic" fill="${LABEL_FILL}" text-anchor="middle" dominant-baseline="middle">${esc(label)}</text>`
    );
  }

  const title = esc(data.notes ?? "Geometric figure");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" ` +
    `role="img" aria-label="${title}" preserveAspectRatio="xMidYMid meet">` +
    `<title>${title}</title>` +
    parts.join("") +
    `</svg>`;

  return { svg, renderable: true };
}
