/*
 * Shared helpers for four geometry skills (area and perimeter, volume and surface area, lines
 * and angles, triangles): exact answers and named slips, degree marks, small builders for
 * figures in the figure engine's format, and the name and unit pools the templates draw from.
 */
import type { Label, Mark, Part } from "@/lib/figures/engine/spec";
import { numAnswer } from "../core/build";
import { point } from "../core/figures";
import { F, Frac } from "../core/frac";
import type { Rng } from "../core/rng";
import { Sym } from "../core/sym";
import { m, num, sym } from "../core/tex";
import type { Answer, Draft, Format, Slip } from "../core/types";

export type { Rng };

export type Q = Frac | number;

/** A candidate's rational value, or null when it is not a rational number. */
export const valueOf = (a: Answer): Frac | null => a.value?.asRat() ?? null;

/** A rational answer, printed as the SAT prints it (thousands with commas). */
export const ratAnswer = (value: Q): Answer => numAnswer(F(value), m(num(F(value))));

/** An exact answer with roots or pi kept symbolic. */
export const symAnswer = (value: Sym): Answer => numAnswer(value, m(sym(value)));

/** A wrong rational answer and the slip that gives it. */
export function numSlip(value: Q, why: string): Slip {
  const q = F(value);
  return { text: m(num(q)), value: Sym.rat(q), why };
}

/** A wrong exact answer (roots or pi) and the slip that gives it. */
export function symSlip(value: Sym, why: string): Slip {
  return { text: m(sym(value)), value, why };
}

/** A statement answer (a sentence or an inequality), compared by its key. */
export const keyAnswer = (key: string, text: string): Answer => ({ key, text });
export const keySlip = (key: string, text: string, why: string): Slip => ({ key, text, why });

/** Degrees in LaTeX: 40^\circ, (3x + 10)^\circ. */
export const deg = (body: Q | string) => `${typeof body === "string" ? body : num(body)}^\\circ`;

/** Degrees in a figure label: 40°, x°, (3x − 10)°. */
export const degLabel = (body: string | number) => `${String(body).replace(/-/g, "−")}°`;

/** A number as a figure label: 12, 7.5. */
export const figNum = (value: Q) => {
  const q = F(value);
  return q.isInt() ? String(q.n) : q.toDecimal();
};

// ---------------------------------------------------------------- figure parts

export const pt = (id: string, x: number, y: number, on?: string[]): Part => point(id, x, y, on);

export const seg = (id: string, from: string, to: string): Part => ({
  kind: "segment",
  id,
  from,
  to,
});

/** A line through two points; `arrows` false draws it without arrowheads. */
export const lineThrough = (id: string, from: string, to: string, arrows = true): Part =>
  arrows ? { kind: "line", id, from, to } : { kind: "line", id, from, to, arrows: false };

export const polygon = (id: string, points: string[]): Part => ({ kind: "polygon", id, points });

export const angle = (id: string, vertex: string, from: string, to: string): Part => ({
  kind: "angle",
  id,
  vertex,
  from,
  to,
});

export const label = (text: string, on: string, at?: Label["at"]): Label =>
  at ? { text, on, at } : { text, on };

export const rightMark = (...on: string[]): Mark => ({ kind: "right_angle", on });

export const tickMark = (on: string[], count?: 1 | 2 | 3): Mark =>
  count ? { kind: "equal_ticks", on, count } : { kind: "equal_ticks", on };

export const dashedMark = (...on: string[]): Mark => ({ kind: "hidden_dashed", on });

export const parallelMark = (on: string[], count?: 1 | 2 | 3): Mark =>
  count ? { kind: "parallel", on, count } : { kind: "parallel", on };

// ---------------------------------------------------------------- names and units

export interface Unit {
  /** "centimeters" */
  many: string;
  /** "centimeter" */
  one: string;
}

export const UNITS: readonly Unit[] = [
  { many: "centimeters", one: "centimeter" },
  { many: "inches", one: "inch" },
  { many: "feet", one: "foot" },
  { many: "meters", one: "meter" },
  { many: "yards", one: "yard" },
  { many: "millimeters", one: "millimeter" },
  { many: "units", one: "unit" },
];

export const unitNamed = (many: string): Unit => UNITS.find((u) => u.many === many) ?? UNITS[0];

/** Rectangular things people measure, with units that suit each. */
export const RECT_OBJECTS: readonly { noun: string; units: readonly string[] }[] = [
  { noun: "garden", units: ["feet", "meters", "yards"] },
  { noun: "rug", units: ["feet", "inches"] },
  { noun: "poster", units: ["inches", "centimeters"] },
  { noun: "patio", units: ["feet", "meters"] },
  { noun: "tile", units: ["centimeters", "inches"] },
  { noun: "banner", units: ["inches", "feet"] },
  { noun: "field", units: ["meters", "yards"] },
  { noun: "tabletop", units: ["inches", "centimeters"] },
  { noun: "window", units: ["inches", "centimeters"] },
  { noun: "parking lot", units: ["meters", "feet"] },
  { noun: "classroom floor", units: ["feet", "meters"] },
  { noun: "photograph", units: ["inches", "centimeters"] },
];

