"use client";

// Solids and flat shapes (SolidFigure, ShapeFigure), re-exported by GeometryFigs.tsx. A solid is a
// clean line drawing: hidden edges dashed, faces a faint wash so it reads as an object, the radius a
// line from the center in amber, the height a dashed blue line, lengths on their edges. A flat shape
// has its sides labeled in order from the bottom edge, counterclockwise, and its area shaded amber or
// its perimeter traced in gold. Plain-number labels set the proportions (a 10 by 4 rectangle is drawn
// 10 by 4), within limits that keep the drawing readable.
import type { ReactNode } from "react";
import type { ShapeFigure, SolidFigure } from "@/lib/lessons/figures";
import s from "./figure.module.css";
import g from "./geometry.module.css";
import {
  add,
  besideSide,
  clamp,
  f,
  frame,
  halfHeight,
  halfWidth,
  Label,
  listing,
  mid,
  mul,
  path,
  plainNumber,
  pointsBox,
  rad,
  squarePath,
  sub,
  textBox,
  unit,
  viewBoxOf,
  type P,
  type Text,
} from "./geometryParts";

/** How round a circle seen from a little above looks (its height over its width). */
const ELLIPSE = 0.3;
/** Which way depth goes in a box or a pyramid's base: up and to the right. */
const DEPTH: P = [Math.cos(rad(35)), -Math.sin(rad(35))];

/** The first plain number among the labels. */
function num(...labels: (string | undefined)[]): number | null {
  for (const l of labels) {
    const n = plainNumber(l);
    if (n) return n;
  }
  return null;
}

/** x / y when both are numbers, kept within [lo, hi]; otherwise the fallback. */
const ratio = (x: number | null, y: number | null, fallback: number, lo: number, hi: number) =>
  x && y ? clamp(x / y, lo, hi) : fallback;

/** Half an ellipse around c, left to right: the front (lower) half or the back (upper) half. */
const halfEllipse = (c: P, rx: number, ry: number, front: boolean) =>
  `M${f(c[0] - rx)} ${f(c[1])} A${f(rx)} ${f(ry)} 0 0 ${front ? 0 : 1} ${f(c[0] + rx)} ${f(c[1])}`;

/** A drawing in the making: fills under everything, then lines, then labels, and its extent. */
interface Drawing {
  back: ReactNode[];
  lines: ReactNode[];
  texts: Text[];
  points: P[];
}

const blank = (): Drawing => ({ back: [], lines: [], texts: [], points: [] });

/** A radius from c to the right in amber (dashed when inside the solid), labeled above. */
function radius(d: Drawing, c: P, r: number, label: string, hidden = false) {
  const end = add(c, [r, 0]);
  d.lines.push(
    <path
      key="r"
      d={path([c, end], false)}
      className={`${hidden ? g.measure : g.edge} ${s.warm}`}
      data-draw={hidden ? undefined : true}
      data-pop={hidden ? true : undefined}
      data-at={2}
    />,
    <circle
      key="rc"
      cx={f(c[0])}
      cy={f(c[1])}
      r={2.8}
      className={`${s.dot} ${s.warm}`}
      data-pop
      data-at={2}
    />
  );
  d.texts.push({
    at: add(mid(c, end), [0, -(halfHeight() + 4)]),
    text: label,
    className: `${s.toneText} ${s.warm}`,
    step: 3,
  });
}

/** A height as a dashed blue line from top to foot, labeled on one side. */
function height(d: Drawing, top: P, foot: P, label: string, side: 1 | -1) {
  d.lines.push(
    <path
      key="h"
      d={path([top, foot], false)}
      className={`${g.measure} ${s.blue}`}
      data-pop
      data-at={2}
    />
  );
  d.texts.push({
    at: add(mid(top, foot), [side * (halfWidth(label) + 7), 0]),
    text: label,
    className: `${s.toneText} ${s.blue}`,
    step: 3,
  });
}

/** A length on the edge from a to b, on the side `away` points to. */
function edgeLabel(d: Drawing, a: P, b: P, away: P, label: string | undefined) {
  if (label)
    d.texts.push({ at: besideSide(a, b, away, label), text: label, className: s.label, step: 3 });
}

const face = (key: string, ps: P[], className: string) => (
  <path key={key} d={path(ps)} className={className} data-pop data-at={1} />
);
const edge = (key: string, d: string, at = 0) => (
  <path key={key} d={d} className={g.edge} data-draw data-at={at} />
);
const hiddenEdge = (key: string, d: string) => (
  <path key={key} d={d} className={g.hiddenEdge} data-pop data-at={1} />
);

// ---------------------------------------------------------------- solids

