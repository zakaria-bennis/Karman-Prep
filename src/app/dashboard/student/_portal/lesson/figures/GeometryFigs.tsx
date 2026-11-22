"use client";

// Geometry pictures (TriangleFigure, AnglesFigure): a triangle drawn to scale from its three angles,
// with an optional trig view and a similar copy, and two parallel lines cut by a transversal with its
// eight numbered angles. Solids and flat shapes are in SolidFigs.tsx. Labels go where they clear the
// lines, and the viewBox grows to hold them, at least 240 wide so they keep their size on a phone.
import type { ReactNode } from "react";
import type { AnglesFigure, TriangleFigure } from "@/lib/lessons/figures";
import s from "./figure.module.css";
import g from "./geometry.module.css";
import {
  add,
  arcPath,
  besideSide,
  clamp,
  dist,
  dot,
  f,
  frame,
  halfHeight,
  halfWidth,
  inAngle,
  Label,
  listing,
  mid,
  mul,
  numberLabel,
  path,
  plainNumber,
  pointsBox,
  rad,
  squarePath,
  sub,
  textBox,
  unit,
  viewBoxOf,
  type Box,
  type P,
  type Text,
} from "./geometryParts";

export { ShapeFig, SolidFig } from "./SolidFigs";

// ---------------------------------------------------------------- triangle

/** The trig tags, in order: the side opposite the corner, the one beside it, the hypotenuse. */
const ROLES = [
  ["opposite", s.warm],
  ["adjacent", s.blue],
  ["hypotenuse", s.gold],
] as const;

const isRight = (deg: number) => Math.abs(deg - 90) < 0.5;

/** A triangle's corners for these angles: A at the origin, B one unit to the right, C above. With
 *  side c = 1, the law of sines makes side b (CA) = sin B / sin C. */
function unitTriangle(deg: number[]): P[] {
  const b = Math.sin(rad(deg[1])) / Math.sin(rad(deg[2]));
  return [
    [0, 0],
    [1, 0],
    [b * Math.cos(rad(deg[0])), -b * Math.sin(rad(deg[0]))],
  ];
}

/** The angles made safe: each above 0, the three summing to 180. */
function cleanAngles(deg: number[]): number[] {
  const safe = deg.map((a) => (Number.isFinite(a) && a > 0 ? a : 1));
  const sum = safe[0] + safe[1] + safe[2];
  return safe.map((a) => (a * 180) / sum);
}

/** A side label carried to the similar copy: a plain number times the factor, anything else primed. */
function scaledLabel(label: string, k: number): string {
  const n = plainNumber(label);
  return n !== null ? numberLabel(n * k) : label ? `${label}′` : "";
}

/** A trig tag written along the side from a to b, just inside the triangle (upright). */
function Tag({ a, b, inside, text, tone }: { a: P; b: P; inside: P; text: string; tone: string }) {
  const size = clamp((dist(a, b) * 0.8) / (text.length * 0.6), 10, 12);
  const d = unit(sub(b, a));
  let deg = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  else if (deg <= -90) deg += 180;
  const m = mid(a, b);
  const n: P = [-d[1], d[0]];
  const at = add(m, mul(n, (dot(n, sub(inside, m)) >= 0 ? 1 : -1) * (4 + halfHeight(size))));
  // the rotation sits on the group, so the pop-in's transform never clears it
  return (
    <g transform={`translate(${f(at[0])} ${f(at[1])}) rotate(${f(deg)})`}>
      <text
        y={f(size * 0.36)}
        className={`${g.tag} ${tone}`}
        style={{ fontSize: size }}
        textAnchor="middle"
        data-pop
        data-at={5}
      >
        {text}
      </text>
    </g>
  );
}

interface OneTriangle {
  v: P[];
  deg: number[];
  names: string[];
  sides: string[];
  angleLabels: string[];
  highlight: number[];
  outlineAt: number;
  from?: number;
}

