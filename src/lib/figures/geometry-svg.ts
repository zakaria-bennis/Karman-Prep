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
  // The extractor emits null for an unlabeled vertex (never invent a label).
  label?: string | null;
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

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/**
 * SVG <text> can't run KaTeX, so a measure/label the extractor emits as
 * LaTeX (e.g. "x^{\\circ}", "$30^\\circ$", "5\\sqrt{2}") would otherwise
 * render as raw markup inside the figure. Convert the handful of tokens
 * that actually appear in SAT geometry figures to Unicode. This is NOT a
 * general LaTeX engine — just the common cases, applied before esc().
 */
export function katexToUnicode(raw: unknown): string {
  let s = String(raw ?? "");
  if (!s) return s;
  // Strip $…$ and \( \) \[ \] math delimiters.
  s = s.replace(/\$+/g, "").replace(/\\[()[\]]/g, "");
  // Degrees — the overwhelmingly common case.
  s = s.replace(/\^\{\s*\\circ\s*\}|\^\\circ|\\circ|\\degree/g, "°");
  // Common geometry symbols.
  s = s
    .replace(/\\angle/g, "∠")
    .replace(/\\triangle/g, "△")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\pi/g, "π")
    .replace(/\\(?:leq|le)\b/g, "≤")
    .replace(/\\(?:geq|ge)\b/g, "≥")
    .replace(/\\parallel/g, "∥")
    .replace(/\\perp/g, "⊥");
  // \sqrt{n} / \sqrt n → √n
  s = s.replace(/\\sqrt\s*\{([^}]*)\}/g, "√$1").replace(/\\sqrt\s*(\w)/g, "√$1");
  // \overline{AB} / \overrightarrow{AB} → AB
  s = s.replace(/\\over(?:line|rightarrow|leftarrow)\s*\{([^}]*)\}/g, "$1");
  // Single-digit superscripts: ^{2} or ^2 → ².
  s = s.replace(/\^\{?(\d)\}?/g, (_, d: string) => SUPERSCRIPT[+d] ?? `^${d}`);
  // Drop any leftover braces/backslash-commands we didn't handle.
  s = s.replace(/\\[a-zA-Z]+/g, "").replace(/[{}]/g, "");
  return s.trim();
}

export interface GeometryRenderTheme {
  /** Lines, dots, right-angle marks. */
  stroke: string;
  /** Vertex labels, angle/length text. */
  label: string;
}

// Cool "blueprint" palette — figures live in the navy quiz app, so they
// follow the APP tokens (sky on navy, per docs/design-tokens.md), not the
// old black-ink-on-ivory look. sky-400 strokes, sky-200 text.
export const DISPLAY_THEME: GeometryRenderTheme = { stroke: "#38bdf8", label: "#bae6fd" };

// Black ink for the Stage-6.6 gate: it rasterizes this SVG onto a WHITE
// canvas and compares it to the original (black-on-white) screenshot, so
// the comparison render must be black — the sky display colors would be
// near-invisible on white and tank the visual match. Display colors and
// comparison colors are deliberately decoupled.
export const MONO_THEME: GeometryRenderTheme = { stroke: "#1A1A1A", label: "#1A1A1A" };

const FONT = 'font-family="ui-serif, Georgia, serif"';

/** Collect every usable point, deduped by label (a vertex shared across
 *  shapes appears once), plus keep per-shape point lists for drawing. */