type SolidLabels = NonNullable<SolidFigure["labels"]>;

function cylinder(l: SolidLabels): Drawing {
  const d = blank();
  const k = ratio(num(l.h), num(l.r), 2, 0.5, 4);
  const r = Math.min(68, 160 / (k + 2 * ELLIPSE));
  const [ry, h] = [r * ELLIPSE, r * k];
  const [R, H, RY] = [f(r), f(h), f(ry)];
  d.back.push(
    <path
      key="body"
      d={`M-${R} 0 L-${R} ${H} A${R} ${RY} 0 0 0 ${R} ${H} L${R} 0 A${R} ${RY} 0 0 0 -${R} 0 Z`}
      className={g.face}
      data-pop
      data-at={1}
    />,
    <ellipse key="top" rx={R} ry={RY} className={g.faceLit} data-pop data-at={1} />
  );
  d.lines.push(
    <ellipse key="rim" rx={R} ry={RY} className={g.edge} data-draw data-at={0} />,
    edge("sides", `M-${R} 0 L-${R} ${H} A${R} ${RY} 0 0 0 ${R} ${H} L${R} 0`),
    hiddenEdge("back", halfEllipse([0, h], r, ry, false))
  );
  if (l.r) radius(d, [0, 0], r, l.r);
  if (l.h) height(d, [0, 0], [0, h], l.h, -1);
  d.points.push([-r, -ry], [r, h + ry]);
  return d;
}

function cone(l: SolidLabels): Drawing {
  const d = blank();
  const k = ratio(num(l.h), num(l.r), 1.9, 0.6, 4);
  const r = Math.min(68, 165 / (k + ELLIPSE));
  const [ry, h] = [r * ELLIPSE, r * k];
  const apex: P = [0, -h];
  d.back.push(
    <path
      key="body"
      d={`${path([[-r, 0], apex, [r, 0]], false)} A${f(r)} ${f(ry)} 0 0 1 ${f(-r)} 0 Z`}
      className={g.faceLit}
      data-pop
      data-at={1}
    />
  );
  d.lines.push(
    edge("sides", path([[-r, 0], apex, [r, 0]], false)),
    edge("front", halfEllipse([0, 0], r, ry, true)),
    hiddenEdge("back", halfEllipse([0, 0], r, ry, false))
  );
  if (l.r) radius(d, [0, 0], r, l.r, true);
  if (l.h) height(d, apex, [0, 0], l.h, -1);
  if (l.r && l.h)
    d.lines.push(
      <path
        key="sq"
        d={squarePath([0, 0], [0, -1], [1, 0], 7)}
        className={s.thin}
        data-pop
        data-at={2}
      />
    );
  edgeLabel(d, apex, [r, 0], [1, 0], l.l);
  d.points.push(apex, [-r, ry], [r, ry]);
  return d;
}

function sphere(l: SolidLabels): Drawing {
  const d = blank();
  const r = 76;
  d.back.push(<circle key="ball" r={r} className={g.faceLit} data-pop data-at={1} />);
  d.lines.push(
    <circle key="edge" r={r} className={g.edge} data-draw data-at={0} />,
    <path
      key="front"
      d={halfEllipse([0, 0], r, r * ELLIPSE, true)}
      className={s.thin}
      data-pop
      data-at={1}
    />,
    hiddenEdge("back", halfEllipse([0, 0], r, r * ELLIPSE, false))
  );
  if (l.r) radius(d, [0, 0], r, l.r);
  else d.lines.push(<circle key="c" r={2.8} className={s.dot} data-pop data-at={2} />);
  d.points.push([-r, -r], [r, r]);
  return d;
}