/** One triangle: its outline, lit sides, corner marks, labels and (from a corner) its trig tags. */
function drawTriangle(t: OneTriangle, key: string) {
  const { v, deg } = t;
  const center = mul(add(add(v[0], v[1]), v[2]), 1 / 3);
  const back: ReactNode[] = [];
  const marks: ReactNode[] = [];
  const texts: Text[] = [];
  for (let i = 0; i < 3; i++) {
    const [j, k] = [(i + 1) % 3, (i + 2) % 3];
    const [u1, u2] = [unit(sub(v[j], v[i])), unit(sub(v[k], v[i]))];
    const right = isRight(deg[i]);
    const arc = right ? 14 : clamp(14 * Math.sqrt(60 / deg[i]), 12, 26);
    if (right)
      marks.push(
        <path key={`q${i}`} d={squarePath(v[i], u1, u2)} className={s.thin} data-pop data-at={3} />
      );
    else if (t.from === i)
      back.push(
        <path
          key={`w${i}`}
          d={arcPath(v[i], u1, u2, arc, true)}
          className={g.angle}
          data-pop
          data-at={3}
        />
      );
    else if (t.angleLabels[i])
      marks.push(
        <path
          key={`a${i}`}
          d={arcPath(v[i], u1, u2, arc)}
          className={s.thin}
          data-pop
          data-at={3}
        />
      );
    const name = t.names[i];
    if (name) {
      const out = unit(mul(add(u1, u2), -1));
      const reach = halfWidth(name) * Math.abs(out[0]) + halfHeight() * Math.abs(out[1]);
      texts.push({ at: add(v[i], mul(out, 6 + reach)), text: name, className: s.label, step: 4 });
    }
    const side = t.sides[i];
    if (side) {
      const at = besideSide(v[j], v[k], sub(mid(v[j], v[k]), center), side);
      texts.push({ at, text: side, className: s.label, step: 4 });
    }
    const angle = t.angleLabels[i];
    if (angle)
      texts.push({
        at: inAngle(v[i], u1, u2, angle, arc),
        text: angle,
        className: s.label,
        step: 4,
      });
  }
  for (const i of t.highlight)
    marks.push(
      <path
        key={`h${i}`}
        d={path([v[(i + 1) % 3], v[(i + 2) % 3]], false)}
        className={`${g.edge} ${g.heavy} ${s.warm}`}
        data-draw
        data-at={2}
      />
    );
  const hyp = deg.findIndex(isRight);
  if (t.from !== undefined && hyp >= 0 && hyp !== t.from) {
    const sides = [t.from, 3 - t.from - hyp, hyp];
    sides.forEach((side, r) =>
      marks.push(
        <Tag
          key={`t${r}`}
          a={v[(side + 1) % 3]}
          b={v[(side + 2) % 3]}
          inside={center}
          text={ROLES[r][0]}
          tone={ROLES[r][1]}
        />
      )
    );
  }
  return {
    texts,
    node: (
      <g key={key}>
        {back}
        <path d={path(v)} className={g.edge} data-draw data-at={t.outlineAt} />
        {marks}
      </g>
    ),
  };
}

