/*
 * Shared helpers for the geometry skills written on 2026-11-22 (right triangles, trigonometric
 * ratios, circles, circle equations, radians): exact answers and slips, Pythagorean triples,
 * triangle names, exact values of the special angles, and the right-triangle and circle figures.
 */
import type { FigureSpec, Label, Mark, Part } from "@/lib/figures/engine/spec";
import { geometry, point } from "../core/figures";
import { F, Frac, gcd } from "../core/frac";
import { S, Sym } from "../core/sym";
import { m, num, sym } from "../core/tex";
import type { Answer, Slip } from "../core/types";

export type Triple = readonly [number, number, number];

/** Primitive Pythagorean triples (a < b < c) with c up to 400, smallest first. */
export const TRIPLES: readonly Triple[] = (() => {
  const out: Triple[] = [];
  for (let p = 2; p < 20; p++)
    for (let q = 1; q < p; q++) {
      if ((p - q) % 2 === 0 || gcd(p, q) !== 1) continue;
      const a = p * p - q * q;
      const b = 2 * p * q;
      const c = p * p + q * q;
      if (c <= 400) out.push(a < b ? [a, b, c] : [b, a, c]);
    }
  return out.sort((x, y) => x[2] - y[2] || x[0] - y[0]);
})();

export const triples = (minC: number, maxC: number) =>
  TRIPLES.filter((t) => t[2] >= minC && t[2] <= maxC);

export const TRIANGLE_NAMES: readonly (readonly [string, string, string])[] = [
  ["A", "B", "C"],
  ["P", "Q", "R"],
  ["R", "S", "T"],
  ["D", "E", "F"],
  ["J", "K", "L"],
  ["X", "Y", "Z"],
  ["L", "M", "N"],
  ["F", "G", "H"],
  ["U", "V", "W"],
];

export const symAnswer = (v: Sym): Answer => ({ text: m(sym(v)), value: v });
export const ratAnswer = (q: Frac | number): Answer => symAnswer(Sym.rat(F(q)));
export const symSlip = (v: Sym, why: string): Slip => ({ text: m(sym(v)), value: v, why });
export const ratSlip = (q: Frac | number, why: string): Slip => symSlip(Sym.rat(F(q)), why);
export const keySlip = (key: string, text: string, why: string): Slip => ({ key, text, why });
export const sq = (v: Sym) => v.mul(v);
export const pos = (v: Sym) => v.toNumber() > 0;
export const ratOf = (a: Answer): Frac | null => a.value?.asRat() ?? null;
/** The exact value of a candidate, compared numerically with a computed number. */
export const near = (a: Answer, x: number) =>
  !!a.value && Math.abs(a.value.toNumber() - x) <= 1e-9 * Math.max(1, Math.abs(x));

/** sqrt(q) for a rational q >= 0, exactly. */
export function sqrtQ(q: Frac | number): Sym {
  const f = F(q);
  if (f.n < 0) throw new RangeError("square root of a negative");
  return S.root(f.n * f.d, F(1, f.d));
}

/** A degree measure in LaTeX: 40^\circ. */
export const deg = (d: number | Frac) => `${num(d)}^\\circ`;

/** Exact sine and cosine of a whole multiple of 30 or 45 degrees. */
export function exactSinCos(degrees: number): { sin: Sym; cos: Sym } {
  const d = ((degrees % 360) + 360) % 360;
  const ref = d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
  const base: Record<number, [Sym, Sym]> = {
    0: [S.rat(0), S.rat(1)],
    30: [S.rat(F(1, 2)), S.root(3, F(1, 2))],
    45: [S.root(2, F(1, 2)), S.root(2, F(1, 2))],
    60: [S.root(3, F(1, 2)), S.rat(F(1, 2))],
    90: [S.rat(1), S.rat(0)],
  };
  const pair = base[ref];
  if (!pair) throw new RangeError(`no exact value for ${degrees} degrees`);
  const sSign = d > 180 ? -1 : 1;
  const cSign = d > 90 && d < 270 ? -1 : 1;
  return { sin: pair[0].mul(sSign), cos: pair[1].mul(cSign) };
}

/** Exact tangent of a whole multiple of 30 or 45 degrees (not 90 or 270). */
export function exactTan(degrees: number): Sym {
  const d = ((degrees % 360) + 360) % 360;
  const ref = d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
  const base: Record<number, Sym> = {
    0: S.rat(0),
    30: S.root(3, F(1, 3)),
    45: S.rat(1),
    60: S.root(3),
  };
  const t = base[ref];
  if (!t) throw new RangeError(`no tangent for ${degrees} degrees`);
  const sign = (d > 90 && d < 180) || d > 270 ? -1 : 1;
  return t.mul(sign);
}