/** A box l wide, h tall and w deep (a cube when all three are 1), drawn with depth up and right. */
function box(l: SolidLabels, cube: boolean): Drawing {
  const d = blank();
  const nums = [num(l.l), num(l.w), num(l.h)];
  const all = nums.every((n) => n !== null);
  const big = all ? Math.max(...(nums as number[])) : 1;
  const [L, W, H] = cube
    ? [1, 1, 1]
    : all
      ? (nums as number[]).map((n) => clamp(n / big, 0.3, 1))
      : [1, 0.65, 0.65];
  const depth = mul(DEPTH, W * 0.6);
  const px = Math.min(170 / (L + depth[0]), 150 / (H - depth[1]));
  const [ftl, ftr, fbr, fbl]: P[] = [
    [0, 0],
    [L * px, 0],
    [L * px, H * px],
    [0, H * px],
  ];
  const back = (p: P) => add(p, mul(depth, px));
  const [btl, btr, bbr, bbl] = [ftl, ftr, fbr, fbl].map(back);
  d.back.push(
    face("front", [ftl, ftr, fbr, fbl], g.face),
    face("top", [ftl, ftr, btr, btl], g.faceLit),
    face("side", [ftr, btr, bbr, fbr], g.faceDim)
  );
  d.lines.push(
    edge("outline", path([fbl, fbr, bbr, btr, btl, ftl])),
    edge("inner", `${path([ftl, ftr, fbr], false)} ${path([ftr, btr], false)}`),
    hiddenEdge("hidden", [btl, bbr, fbl].map((p) => path([bbl, p], false)).join(" "))
  );
  if (cube) edgeLabel(d, fbl, fbr, [0, 1], l.s ?? l.l);
  else {
    edgeLabel(d, fbl, fbr, [0, 1], l.l);
    edgeLabel(d, fbr, bbr, [1, 0.6], l.w);
    edgeLabel(d, ftl, fbl, [-1, 0], l.h);
  }
  d.points.push(ftl, fbl, fbr, btr, bbr);
  return d;
}

function pyramid(l: SolidLabels): Drawing {
  const d = blank();
  const k = ratio(num(l.h), num(l.s, l.l), 0.95, 0.45, 2);
  const depth = mul(DEPTH, 0.5);
  const px = Math.min(170 / (1 + depth[0]), 160 / (k - depth[1] / 2));
  const [fl, fr]: P[] = [
    [0, 0],
    [px, 0],
  ];
  const [br, bl] = [add(fr, mul(depth, px)), add(fl, mul(depth, px))];
  const center = mid(fl, br);
  const apex = add(center, [0, -k * px]);
  d.back.push(face("front", [apex, fl, fr], g.faceLit), face("side", [apex, fr, br], g.faceDim));
  d.lines.push(
    edge("outline", path([fl, fr, br, apex])),
    edge("inner", path([apex, fr], false)),
    hiddenEdge("hidden", `${path([fl, bl, br], false)} ${path([apex, bl], false)}`)
  );
  if (l.h) {
    height(d, apex, center, l.h, 1);
    d.lines.push(
      <path
        key="sq"
        d={squarePath(center, [0, -1], [1, 0], 7)}
        className={s.thin}
        data-pop
        data-at={2}
      />
    );
  }
  edgeLabel(d, fl, fr, [0, 1], l.s ?? l.l);
  edgeLabel(d, fr, br, [1, 0.6], l.w);
  d.points.push(fl, fr, br, apex);
  return d;
}

const SOLIDS: Record<
  SolidFigure["shape"],
  { draw: (l: SolidLabels) => Drawing; name: string; says: [keyof SolidLabels, string][] }
> = {
  cylinder: {
    draw: cylinder,
    name: "cylinder",
    says: [
      ["r", "radius"],
      ["h", "height"],
    ],
  },
  cone: {
    draw: cone,
    name: "cone",
    says: [
      ["r", "radius"],
      ["h", "height"],
      ["l", "slant height"],
    ],
  },
  sphere: { draw: sphere, name: "sphere", says: [["r", "radius"]] },
  prism: {
    draw: (l) => box(l, false),
    name: "rectangular prism",
    says: [
      ["l", "length"],
      ["w", "width"],
      ["h", "height"],
    ],
  },
  pyramid: {
    draw: pyramid,
    name: "square pyramid",
    says: [
      ["s", "base side"],
      ["l", "base length"],
      ["w", "base width"],
      ["h", "height"],
    ],
  },
  cube: {
    draw: (l) => box(l, true),
    name: "cube",
    says: [
      ["s", "side"],
      ["l", "side"],
    ],
  },
};