function collectPoints(shapes: Shape[]) {
  const byLabel = new Map<string, { x: number; y: number; label: string }>();
  const all: Array<{ x: number; y: number; label?: string | null }> = [];
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

/** Resolve an angle marking's `at_vertex` to a position. First by vertex
 *  label; then by parsing coordinates out of a descriptive string the
 *  extractor sometimes emits for an unlabeled intersection, e.g.
 *  "intersection at (160, 325)" or "150,350". Returns null if neither
 *  works — the angle then simply isn't drawn (same as before). */
function resolveVertexPos(
  atVertex: string | undefined,
  byLabel: Map<string, { x: number; y: number; label: string }>
): { x: number; y: number } | null {
  if (!atVertex) return null;
  const named = byLabel.get(atVertex);
  if (named) return { x: named.x, y: named.y };
  const nums = String(atVertex).match(/-?\d+(?:\.\d+)?/g);
  if (nums && nums.length >= 2) {
    const x = Number(nums[0]);
    const y = Number(nums[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  }
  return null;
}

/**
 * Render figure_geometry_data to an SVG string.
 *
 * @param data figure_geometry_data (the "geometric" variant)
 * @returns { svg, renderable, reason }
 */
export function buildGeometrySvg(
  data: GeometryFigureData,
  theme: GeometryRenderTheme = DISPLAY_THEME
): GeometrySvgResult {
  const STROKE = theme.stroke;
  const LABEL_FILL = theme.label;
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
      `<text x="${mx + nx * fs * 0.9}" y="${my + ny * fs * 0.9}" ${FONT} font-size="${fs * 0.85}" fill="${LABEL_FILL}" text-anchor="middle" dominant-baseline="middle">${esc(katexToUnicode(lm.value))}</text>`
    );
  }

  // ── Angle markings: the measure label (e.g. "30°", "x°") inside the
  //    angle, plus a right-angle square where marked. The measure text is
  //    the part the gate cares about most — a render missing it reads as
  //    functionally different from the screenshot. ──
  // Resolve each marking to a vertex position (by label or parsed coords).
  // Right-angle squares draw immediately; measure labels are collected so
  // co-located ones can be fanned apart below.
  const measureMarks: Array<{ pos: { x: number; y: number }; measure: string }> = [];
  for (const am of data.angle_markings ?? []) {
    const pos = resolveVertexPos(am.at_vertex, byLabel);
    if (!pos) continue;
    if (am.measure) measureMarks.push({ pos, measure: am.measure });
    if (am.right_angle) {
      const s = fs * 0.7;
      const ox = pos.x < cx ? s : -s;
      const oy = pos.y < cy ? s : -s;
      parts.push(
        `<path d="M ${pos.x + ox} ${pos.y} L ${pos.x + ox} ${pos.y + oy} L ${pos.x} ${pos.y + oy}" fill="none" stroke="${STROKE}" stroke-width="${sw * 0.8}" />`
      );
    }
  }
  // Group measure labels by (rounded) position. A single label nudges
  // straight toward the figure centre (unchanged); multiple labels at the
  // SAME vertex (e.g. two angles both marked x°) fan out across ±36° so
  // they land in their separate angles instead of stacking on each other.
  const byPos = new Map<string, Array<{ pos: { x: number; y: number }; measure: string }>>();
  for (const m of measureMarks) {
    const key = `${Math.round(m.pos.x)},${Math.round(m.pos.y)}`;
    const list = byPos.get(key);
    if (list) list.push(m);
    else byPos.set(key, [m]);
  }
  for (const group of byPos.values()) {
    const n = group.length;
    group.forEach((m, i) => {
      const { x: vx, y: vy } = m.pos;
      let dirX = cx - vx;
      let dirY = cy - vy;
      const dmag = Math.hypot(dirX, dirY) || 1;
      dirX /= dmag;
      dirY /= dmag;
      const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0; // -1..1 across the group
      const ang = t * (Math.PI / 5); // ±36°
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const rx = dirX * ca - dirY * sa;
      const ry = dirX * sa + dirY * ca;
      const dist = 0.22 * dmag;
      parts.push(
        `<text x="${vx + rx * dist}" y="${vy + ry * dist}" ${FONT} font-size="${fs * 0.8}" fill="${LABEL_FILL}" text-anchor="middle" dominant-baseline="middle">${esc(katexToUnicode(m.measure))}</text>`
      );
    });
  }

  // ── Vertex labels (offset outward from the centroid) ──
  for (const { x, y, label } of byLabel.values()) {
    const ox = x - cx,
      oy = y - cy,
      mag = Math.hypot(ox, oy) || 1;
    const lx = x + (ox / mag) * fs * 1.1 + (Math.abs(ox) < 1 ? 0 : 0);
    const ly = y + (oy / mag) * fs * 1.1;
    parts.push(
      `<text x="${lx}" y="${ly}" ${FONT} font-size="${fs}" font-style="italic" fill="${LABEL_FILL}" text-anchor="middle" dominant-baseline="middle">${esc(katexToUnicode(label))}</text>`
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