/** A length as a figure label prints it: 12, 5√2, √58. */
export function plain(v: Sym | number): string {
  const s = typeof v === "number" ? Sym.rat(v) : v;
  const parts = s.entries();
  if (parts.length !== 1 || parts[0][0].pi !== 0 || !parts[0][1].isInt()) {
    throw new RangeError("figure labels take whole numbers or k√m only");
  }
  const [[atom, coef]] = parts;
  if (atom.rad === 1) return String(coef.n);
  return `${coef.n === 1 ? "" : coef.n}√${atom.rad}`;
}

export interface RightTriangleFig {
  /** The right-angle vertex, the vertex at the end of the horizontal leg, the one at the end of the vertical leg. */
  names: readonly [string, string, string];
  /** Horizontal and vertical leg lengths, any unit: drawn in proportion, kept readable. */
  legs: readonly [number, number];
  /** Right angle at the lower left (true) or lower right (false). */
  left: boolean;
  side?: { horiz?: string; vert?: string; hyp?: string };
  angle?: { horiz?: string; vert?: string };
  showNames?: boolean;
  ticks?: boolean;
}

/** A right triangle with legs along the page, the right angle marked. */
export function rightTriangle(o: RightTriangleFig): FigureSpec {
  const [r, h, v] = o.names;
  const ratio = Math.min(1.5, Math.max(0.45, o.legs[1] / o.legs[0]));
  const [W, H] = ratio <= 1 ? [240, 240 * ratio] : [200 / ratio, 200];
  const R: [number, number] = o.left ? [0, H] : [W, H];
  const Hp: [number, number] = o.left ? [W, H] : [0, H];
  const V: [number, number] = o.left ? [0, 0] : [W, 0];
  const parts: Part[] = [
    point(r, ...R),
    point(h, ...Hp),
    point(v, ...V),
    { kind: "polygon", id: "tri", points: [v, r, h] },
    { kind: "segment", id: "sh", from: r, to: h },
    { kind: "segment", id: "sv", from: r, to: v },
    { kind: "segment", id: "sc", from: h, to: v },
    { kind: "angle", id: "ar", vertex: r, from: h, to: v },
  ];
  const labels: Label[] = [];
  if (o.showNames !== false) for (const id of [r, h, v]) labels.push({ text: id, on: id });
  if (o.side?.horiz) labels.push({ text: o.side.horiz, on: "sh" });
  if (o.side?.vert) labels.push({ text: o.side.vert, on: "sv" });
  if (o.side?.hyp) labels.push({ text: o.side.hyp, on: "sc" });
  if (o.angle?.horiz) {
    parts.push({ kind: "angle", id: "ah", vertex: h, from: r, to: v });
    labels.push({ text: o.angle.horiz, on: "ah" });
  }
  if (o.angle?.vert) {
    parts.push({ kind: "angle", id: "av", vertex: v, from: r, to: h });
    labels.push({ text: o.angle.vert, on: "av" });
  }
  const marks: Mark[] = [{ kind: "right_angle", on: ["ar"] }];
  if (o.ticks) marks.push({ kind: "equal_ticks", on: ["sh", "sv"] });
  return geometry(parts, labels, marks);
}

/** A point on a circle about (cx, cy), `degrees` counterclockwise from the right as seen on the page. */
export function onCircle(cx: number, cy: number, r: number, degrees: number): [number, number] {
  const t = (degrees * Math.PI) / 180;
  return [cx + r * Math.cos(t), cy - r * Math.sin(t)];
}

/** Angle AVB in degrees from coordinates (an independent route for checks). */
export function angleAt(v: [number, number], a: [number, number], b: [number, number]): number {
  const u = [a[0] - v[0], a[1] - v[1]];
  const w = [b[0] - v[0], b[1] - v[1]];
  const c = (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/** Every Pythagorean triple (primitive or a multiple) with hypotenuse from minC to maxC. */
export function scaledTriples(
  minC: number,
  maxC: number
): { t: Triple; base: Triple; k: number }[] {
  const out: { t: Triple; base: Triple; k: number }[] = [];
  for (const base of TRIPLES)
    for (let k = 1; base[2] * k <= maxC; k++)
      if (base[2] * k >= minC) out.push({ t: [base[0] * k, base[1] * k, base[2] * k], base, k });
  return out;
}

/** Three vertex names in a random order (the first is usually the right angle). */
export const shuffledNames = (rng: {
  shuffle<T>(x: readonly T[]): T[];
  pick<T>(x: readonly T[]): T;
}) => rng.shuffle(rng.pick(TRIANGLE_NAMES)) as unknown as readonly [string, string, string];
