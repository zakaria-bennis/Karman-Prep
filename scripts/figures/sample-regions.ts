/**
 * Authoring-time region sampling: the shaded area of a region part as closed
 * world-unit rings clipped to the frame, for its `samples`.
 *
 * The LaTeX is one inequality (chains like -1 < y \le 3 included) or a system
 * of them separated by commas, semicolons, \\ or \text{and}, optionally inside
 * \begin{cases}…\end{cases}. Each relation is read by the calculator
 * (calculator-read.ts), read-only.
 *
 * - Linear (a x + b y ⋚ c, so y ⋚ mx + b, x ⋚ k, y ⋚ k), up to 4 relations:
 *   exact. The frame rectangle is clipped against each half-plane
 *   (Sutherland–Hodgman), so every vertex is on the frame edge or on a
 *   boundary line to floating point. A relation counts as linear when the
 *   calculator's own difference lhs − rhs matches an affine function at
 *   probe points across the frame.
 * - Otherwise: the calculator's shaded pixel spans (one mask per relation row,
 *   intersected) are traced into pixel-edge outlines, and every outline vertex
 *   within SNAP_PX of a calculator boundary curve is moved onto that curve, so
 *   the edge is the calculator's curve wherever it touches the boundary. The
 *   outlines are then thinned (Douglas–Peucker, THIN_PX).
 */
import type { CurveGeometry, LineSetGeometry } from "@/lib/calculator/plot/geometry";
import type { PlotInput } from "@/lib/calculator/plot/index";
import { clipHalfPlane, frameRing } from "@/lib/figures/engine/plane-shapes";
import type { PlaneFrame } from "@/lib/figures/engine/spec";
import { plot, plotInput, viewFor } from "./calculator-read";

type Pt = [number, number];
type Box = { width: number; height: number };
type RegionInput = Extract<PlotInput, { kind: "region" }>;

/** The most relations an exact (linear) region is cut from. */
export const MAX_LINEAR_RELATIONS = 4;
/** How close (px) a traced vertex must be to a boundary curve to move onto it. */
const SNAP_PX = 1.5;
/** Douglas–Peucker tolerance (px) for thinning traced outlines. */
const THIN_PX = 0.1;

/** The rings, and whether they are exact (linear) or traced from the calculator's pixels. */
export type RegionSamples = { rings: Pt[][]; exact: boolean };

