/**
 * The content part of a figure's accessible description: what tells one graph,
 * chart, shape or solid apart from another drawn in the same frame (figure
 * answer choices, spec §2; WCAG 1.1.1). Builders append it to their summary.
 *
 * - planes: each line by its equation (slope-intercept), each ray and segment
 *   by its two points, other points by coordinates, each function in words;
 * - charts: the value per category, the points or values up to 12, else a summary;
 * - shapes: vertex positions; solids: shape and dims.
 *
 * Kept as short as the content allows.
 */
import type { FigureSpec, Part, PlaneFrame } from "./spec";

type Pt = [number, number];
type Pair = [number, number];
type Series = Extract<Part, { kind: "series" }>;

/** Above this many points or values a chart's detail is a summary. */
export const MAX_LISTED = 12;

const num = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return String(Object.is(r, -0) ? 0 : r);
};
const coord = ([x, y]: Pt) => `(${num(x)}, ${num(y)})`;
const isPair = (v: number | Pair): v is Pair => Array.isArray(v);

/** Joins with commas and a final "and": "A, B and C". */
function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Point names from point labels (the exam's names), else none. */
function pointNames(spec: FigureSpec): Map<string, string> {
  const names = new Map<string, string>();
  const ids = new Set(spec.parts.filter((p) => p.kind === "point").map((p) => p.id));
  for (const l of spec.labels) if (ids.has(l.on) && !names.has(l.on)) names.set(l.on, l.text);
  return names;
}

/** "y = 2x + 1", or "x = 3" for a vertical line. */
function equation([x0, y0]: Pt, [x1, y1]: Pt): string {
  if (Math.abs(x1 - x0) < 1e-9) return `x = ${num(x0)}`;
  const m = (y1 - y0) / (x1 - x0);
  const b = y0 - m * x0;
  const slope = Math.abs(m) < 1e-9 ? "" : m === 1 ? "x" : m === -1 ? "-x" : `${num(m)}x`;
  if (!slope) return `y = ${num(b)}`;
  const rb = Math.round(b * 100) / 100;
  return `y = ${slope}${rb === 0 ? "" : rb > 0 ? ` + ${num(rb)}` : ` - ${num(-rb)}`}`;
}

/** LaTeX as plain words: "y = \\frac{1}{2}x^{2}-3" → "y equals 1 over 2 x squared minus 3". */
export function latexToWords(latex: string): string {
  let s = latex.replace(/\\left|\\right/g, "").replace(/\\[,;!: ]/g, " ");
  const group = String.raw`\{([^{}]*)\}`;
  for (let guard = 0; guard < 20; guard++) {
    const before = s;
    s = s
      .replace(new RegExp(String.raw`\\[dt]?frac${group}${group}`, "g"), " ($1) over ($2) ")
      .replace(new RegExp(String.raw`\\sqrt${group}`, "g"), " the square root of ($1) ")
      .replace(new RegExp(`\\^${group}`, "g"), (_, e: string) => power(e))
      .replace(/\^(\w)/g, (_, e: string) => power(e));
    if (s === before) break;
  }
  s = s
    .replace(/\\(cdot|times)/g, " times ")
    .replace(/\\le(q)?\b/g, " is less than or equal to ")
    .replace(/\\ge(q)?\b/g, " is greater than or equal to ")
    .replace(/\\pi\b/g, " pi ")
    .replace(/\\([a-zA-Z]+)/g, " $1 ")
    .replace(/[{}]/g, " ")
    .replace(/<=/g, " is less than or equal to ")
    .replace(/>=/g, " is greater than or equal to ")
    .replace(/</g, " is less than ")
    .replace(/>/g, " is greater than ")
    .replace(/=/g, " equals ")
    .replace(/\+/g, " plus ")
    .replace(/(\S)\s*-\s*/g, "$1 minus ")
    .replace(/^\s*-\s*/, "negative ")
    // A one-token group needs no parentheses: "(1) over (2)" → "1 over 2".
    .replace(/\(\s*([\w.]+)\s*\)/g, "$1");
  return s.replace(/\s+/g, " ").trim();
}

function power(e: string): string {
  const t = e.trim();
  return t === "2" ? " squared " : t === "3" ? " cubed " : ` to the power (${t}) `;
}

/** What a plane draws, in words: "the line y = 2x + 1 through (0, 1) and (1, 3)". */
export function planeDetail(spec: FigureSpec): string[] {
  const points = new Map<string, Pt>();
  for (const p of spec.parts) if (p.kind === "point") points.set(p.id, [p.x, p.y]);
  const names = pointNames(spec);
  const at = (id: string) => {
    const name = names.get(id);
    const p = points.get(id)!;
    return name ? `${name} ${coord(p)}` : coord(p);
  };
  const used = new Set<string>();
  const out: string[] = [];
  for (const part of spec.parts) {
    if (part.kind === "line" || part.kind === "ray" || part.kind === "segment") {
      const a = points.get(part.from);
      const b = points.get(part.to);
      if (!a || !b) continue;
      used.add(part.from);
      used.add(part.to);
      if (part.kind === "line")
        out.push(`the line ${equation(a, b)} through ${at(part.from)} and ${at(part.to)}`);
      else if (part.kind === "ray") out.push(`a ray from ${at(part.from)} through ${at(part.to)}`);
      else out.push(`a segment from ${at(part.from)} to ${at(part.to)}`);
    } else if (part.kind === "function") {
      out.push(`the graph of ${latexToWords(part.latex)}`);
    }
  }
  const loose = [...points.keys()].filter((id) => !used.has(id));
  if (loose.length)
    out.push(`${loose.length === 1 ? "the point" : "the points"} ${list(loose.map(at))}`);
  return out;
}

const range = (vs: number[]) => `${num(Math.min(...vs))} to ${num(Math.max(...vs))}`;

/** A chart's data in words, by its own kind. */
export function chartDetail(
  type: string,
  frame: PlaneFrame,
  series: Series[],
  names: Map<string, string>
): string {
  const parts = series.map((s) => {
    const name = names.get(s.id);
    // A lone series needs no name, except a box plot row.
    const lead = name && (series.length > 1 || type === "box_plot") ? `${name}: ` : "";
    return lead + seriesDetail(type, frame, s);
  });
  return parts.filter(Boolean).join("; ");
}

function seriesDetail(type: string, frame: PlaneFrame, s: Series): string {
  const v = s.values;
  const kind = s.seriesKind ?? type;
  if (kind === "bar") {
    const at = v.map((x, i) => (isPair(x) ? x : ([i, x] as Pair)));
    return at
      .map(([i, value]) => `${frame.categories?.[i]?.trim() || `bar ${i + 1}`} ${num(value)}`)
      .join(", ");
  }
  if (kind === "box_plot") {
    const q = v.filter((x): x is number => !isPair(x));
    if (q.length !== 5) return "";
    return `minimum ${num(q[0])}, first quartile ${num(q[1])}, median ${num(q[2])}, third quartile ${num(q[3])}, maximum ${num(q[4])}`;
  }
  if (kind === "histogram") {
    const bins = v.filter(isPair).sort((a, b) => a[0] - b[0]);
    if (bins.length > MAX_LISTED) return `${bins.length} bins from ${range(bins.map((b) => b[0]))}`;
    const gaps = bins.slice(1).map((b, i) => b[0] - bins[i][0]);
    const width = gaps.length ? Math.min(...gaps) : (frame.step ?? 1);
    return bins.map(([l, c]) => `${num(l)} to ${num(l + width)}: ${num(c)}`).join(", ");
  }
  if (kind === "dot_plot") {
    const xs = v.filter((x): x is number => !isPair(x)).sort((a, b) => a - b);
    if (xs.length > MAX_LISTED) return `${xs.length} values from ${range(xs)}`;
    return `values ${xs.map(num).join(", ")}`;
  }
  // line and scatter: [x, y] points.
  const pts = v.filter(isPair);
  if (pts.length > MAX_LISTED) {
    return `${pts.length} points with x from ${range(pts.map((p) => p[0]))} and y from ${range(pts.map((p) => p[1]))}`;
  }
  return `points ${pts.map((p) => coord(p)).join(", ")}`;
}

/** A shape's vertices: "A at (0, 0), B at (6, 0) and C at (0, 4)". */
export function geometryDetail(spec: FigureSpec): string {
  const names = pointNames(spec);
  const pts = spec.parts.filter((p): p is Extract<Part, { kind: "point" }> => p.kind === "point");
  return list(pts.map((p) => `${names.get(p.id) ?? p.id} at ${coord([p.x, p.y])}`));
}

/** A solid's dims: "radius 2 and height 5". */
export function solidDetail(spec: FigureSpec): string {
  const solid = spec.parts.find((p): p is Extract<Part, { kind: "solid" }> => p.kind === "solid");
  if (!solid) return "";
  const words = (d: string) => d.replace(/[A-Z]/g, (c) => ` ${c.toLowerCase()}`);
  return list(Object.entries(solid.dims).map(([d, v]) => `${words(d)} ${num(v)}`));
}