/** Three vertex names for a triangle. */
export const TRIANGLE_NAMES: readonly (readonly [string, string, string])[] = [
  ["A", "B", "C"],
  ["P", "Q", "R"],
  ["D", "E", "F"],
  ["J", "K", "L"],
  ["R", "S", "T"],
  ["X", "Y", "Z"],
  ["F", "G", "H"],
  ["L", "M", "N"],
  ["K", "L", "M"],
  ["U", "V", "W"],
];

/** Two triangles whose vertices correspond in order. */
export const TRIANGLE_PAIRS: readonly (readonly [string, string])[] = [
  ["ABC", "DEF"],
  ["ABC", "XYZ"],
  ["PQR", "STU"],
  ["JKL", "MNP"],
  ["RST", "UVW"],
  ["DEF", "GHJ"],
  ["FGH", "KLM"],
  ["LMN", "PQR"],
];

/** Names for a pair of similar figures. */
export const RECT_PAIRS: readonly (readonly [string, string])[] = [
  ["ABCD", "EFGH"],
  ["PQRS", "WXYZ"],
  ["JKLM", "NPQR"],
  ["ABCD", "PQRS"],
  ["EFGH", "STUV"],
];

/** Line names for two parallel lines and a transversal, as the SAT letters them. */
export const LINE_NAMES: readonly (readonly [string, string, string])[] = [
  ["p", "r", "t"],
  ["j", "k", "t"],
  ["m", "n", "t"],
  ["ℓ", "m", "k"],
  ["r", "s", "t"],
  ["a", "b", "c"],
  ["g", "h", "ℓ"],
  ["q", "r", "s"],
  ["ℓ", "k", "t"],
  ["m", "n", "p"],
];

/** A line name as LaTeX: \ell for ℓ. */
export const lineTex = (name: string) => (name === "ℓ" ? "\\ell" : name);

/** Letters for unknown angle measures. */
export const ANGLE_VARS = ["x", "y", "w", "z", "a", "b", "k", "n", "t", "p"] as const;

/** A Pythagorean triple (legs a < b, hypotenuse c), scaled by a small whole number. */
export function triple(rng: Rng, maxC = 60): [number, number, number] {
  const base = rng.pick([
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
    [7, 24, 25],
    [20, 21, 29],
    [9, 40, 41],
  ] as const);
  const kMax = Math.max(1, Math.floor(maxC / base[2]));
  const k = rng.int(1, kMax);
  return [base[0] * k, base[1] * k, base[2] * k];
}

/** A whole number with {,} commas, as prose math: $1{,}250$. */
export const mn = (value: Q) => m(num(value));

/** A nonnegative terminating number for prose, as the SAT prints it: 8,000 or 7.5. */
export function pn(value: Q): string {
  const q = F(value);
  if (q.n < 0) throw new RangeError("pn is for nonnegative numbers");
  const [whole, frac] = (q.isInt() ? String(q.n) : q.toDecimal()).split(".");
  const head = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${head}.${frac}` : head;
}

/** pi times a rational coefficient. */
export const pi = (coef: Q) => Sym.pi(F(coef));

/** The exact area of a polygon from its vertices in order (the shoelace formula). */
export function shoelace(points: readonly (readonly [Q, Q])[]): Frac {
  let twice = F(0);
  points.forEach(([x, y], i) => {
    const [x2, y2] = points[(i + 1) % points.length];
    twice = twice.add(
      F(x)
        .mul(F(y2))
        .sub(F(x2).mul(F(y)))
    );
  });
  return twice.abs().div(2);
}

/** Drawn proportions for a length pair, kept between 1:max and max:1 so a figure stays readable. */
export function drawn(width: number, height: number, max = 2): [number, number] {
  const ratio = Math.min(max, Math.max(1 / max, height / width));
  return [10, 10 * ratio];
}

// ---------------------------------------------------------------- a draft from its core parts

export const tx = (a: number | Frac, b: number | Frac) => `${num(a)} \\times ${num(b)}`;

export interface Core {
  stem: string;
  answer: Frac;
  slips: Slip[];
  asks: string;
  steps: { label: string; work: string }[];
  check: string;
  tip: string;
  hint: string;
  difficulty: number;
  ok: (v: Frac) => boolean;
}

export function coreDraft(format: Format, c: Core, figure?: Draft["figure"]): Draft {
  return {
    format,
    stem: c.stem,
    ...(figure ? { figure } : {}),
    answer: ratAnswer(c.answer),
    slips: c.slips,
    asks: c.asks,
    steps: c.steps,
    check: c.check,
    tip: c.tip,
    hint: c.hint,
    difficulty: c.difficulty,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      return v !== null && c.ok(v);
    },
  };
}

export const TIP_AREA_PERIM =
  "Area counts the square units inside a shape (multiply the side lengths); perimeter is the distance around it (add every side)";

// ---------------------------------------------------------------- solids

/** A unit for solids: "inches", never the bare "units" for cubic measures. */
export const solidUnit = (rng: Rng) =>
  rng.pick(UNITS.filter((u) => u.many !== "units" && u.many !== "yards")).many;

/** Drawing sizes kept between 1:2.5 and 2.5:1 of each other. */
export const clampDims = (dims: Record<string, number>) => {
  const top = Math.max(...Object.values(dims));
  return Object.fromEntries(
    Object.entries(dims).map(([k, v]) => [k, Math.max(top / 2.5, v)])
  ) as Record<string, number>;
};
