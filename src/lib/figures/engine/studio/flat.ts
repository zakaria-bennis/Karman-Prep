/**
 * Studio depth for flat figures: 2D geometry, coordinate planes and charts.
 *
 * - Shapes (polygons, circles) are paper cut-outs lying on the page: a faint
 *   lit fill and a soft drop shadow under them.
 * - Ink lines carry a very slight lift (a shadow in light themes, a glow in dark).
 * - A grid sits on a soft paper card with a gentle inner shadow; its lines are finer.
 * - Curves lift a little more; shaded regions are a translucent gradient.
 * - Points and dots are small shaded spheres; open dots stay open.
 * - Bars and histogram columns are lit extrusions whose front face is exactly
 *   Bluebook's bar; box plots get the same depth; line graphs a soft area under the line.
 */
import type { Pt } from "../marks";
import type { Role, Scene, SceneItem } from "../scene";
import type { FigureSpec } from "../spec";
import { bounds, dotOf, fade, f2, LayerBuilder, lift, pathPoints, polyPath, role } from "./paint";
import type { StudioShape } from "./types";

type Path = Extract<SceneItem, { t: "path" }>;
type Rect = Extract<SceneItem, { t: "rect" }>;

const ground = () => role("studio-ground");

/** The shared gradients for dots: a filled ink sphere, and the inside of an open one. */
function dotGradients(b: LayerBuilder) {
  const ink = role("ink");
  const ball = b.gradient({
    id: "ball",
    kind: "radial",
    units: "box",
    cx: 0.5,
    cy: 0.5,
    r: 0.62,
    fx: 0.34,
    fy: 0.3,
    stops: [
      { offset: 0, color: lift(ink, 0.3) },
      { offset: 0.45, color: ink },
      { offset: 1, color: lift(ink, -0.24) },
    ],
  });
  const paper = role("studio-paper");
  const hollow = b.gradient({
    id: "hollow",
    kind: "radial",
    units: "box",
    cx: 0.5,
    cy: 0.5,
    r: 0.6,
    fx: 0.62,
    fy: 0.66,
    stops: [
      { offset: 0, color: lift(paper, 0.03) },
      { offset: 1, color: lift(paper, -0.07) },
    ],
  });
  return { ball, hollow };
}

const isInkStroke = (it: SceneItem): it is Path =>
  it.t === "path" && it.stroke !== false && it.role !== "grid" && !it.fill;

/** What every studio figure shares: shaded dots with a shadow, and ink lines lifted off the page. */
export function commonStudio(scene: Scene, b: LayerBuilder, lineFilter: "lift" | "glow" = "lift") {
  const { ball, hollow } = dotGradients(b);
  scene.items.forEach((it, i) => {
    if (it.t !== "path") return;
    const dot = dotOf(it.d);
    if (dot) {
      const [x, y] = dot.c;
      const s = Math.max(0.6, dot.r * 0.22);
      b.before(i, {
        kind: "dot-shadow",
        d: circlePath(x + s * 0.6, y + s * 1.3, dot.r * 1.02),
        fill: ground(),
        opacity: 0.6,
        filter: "blur1",
      });
      b.restyle(i, { fill: it.fill ? ball : hollow });
      return;
    }
    if (isInkStroke(it)) b.restyle(i, { filter: lineFilter });
  });
}

function circlePath(x: number, y: number, r: number): string {
  return `M${f2(x - r)} ${f2(y)} A${f2(r)} ${f2(r)} 0 1 0 ${f2(x + r)} ${f2(y)} A${f2(r)} ${f2(r)} 0 1 0 ${f2(x - r)} ${f2(y)} Z`;
}

/** A path that closes on itself (a polygon or a circle), not a dot. */
const closedShape = (it: SceneItem): it is Path =>
  it.t === "path" && /Z\s*$/.test(it.d) && !dotOf(it.d) && it.stroke !== false;

/** 2D geometry: polygons and circles as paper cut-outs with a soft shadow. */
export function geometryStudio(spec: FigureSpec, scene: Scene, b: LayerBuilder) {
  const shapeIds = new Set(
    spec.parts.filter((p) => p.kind === "polygon" || p.kind === "circle").map((p) => p.id)
  );
  const paper = role("studio-paper");
  const fill = b.gradient({
    id: "paper",
    kind: "linear",
    units: "box",
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 1,
    stops: [
      { offset: 0, color: lift(paper, 0.03) },
      { offset: 1, color: lift(paper, -0.035) },
    ],
  });
  const shadows: StudioShape[] = [];
  const sheets: StudioShape[] = [];
  scene.items.forEach((it) => {
    if (!closedShape(it) || !it.partId || !shapeIds.has(it.partId)) return;
    shadows.push({
      kind: "paper-shadow",
      d: it.d,
      fill: ground(),
      opacity: 0.62,
      transform: "translate(2 3.5)",
      filter: "blur4",
    });
    sheets.push({ kind: "paper", d: it.d, fill });
  });
  // Every shadow first, so one sheet never shadows another drawn beside it.
  b.before(0, ...shadows, ...sheets);
  commonStudio(scene, b);
}