/** The relations of a system, split at top-level separators. */
export function splitSystem(latex: string): string[] {
  const s = latex
    .replace(/\\begin\{cases\}|\\end\{cases\}/g, "")
    .replace(/\\left\\\{|\\right\./g, "")
    .replace(/\\text\{\s*and\s*\}/g, ";")
    .replace(/\\\\/g, ";");
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth--;
    if (depth === 0 && (ch === "," || ch === ";")) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((r) => r.replace(/&/g, "").trim()).filter(Boolean);
}

/**
 * The half-plane a·x + b·y <= c where relation k of `input` holds, or null when
 * that relation is not linear over the frame.
 */
function halfPlane(
  input: RegionInput,
  k: number,
  frame: PlaneFrame
): [number, number, number] | null {
  if (input.branches.length !== 1) return null;
  const terms = input.branches[0];
  const f = (x: number, y: number) => terms[k](x, y) - terms[k + 1](x, y);
  const c0 = f(0, 0);
  const a = f(1, 0) - c0;
  const b = f(0, 1) - c0;
  if (![a, b, c0].every(Number.isFinite) || (a === 0 && b === 0)) return null;
  const [x0, x1] = frame.x;
  const [y0, y1] = frame.y;
  const probes: Pt[] = [
    [x0, y0],
    [x1, y1],
    [x0, y1],
    [x1, y0],
    [x0 + 0.3183 * (x1 - x0), y0 + 0.7071 * (y1 - y0)],
    [x0 + 0.8414 * (x1 - x0), y0 + 0.1428 * (y1 - y0)],
  ];
  for (const [x, y] of probes) {
    const want = a * x + b * y + c0;
    const scale = 1 + Math.abs(a * x) + Math.abs(b * y) + Math.abs(c0);
    if (!(Math.abs(f(x, y) - want) <= 1e-9 * scale)) return null;
  }
  // f op 0: "<" and "<=" keep f <= 0; ">" and ">=" keep -f <= 0.
  const op = input.ops[k];
  return op === "<" || op === "<=" ? [a, b, -c0] : [-a, -b, c0];
}

/** The exact polygon of a linear system, or null when a relation is not linear. */
function linearRings(inputs: RegionInput[], frame: PlaneFrame): Pt[][] | null {
  const planes: [number, number, number][] = [];
  for (const input of inputs) {
    for (let k = 0; k < input.ops.length; k++) {
      const h = halfPlane(input, k, frame);
      if (!h) return null;
      planes.push(h);
    }
  }
  if (planes.length > MAX_LINEAR_RELATIONS) return null;
  let ring = frameRing(frame);
  for (const [a, b, c] of planes) ring = clipHalfPlane(ring, a, b, c);
  // Drop repeated vertices (a corner the line passes through).
  const clean = ring.filter((p, i) => {
    const q = ring[(i + 1) % ring.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-12;
  });
  return clean.length >= 3 ? [clean] : [];
}

// ---------------------------------------------------------------- traced regions

/** The pixel mask (1 = shaded) of a region geometry's spans, W × H. */
function maskOf(spans: Float32Array, W: number, H: number): Uint8Array {
  const mask = new Uint8Array(W * H);
  for (let s = 0; s + 3 < spans.length; s += 4) {
    const j0 = Math.max(0, Math.floor(spans[s]));
    const j1 = Math.min(H, Math.ceil(spans[s + 1]));
    const i0 = Math.max(0, Math.floor(spans[s + 2]));
    const i1 = Math.min(W, Math.ceil(spans[s + 3]));
    for (let j = j0; j < j1; j++) mask.fill(1, j * W + i0, j * W + i1);
  }
  return mask;
}

/**
 * The outlines of the shaded pixels, as closed rings of lattice points (pixel
 * corners). Each boundary edge of a shaded pixel is used once; where two
 * rings touch at a corner either linking is right under the even-odd rule.
 */
function trace(mask: Uint8Array, W: number, H: number): Pt[][] {
  const on = (i: number, j: number) => i >= 0 && j >= 0 && i < W && j < H && mask[j * W + i] === 1;
  const key = (i: number, j: number) => j * (W + 1) + i;
  const from = new Map<number, number[]>(); // start vertex → edge indices
  const edges: [number, number, number, number][] = [];
  const add = (a: number, b: number, c: number, d: number) => {
    const k = key(a, b);
    const list = from.get(k);
    if (list) list.push(edges.length);
    else from.set(k, [edges.length]);
    edges.push([a, b, c, d]);
  };
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      if (!on(i, j)) continue;
      if (!on(i, j - 1)) add(i, j, i + 1, j);
      if (!on(i + 1, j)) add(i + 1, j, i + 1, j + 1);
      if (!on(i, j + 1)) add(i + 1, j + 1, i, j + 1);
      if (!on(i - 1, j)) add(i, j + 1, i, j);
    }
  }
  const used = new Uint8Array(edges.length);
  const rings: Pt[][] = [];
  for (let e0 = 0; e0 < edges.length; e0++) {
    if (used[e0]) continue;
    const ring: Pt[] = [];
    let e = e0;
    while (!used[e]) {
      used[e] = 1;
      const [a, b, c, d] = edges[e];
      // Keep only corners: drop the last vertex when it lies straight between its neighbours.
      if (ring.length >= 2) {
        const [p, q] = [ring[ring.length - 2], ring[ring.length - 1]];
        if ((q[0] - p[0]) * (b - q[1]) === (q[1] - p[1]) * (a - q[0])) ring.pop();
      }
      ring.push([a, b]);
      const next = (from.get(key(c, d)) ?? []).find((n) => !used[n]);
      if (next === undefined) break;
      e = next;
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

/** The nearest point to p on segment a–b. */
function nearestOn(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dd = dx * dx + dy * dy;
  const t = dd === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / dd));
  return [a[0] + t * dx, a[1] + t * dy];
}

/** Douglas–Peucker on an open polyline. */
function thin(pts: Pt[], tol: number): Pt[] {
  if (pts.length <= 2) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let far = 0;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const q = nearestOn(pts[i], a, b);
    const d = Math.hypot(pts[i][0] - q[0], pts[i][1] - q[1]);
    if (d > far) [far, at] = [d, i];
  }
  if (far <= tol) return [a, b];
  return [...thin(pts.slice(0, at + 1), tol).slice(0, -1), ...thin(pts.slice(at), tol)];
}