export function SolidFig({ fig }: { fig: SolidFigure }) {
  const labels = fig.labels ?? {};
  const solid = SOLIDS[fig.shape];
  const d = solid.draw(labels);
  const view = frame([pointsBox(d.points), ...d.texts.map(textBox)]);
  const said = solid.says.filter(([k]) => labels[k]).map(([k, word]) => `${word} ${labels[k]}`);
  return (
    <svg
      className={s.fig}
      viewBox={viewBoxOf(view)}
      role="img"
      aria-label={`A ${solid.name}${said.length ? ` with ${listing(said)}` : ""}`}
    >
      {d.back}
      {d.lines}
      {d.texts.map((t, i) => (
        <Label key={`${i}${t.text}`} t={t} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- flat shapes

/** A flat shape in units (y down): corners counterclockwise from the bottom left, and its extras. */
interface Outline {
  corners: P[];
  /** A semicircle on top, in place of the side from the third corner to the fourth. */
  arch?: boolean;
  /** A round hole: its center and radius. */
  hole?: { c: P; r: number };
  /** Where the height drops, from a top point to its foot on the base. */
  drop?: [P, P];
  /** A dashed line splitting a composite shape into its simple ones. */
  split?: [P, P];
  ticks?: boolean;
}

function outline(shape: ShapeFigure["shape"], l: string[], hv: number | null): Outline {
  const n = l.map((x) => num(x));
  switch (shape) {
    case "square":
      return {
        corners: [
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ],
        ticks: true,
      };
    case "triangle": {
      // all three sides: placed exactly (SSS); else the base and height; else a plain shape
      let [x, y] = [0.38, ratio(hv, n[0], 0.62, 0.25, 1.4)];
      const [a, r, b] = [n[0], n[1], n[2]];
      if (a && r && b && a < r + b && r < a + b && b < a + r) {
        x = (a * a + b * b - r * r) / (2 * a * a);
        y = Math.sqrt(Math.max(0, (b * b) / (a * a) - x * x));
      }
      [x, y] = [clamp(x, -0.4, 1.4), clamp(y, 0.2, 1.6)];
      return {
        corners: [
          [0, y],
          [1, y],
          [x, 0],
        ],
        drop: [
          [x, 0],
          [x, y],
        ],
      };
    }
    case "parallelogram": {
      const h = ratio(hv, n[0], 0.55, 0.25, 1.2);
      const side = n[1] && n[0] ? n[1] / n[0] : 0;
      const o = clamp(side > h ? Math.sqrt(side * side - h * h) : 0.28, 0.12, 0.7);
      return {
        corners: [
          [0, h],
          [1, h],
          [1 + o, 0],
          [o, 0],
        ],
        drop: [
          [o, 0],
          [o, h],
        ],
      };
    }
    case "trapezoid": {
      const top = ratio(n[2], n[0], 0.55, 0.25, 1.6);
      const h = ratio(hv, n[0], 0.5, 0.25, 1.1);
      const x0 = (1 - top) / 2;
      const hx = x0 >= 0.08 ? x0 : Math.max(0, x0) + 0.15;
      return {
        corners: [
          [0, h],
          [1, h],
          [x0 + top, 0],
          [x0, 0],
        ],
        drop: [
          [hx, 0],
          [hx, h],
        ],
      };
    }
    case "l-shape": {
      // sides: bottom W, right a, inner W - t, inner H - a, top t, left H
      const W = n[0] ?? (n[2] && n[4] ? n[2] + n[4] : null) ?? 1.4;
      const H = n[5] ?? (n[1] && n[3] ? n[1] + n[3] : null) ?? 1.1;
      const t = clamp((n[4] ?? (n[2] ? W - n[2] : 0.36 * W)) / W, 0.2, 0.8);
      const a = clamp((n[1] ?? (n[3] ? H - n[3] : 0.45 * H)) / H, 0.2, 0.8);
      const h = clamp(H / W, 0.4, 1.3);
      return {
        corners: [
          [0, h],
          [1, h],
          [1, h - a * h],
          [t, h - a * h],
          [t, 0],
          [0, 0],
        ],
        split: [
          [t, h - a * h],
          [t, h],
        ],
      };
    }
    case "rect-with-semicircle": {
      const h = ratio(num(l[1], l[3]), n[0], 0.6, 0.25, 1.4);
      return {
        corners: [
          [0, 0.5 + h],
          [1, 0.5 + h],
          [1, 0.5],
          [0, 0.5],
        ],
        arch: true,
        split: [
          [0, 0.5],
          [1, 0.5],
        ],
      };
    }
    case "rect-minus-circle": {
      const h = ratio(num(l[1], l[3]), num(l[0], l[2]), 0.65, 0.3, 1.5);
      const most = 0.45 * Math.min(1, h);
      const r = n[4] && n[0] ? clamp(n[4] / n[0], 0.06, most) : 0.3 * Math.min(1, h);
      return {
        corners: [
          [0, h],
          [1, h],
          [1, 0],
          [0, 0],
        ],
        hole: { c: [0.5, h / 2], r },
      };
    }
    default: {
      const h = ratio(num(l[1], l[3]), num(l[0], l[2]), 0.6, 0.25, 1.6);
      return {
        corners: [
          [0, h],
          [1, h],
          [1, 0],
          [0, 0],
        ],
      };
    }
  }
}

const SHAPE_NAMES: Record<ShapeFigure["shape"], string> = {
  rectangle: "rectangle",
  square: "square",
  triangle: "triangle",
  parallelogram: "parallelogram",
  trapezoid: "trapezoid",
  "l-shape": "L-shaped figure",
  "rect-with-semicircle": "rectangle with a semicircle on top",
  "rect-minus-circle": "rectangle with a circle cut out of it",
};

/** A circle as a path (two half arcs), for the hole. */
const circlePath = ([cx, cy]: P, r: number) =>
  `M${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;

export function ShapeFig({ fig }: { fig: ShapeFigure }) {
  const labels = fig.labels ?? [];
  const o = outline(fig.shape, labels, plainNumber(fig.height));
  // fit within 180 by 140
  const unitPts = [...o.corners, ...(o.arch ? ([[0.5, 0]] as P[]) : [])];
  const [ux0, uy0, ux1, uy1] = pointsBox(unitPts);
  const px = Math.min(180 / (ux1 - ux0), 140 / (uy1 - uy0));
  const at = (p: P): P => mul(p, px);
  const c = o.corners.map(at);
  const d = blank();
  d.points.push(...unitPts.map(at));

  const boundary = o.arch
    ? `${path(c.slice(0, 3), false)} A${f(px / 2)} ${f(px / 2)} 0 0 0 ${f(c[3][0])} ${f(c[3][1])} Z`
    : path(c);
  const hole = o.hole ? { c: at(o.hole.c), r: o.hole.r * px } : null;
  const trace = fig.perimeter ? `${g.edge} ${g.trace} ${s.gold}` : g.edge;
  if (!fig.perimeter)
    d.back.push(
      <path
        key="area"
        d={hole ? `${boundary} ${circlePath(hole.c, hole.r)}` : boundary}
        fillRule="evenodd"
        className={`${s.area} ${s.warm}`}
        data-pop
        data-at={1}
      />
    );
  d.lines.push(<path key="edge" d={boundary} className={trace} data-draw data-at={0} />);
  if (hole)
    d.lines.push(
      <path key="hole" d={circlePath(hole.c, hole.r)} className={trace} data-draw data-at={0} />
    );
  if (o.split && !fig.perimeter)
    d.lines.push(
      <path
        key="split"
        d={path(o.split.map(at), false)}
        className={g.hiddenEdge}
        data-pop
        data-at={2}
      />
    );

  // side labels, from the bottom edge counterclockwise; outside is to the right of travel
  c.forEach((a, i) => {
    const b = c[(i + 1) % c.length];
    const label = labels[i];
    if (o.ticks) {
      const m = mid(a, b);
      const n = mul(unit([-(b[1] - a[1]), b[0] - a[0]]), 4);
      d.lines.push(
        <path
          key={`tick${i}`}
          d={path([sub(m, n), add(m, n)], false)}
          className={g.mark}
          data-pop
          data-at={2}
        />
      );
    }
    if (!label) return;
    if (o.arch && i === 2) {
      const top = at([0.5, 0]);
      d.texts.push({
        at: add(top, [0, -(6 + halfHeight())]),
        text: label,
        className: s.label,
        step: 3,
      });
    } else edgeLabel(d, a, b, [-(b[1] - a[1]), b[0] - a[0]], label);
  });
  if (hole && labels[4]) radius(d, hole.c, hole.r, labels[4]);

  if (o.drop && fig.height) {
    const [top, foot] = o.drop.map(at);
    const outside = top[0] < c[0][0] - 1 || top[0] > c[1][0] + 1;
    const side = top[0] < c[0][0] ? -1 : 1;
    height(d, top, foot, fig.height, side);
    const toward: P = side > 0 ? [-1, 0] : [1, 0];
    d.lines.push(
      <path
        key="sq"
        d={squarePath(foot, [0, -1], outside ? toward : [1, 0], 7)}
        className={s.thin}
        data-pop
        data-at={2}
      />
    );
    if (outside)
      d.lines.push(
        <path
          key="ext"
          d={path([side < 0 ? c[0] : c[1], foot], false)}
          className={g.hiddenEdge}
          data-pop
          data-at={2}
        />
      );
  }

  const view = frame([pointsBox(d.points), ...d.texts.map(textBox)]);
  const said = labels.filter(Boolean);
  const aria = [
    `A ${SHAPE_NAMES[fig.shape]}`,
    said.length ? `, sides marked ${listing(said)}` : "",
    fig.height ? `, height ${fig.height}` : "",
    fig.perimeter ? ", with its perimeter traced" : ", with its area shaded",
  ];
  return (
    <svg className={s.fig} viewBox={viewBoxOf(view)} role="img" aria-label={aria.join("")}>
      {d.back}
      {d.lines}
      {d.texts.map((t, i) => (
        <Label key={`${i}${t.text}`} t={t} />
      ))}
    </svg>
  );
}