/** The grid's extent, from its lines. */
function gridBounds(scene: Scene) {
  const pts = scene.items.flatMap((it) =>
    it.t === "path" && it.role === "grid" ? pathPoints(it.d) : []
  );
  return bounds(pts);
}

/** A grid on a soft paper card with an inner shadow, and finer grid lines. */
function gridCard(scene: Scene, b: LayerBuilder, extra: Pt[] = []) {
  const grid = gridBounds(scene);
  const more = bounds(extra);
  const g =
    grid && more
      ? {
          x0: Math.min(grid.x0, more.x0),
          y0: Math.min(grid.y0, more.y0),
          x1: Math.max(grid.x1, more.x1),
          y1: Math.max(grid.y1, more.y1),
        }
      : grid;
  if (!g) return;
  const pad = 4;
  const [W, H] = [scene.width, scene.height];
  const [ox, oy] = scene.offset ?? [0, 0];
  const x0 = Math.max(-ox + 1, g.x0 - pad);
  const y0 = Math.max(-oy + 1, g.y0 - pad);
  const x1 = Math.min(W - ox - 1, g.x1 + pad);
  const y1 = Math.min(H - oy - 1, g.y1 + pad);
  const card = roundRect(x0, y0, x1 - x0, y1 - y0, 6);
  const paper = role("studio-paper");
  const fill = b.gradient({
    kind: "linear",
    units: "user",
    x1: x0,
    y1: y0,
    x2: x1,
    y2: y1,
    stops: [
      { offset: 0, color: lift(paper, 0.025) },
      { offset: 1, color: lift(paper, -0.02) },
    ],
  });
  const clip = b.clip(card);
  b.before(
    0,
    {
      kind: "card-shadow",
      d: card,
      fill: ground(),
      opacity: 0.45,
      transform: "translate(0 2)",
      filter: "blur4",
    },
    { kind: "card", d: card, fill },
    // The inner shadow: a wide soft edge inside the card, heavier along the top.
    {
      kind: "card-inner",
      d: card,
      stroke: ground(),
      strokeWidth: 7,
      opacity: 0.32,
      transform: "translate(0 1.5)",
      filter: "blur4",
      clip,
    }
  );
  scene.items.forEach((it, i) => {
    if (it.t === "path" && it.role === "grid")
      b.restyle(i, { stroke: fade(role("ink"), 20), strokeWidth: 0.75 });
  });
}

function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  const R = Math.min(r, w / 2, h / 2);
  return (
    `M${f2(x + R)} ${f2(y)} L${f2(x + w - R)} ${f2(y)} A${R} ${R} 0 0 1 ${f2(x + w)} ${f2(y + R)} ` +
    `L${f2(x + w)} ${f2(y + h - R)} A${R} ${R} 0 0 1 ${f2(x + w - R)} ${f2(y + h)} ` +
    `L${f2(x + R)} ${f2(y + h)} A${R} ${R} 0 0 1 ${f2(x)} ${f2(y + h - R)} ` +
    `L${f2(x)} ${f2(y + R)} A${R} ${R} 0 0 1 ${f2(x + R)} ${f2(y)} Z`
  );
}

/** Coordinate planes: the card, curves with a soft lift, regions as translucent gradients. */
export function planeStudio(spec: FigureSpec, scene: Scene, b: LayerBuilder) {
  gridCard(scene, b);
  const curves = new Set(
    spec.parts.filter((p) => p.kind === "function" || p.kind === "circle").map((p) => p.id)
  );
  const region = b.gradient({
    id: "region",
    kind: "linear",
    units: "box",
    x1: 0,
    y1: 0,
    x2: 0.35,
    y2: 1,
    stops: [
      { offset: 0, color: role("highlight"), opacity: 0.26 },
      { offset: 1, color: role("highlight"), opacity: 0.1 },
    ],
  });
  commonStudio(scene, b);
  scene.items.forEach((it, i) => {
    if (it.t !== "path") return;
    if (it.stroke === false && it.fill) b.restyle(i, { fill: region });
    else if (it.partId && curves.has(it.partId) && !dotOf(it.d)) b.restyle(i, { filter: "glow" });
  });
}

// ---------------------------------------------------------------- charts