/** Douglas–Peucker on a closed ring, split at its first vertex and the one farthest from it. */
function thinRing(ring: Pt[], tol: number): Pt[] {
  if (ring.length <= 3) return ring;
  let at = 0;
  let far = -1;
  ring.forEach((p, i) => {
    const d = Math.hypot(p[0] - ring[0][0], p[1] - ring[0][1]);
    if (d > far) [far, at] = [d, i];
  });
  const first = thin(ring.slice(0, at + 1), tol);
  const second = thin([...ring.slice(at), ring[0]], tol);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

/** Boundary curves of a region geometry, as px polylines. */
function boundaryRuns(
  boundaries: (CurveGeometry | LineSetGeometry)[],
  frame: PlaneFrame,
  box: Box
): Pt[][] {
  const X = (x: number) => ((x - frame.x[0]) / (frame.x[1] - frame.x[0])) * box.width;
  const Y = (y: number) => ((frame.y[1] - y) / (frame.y[1] - frame.y[0])) * box.height;
  const runs: Pt[][] = [];
  for (const g of boundaries) {
    if (g.kind === "lines") {
      for (const v of g.positions) {
        runs.push(
          g.orientation === "vertical"
            ? [
                [X(v), 0],
                [X(v), box.height],
              ]
            : [
                [0, Y(v)],
                [box.width, Y(v)],
              ]
        );
      }
      continue;
    }
    let run: Pt[] = [];
    for (let i = 0; i + 1 < g.polylines.length; i += 2) {
      const [x, y] = [g.polylines[i], g.polylines[i + 1]];
      if (Number.isFinite(x) && Number.isFinite(y)) run.push([X(x), Y(y)]);
      else {
        if (run.length >= 2) runs.push(run);
        run = [];
      }
    }
    if (run.length >= 2) runs.push(run);
  }
  return runs;
}

/** The traced rings of the calculator's shading for every row, intersected. */
function tracedRings(inputs: RegionInput[], frame: PlaneFrame, box: Box): Pt[][] {
  const view = viewFor(frame, box);
  const W = Math.ceil(box.width);
  const H = Math.ceil(box.height);
  let mask: Uint8Array | null = null;
  const curves: Pt[][] = [];
  for (const input of inputs) {
    const g = plot(input, view);
    if (g.kind !== "region") return [];
    const m = maskOf(g.spans, W, H);
    mask = mask ? mask.map((v, i) => v & m[i]) : m;
    curves.push(...boundaryRuns(g.boundaries, frame, box));
  }
  if (!mask) return [];
  const toWorld = ([i, j]: Pt): Pt => [
    frame.x[0] + (i / box.width) * (frame.x[1] - frame.x[0]),
    frame.y[1] - (j / box.height) * (frame.y[1] - frame.y[0]),
  ];
  const onEdge = ([i, j]: Pt) => i === 0 || j === 0 || i === W || j === H;
  return trace(mask, W, H)
    .map((ring) => {
      const snapped = ring.map((p): Pt => {
        if (onEdge(p)) return p;
        let best = p;
        let near = SNAP_PX;
        for (const run of curves) {
          for (let k = 0; k + 1 < run.length; k++) {
            const q = nearestOn(p, run[k], run[k + 1]);
            const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
            if (d <= near) [best, near] = [q, d];
          }
        }
        return best;
      });
      return thinRing(snapped, THIN_PX).map(toWorld);
    })
    .filter((r) => r.length >= 3);
}

/**
 * The shaded area of `latex` over `frame`, for a `box`-sized view: exact for a
 * linear system, else traced from the calculator's shading. Null when the
 * calculator cannot read a relation as an inequality.
 */
export function regionSamples(latex: string, frame: PlaneFrame, box: Box): RegionSamples | null {
  const inputs: RegionInput[] = [];
  for (const row of splitSystem(latex)) {
    const input = plotInput(row);
    if (!input || input.kind !== "region") return null;
    inputs.push(input);
  }
  if (inputs.length === 0) return null;
  const exact = linearRings(inputs, frame);
  if (exact) return { rings: exact, exact: true };
  return { rings: tracedRings(inputs, frame, box), exact: false };
}