export function TriangleFig({ fig }: { fig: TriangleFigure }) {
  const deg = cleanAngles(fig.angles);
  const names = fig.corners ?? ["A", "B", "C"];
  const sides = fig.sides ?? ["", "", ""];
  const angleLabels = fig.angleLabels ?? ["", "", ""];
  const highlight = (fig.highlight ?? []).filter((i) => i >= 0 && i <= 2);
  const k = fig.similar && fig.similar > 0 ? clamp(fig.similar, 0.25, 4) : 0;

  const base = unitTriangle(deg);
  const [x0, x1] = [Math.min(...base.map((p) => p[0])), Math.max(...base.map((p) => p[0]))];
  const w = x1 - x0;
  const h = -Math.min(...base.map((p) => p[1]));
  // pixels per unit: one triangle fills the picture; a pair shares it, the copy scaled by k
  const px = k
    ? Math.min(150 / (w * (1 + k)), 140 / (h * Math.max(1, k)))
    : Math.min(184 / w, 168 / h);
  const v1 = base.map((p) => mul(p, px));
  const first = drawTriangle(
    { v: v1, deg, names, sides, angleLabels, highlight, outlineAt: 0, from: fig.from },
    "first"
  );
  const shift: P = [x1 * px + 40 - x0 * px * k, 0];
  const v2 = base.map((p) => add(mul(p, px * k), shift));
  const second = k
    ? drawTriangle(
        {
          v: v2,
          deg,
          names: names.map((n) => (n ? `${n}′` : "")),
          sides: sides.map((l) => scaledLabel(l, k)),
          angleLabels,
          highlight,
          outlineAt: 1,
        },
        "second"
      )
    : null;

  const texts = [...first.texts, ...(second?.texts ?? [])];
  const view = frame([pointsBox(k ? [...v1, ...v2] : v1), ...texts.map(textBox)]);
  const shown = (l: string[]) => l.filter(Boolean);
  const aria = [
    `Triangle ${names.join("")} with angles of ${listing(deg.map((a) => `${numberLabel(Math.round(a * 10) / 10)}°`))}`,
    shown(sides).length ? `sides marked ${listing(shown(sides))}` : "",
    fig.from !== undefined ? `seen from corner ${names[fig.from]}` : "",
    k ? `beside a similar triangle scaled by ${numberLabel(k)}` : "",
  ];
  return (
    <svg
      className={s.fig}
      viewBox={viewBoxOf(view)}
      role="img"
      aria-label={aria.filter(Boolean).join(", ")}
    >
      {first.node}
      {second?.node}
      {texts.map((t, i) => (
        <Label key={`${i}${t.text}`} t={t} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- parallel lines and a transversal

type AngleNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
const ANGLES: AngleNo[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** A ">" on a parallel line, pointing right. */
const chevron = ([x, y]: P) =>
  path(
    [
      [x - 3, y - 4.5],
      [x + 3, y],
      [x - 3, y + 4.5],
    ],
    false
  );

export function AnglesFig({ fig }: { fig: AnglesFigure }) {
  const tilt = clamp(fig.tilt, 20, 89);
  const named = fig.labels;
  // with no labels given, the angles show their numbers, smaller
  const size = named ? 14 : 12;
  const labelOf = (n: AngleNo) => (named ? (named[n] ?? "") : String(n));
  const lit = ANGLES.filter((n) => fig.highlight?.includes(n));
  const up: P = [Math.cos(rad(tilt)), -Math.sin(rad(tilt))];
  const down = mul(up, -1);
  const [right, left]: P[] = [
    [1, 0],
    [-1, 0],
  ];
  /** The rays around angle n at its crossing: top-left, top-right, bottom-right, bottom-left. */
  const rays = (n: AngleNo): [P, P] =>
    (
      [
        [up, left],
        [right, up],
        [down, right],
        [left, down],
      ] as [P, P][]
    )[(n - 1) % 4];
  const acute = (n: AngleNo) => n % 2 === 0;
  const tone = (n: AngleNo) => (acute(n) ? s.warm : s.blue);
  const wedgeR = (n: AngleNo) => (acute(n) ? clamp(14 * Math.sqrt(60 / tilt), 14, 24) : 13);
  /** Where angle n's label sits, from its crossing. */
  const spot = (n: AngleNo) =>
    inAngle([0, 0], ...rays(n), labelOf(n), lit.includes(n) ? wedgeR(n) : 5, size);
  const shown = ANGLES.filter((n) => labelOf(n));

  // the transversal reaches past the labels above the top line and below the bottom one
  const along = (n: AngleNo, ray: P) =>
    dot(spot(n), ray) +
    halfWidth(labelOf(n), size) * Math.abs(ray[0]) +
    halfHeight(size) * Math.abs(ray[1]) +
    8;
  const ext = Math.max(
    46,
    ...shown.filter((n) => n <= 2).map((n) => along(n, up)),
    ...shown.filter((n) => n >= 7).map((n) => along(n, down))
  );
  // how far the labels reach right of the top crossing and left of the bottom one
  const reach = (ns: AngleNo[], dir: 1 | -1) =>
    Math.max(
      ext * Math.cos(rad(tilt)),
      ...ns.filter((n) => labelOf(n)).map((n) => dir * spot(n)[0] + halfWidth(labelOf(n), size))
    );
  // the lines sit as far apart as fits in 240 wide (closer for a shallow transversal)
  const room = 224 - reach([1, 2, 3, 4], 1) - reach([5, 6, 7, 8], -1);
  const gap = clamp(room * Math.tan(rad(tilt)), 40, 76);
  const dx = gap / Math.tan(rad(tilt));
  const top: P = [dx / 2, 0];
  const bottom: P = [-dx / 2, gap];
  const crossing = (n: AngleNo) => (n <= 4 ? top : bottom);
  const ends = [add(bottom, mul(down, ext)), add(top, mul(up, ext))];

  const texts: Text[] = shown.map((n) => ({
    at: add(crossing(n), spot(n)),
    text: labelOf(n),
    className: lit.includes(n)
      ? `${s.toneText} ${tone(n)}`
      : named
        ? s.label
        : `${s.label} ${s.small}`,
    step: 3,
    size,
  }));
  const wedges: Box[] = lit.map((n) => {
    const [cx, cy] = crossing(n);
    const r = wedgeR(n);
    return [cx - r, cy - r, cx + r, cy + r];
  });
  const view = frame([pointsBox([...ends, top, bottom]), ...texts.map(textBox), ...wedges]);
  const [vx0, , vx1] = view;

  const said = named ? ANGLES.filter((n) => named[n]).map((n) => `angle ${n} is ${named[n]}`) : [];
  const aria = [
    `Two parallel lines cut by a transversal at ${numberLabel(tilt)}°`,
    said.join(", "),
    lit.length === 1 ? `angle ${lit[0]} is marked` : "",
    lit.length > 1 ? `angles ${listing(lit.map(String))} are marked` : "",
  ];
  return (
    <svg
      className={s.fig}
      viewBox={viewBoxOf(view)}
      role="img"
      aria-label={aria.filter(Boolean).join("; ")}
    >
      {lit.map((n) => (
        <path
          key={n}
          d={arcPath(crossing(n), ...rays(n), wedgeR(n), true)}
          className={`${g.wedge} ${tone(n)}`}
          data-pop
          data-at={2}
        />
      ))}
      {[0, gap].map((y) => (
        <path
          key={y}
          d={path(
            [
              [vx0 + 4, y],
              [vx1 - 4, y],
            ],
            false
          )}
          className={g.edge}
          data-draw
          data-at={0}
        />
      ))}
      <path d={path(ends, false)} className={g.edge} data-draw data-at={1} />
      <path d={chevron([vx0 + 26, 0])} className={g.mark} data-pop data-at={2} />
      <path d={chevron([vx1 - 26, gap])} className={g.mark} data-pop data-at={2} />
      {texts.map((t) => (
        <Label key={t.text + t.at.join()} t={t} />
      ))}
    </svg>
  );
}