/** The lit faces of a box extruded back to the right: top and side, painted from `base`. */
function extrusion(r: Rect, base: string, depth: number, kind: string): StudioShape[] {
  const [dx, dy] = depthOf(r, depth);
  const { x, y, width: w, height: h } = r;
  const edge = fade(role("ink"), 55);
  return [
    {
      kind: `${kind}-top`,
      d: polyPath([
        [x, y],
        [x + w, y],
        [x + w + dx, y + dy],
        [x + dx, y + dy],
      ]),
      fill: lift(base, 0.13),
      stroke: edge,
      strokeWidth: 1,
    },
    {
      kind: `${kind}-side`,
      d: polyPath([
        [x + w, y],
        [x + w + dx, y + dy],
        [x + w + dx, y + h + dy],
        [x + w, y + h],
      ]),
      fill: lift(base, -0.12),
      stroke: edge,
      strokeWidth: 1,
    },
  ];
}

/** The front face of a bar: lit from the left. Its geometry is Bluebook's rect itself. */
function frontFace(b: LayerBuilder, base: string, key: string) {
  return b.gradient({
    id: `front-${key}`,
    kind: "linear",
    units: "box",
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 0.25,
    stops: [
      { offset: 0, color: lift(base, 0.06) },
      { offset: 1, color: lift(base, -0.05) },
    ],
  });
}

/** How far a bar's extrusion reaches back (right) and up. */
const BAR_DEPTH = 9;
const depthOf = (r: Rect, depth: number): Pt => {
  const dx = Math.min(depth, r.width * 0.2);
  return [dx, -dx * 0.72];
};

export function chartStudio(spec: FigureSpec, scene: Scene, b: LayerBuilder) {
  // The card holds the bars' extrusions too.
  const reach = scene.items.flatMap((it): Pt[] => {
    if (it.t !== "rect" || !it.fill || it.partId === "legend") return [];
    const [dx, dy] = depthOf(it, BAR_DEPTH);
    return [[it.x + it.width + dx, it.y + dy]];
  });
  gridCard(scene, b, reach);
  commonStudio(scene, b);
  const series = new Set(spec.parts.filter((p) => p.kind === "series").map((p) => p.id));
  const kindOf = new Map(
    spec.parts.flatMap((p) =>
      p.kind === "series" ? [[p.id, p.seriesKind ?? spec.type] as const] : []
    )
  );
  // The x-axis: the lowest level line of the grid or axes.
  const level = scene.items.flatMap((it) => {
    if (it.t !== "path" || (it.role !== "grid" && it.partId !== "axis")) return [];
    const pts = pathPoints(it.d);
    return pts.length === 2 && Math.abs(pts[0][1] - pts[1][1]) < 0.01 ? [pts[0][1]] : [];
  });
  const baseline = level.length ? Math.max(...level) : null;

  scene.items.forEach((it, i) => {
    if (
      it.t === "rect" &&
      it.fill &&
      (it.partId === "legend" || (it.partId && series.has(it.partId)))
    ) {
      const base = role(it.fill);
      const legend = it.partId === "legend";
      b.before(i, ...extrusion(it, base, legend ? 4 : BAR_DEPTH, legend ? "legend" : "bar"));
      b.restyle(i, { fill: frontFace(b, base, it.fill as Role) });
      return;
    }
    if (it.t === "rect" && !it.fill && it.partId && series.has(it.partId)) {
      // A box plot's box: a block of the solids' material with the same lit depth.
      const paper = role("studio-body");
      b.before(
        i,
        {
          kind: "box-shadow",
          d: polyPath([
            [it.x, it.y],
            [it.x + it.width, it.y],
            [it.x + it.width, it.y + it.height],
            [it.x, it.y + it.height],
          ]),
          fill: ground(),
          opacity: 0.5,
          transform: "translate(2 3)",
          filter: "blur4",
        },
        ...extrusion(it, paper, 7, "box")
      );
      b.restyle(i, { fill: frontFace(b, paper, "paper") });
      return;
    }
    if (
      it.t === "path" &&
      baseline !== null &&
      it.partId &&
      kindOf.get(it.partId) === "line" &&
      !dotOf(it.d) &&
      !it.fill
    ) {
      const pts = pathPoints(it.d);
      if (pts.length < 2) return;
      const area = polyPath([...pts, [pts[pts.length - 1][0], baseline], [pts[0][0], baseline]]);
      const top = Math.min(...pts.map((p) => p[1]));
      const fill = b.gradient({
        kind: "linear",
        units: "user",
        x1: 0,
        y1: top,
        x2: 0,
        y2: baseline,
        stops: [
          { offset: 0, color: role("highlight"), opacity: 0.22 },
          { offset: 1, color: role("highlight"), opacity: 0.02 },
        ],
      });
      b.before(i, { kind: "area", d: area, fill });
      b.restyle(i, { filter: "glow" });
    }
  });
}
