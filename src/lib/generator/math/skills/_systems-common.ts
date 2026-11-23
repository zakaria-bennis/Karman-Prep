/*
 * Shared helpers for four Algebra skills: linear functions, solving systems, systems in context
 * and linear inequalities. Exact arithmetic only (Frac); floats only to compare expressions.
 */
import { F, Frac } from "../core/frac";
import { Sym } from "../core/sym";
import { lin, m, num, pair } from "../core/tex";
import type { Answer, Slip } from "../core/types";

export type Q = Frac | number;

/** A candidate's rational value, or null when it is not a number. */
export const valueOf = (a: Answer): Frac | null => a.value?.asRat() ?? null;

/** A numeric wrong answer. */
export function numSlip(value: Q, why: string, opts: { decimal?: boolean } = {}): Slip {
  const v = F(value);
  return { text: m(num(v, opts)), value: Sym.rat(v), why };
}

/** Two floats agree (for comparing expressions). */
export const near = (x: number, y: number) =>
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));

/** True when a rational fits the SAT answer box, the way build.ts stores a typed key. */
export function fitsBox(v: Frac): boolean {
  const limit = v.n < 0 ? 6 : 5;
  if (v.isInt()) return String(v.n).length <= limit;
  if (v.toString().length <= limit) return true;
  if (!v.terminates()) return false;
  return v.toDecimal().replace(/^(-?)0\./, "$1.").length <= limit;
}

/** "add 7" or "subtract 7", for a constant term b. */
export const addWord = (b: Frac) => (b.n >= 0 ? `add ${m(num(b))}` : `subtract ${m(num(b.neg()))}`);

/** "Subtract 7 from both sides" or "Add 7 to both sides", for removing +b. */
export const undoAdd = (b: Frac) =>
  b.n >= 0 ? `Subtract ${m(num(b))} from both sides` : `Add ${m(num(b.neg()))} to both sides`;

// ------------------------------------------------------------------ ordered pairs

export const pairKey = (x: Frac, y: Frac) => `pt:${x.toString()};${y.toString()}`;

export function parsePair(key: string | undefined): [Frac, Frac] | null {
  if (!key || !key.startsWith("pt:")) return null;
  const [a, b] = key.slice(3).split(";");
  return [Frac.parse(a), Frac.parse(b)];
}

export function pairAns(x: Q, y: Q): Answer {
  return { text: m(pair(F(x), F(y))), key: pairKey(F(x), F(y)) };
}

export function pairSlip(x: Q, y: Q, why: string): Slip {
  return { ...pairAns(x, y), why };
}

// ------------------------------------------------------------------ linear equations

/** a x + b y = c */
export interface Eq {
  a: Frac;
  b: Frac;
  c: Frac;
}

export const eq = (a: Q, b: Q, c: Q): Eq => ({ a: F(a), b: F(b), c: F(c) });

export const scaleEq = (e: Eq, k: Q): Eq => ({ a: e.a.mul(k), b: e.b.mul(k), c: e.c.mul(k) });

export const satisfies = (e: Eq, x: Frac, y: Frac) => e.a.mul(x).add(e.b.mul(y)).eq(e.c);

/** The one solution of two equations (Cramer's rule), or null. */
export function solve2(e1: Eq, e2: Eq): [Frac, Frac] | null {
  const d = e1.a.mul(e2.b).sub(e1.b.mul(e2.a));
  if (d.isZero()) return null;
  return [e1.c.mul(e2.b).sub(e1.b.mul(e2.c)).div(d), e1.a.mul(e2.c).sub(e1.c.mul(e2.a)).div(d)];
}

function rank(rows: Frac[][]): number {
  const a = rows.map((r) => [...r]);
  let r = 0;
  const cols = a[0]?.length ?? 0;
  for (let c = 0; c < cols && r < a.length; c++) {
    const p = a.findIndex((row, i) => i >= r && !row[c].isZero());
    if (p < 0) continue;
    [a[r], a[p]] = [a[p], a[r]];
    for (let i = 0; i < a.length; i++) {
      if (i === r || a[i][c].isZero()) continue;
      const f = a[i][c].div(a[r][c]);
      a[i] = a[i].map((v, j) => v.sub(a[r][j].mul(f)));
    }
    r++;
  }
  return r;
}

/** How many solutions a system of linear equations in x and y has: 0, 1 or Infinity. */
export function countSolutions(eqs: Eq[]): number {
  const coef = rank(eqs.map((e) => [e.a, e.b]));
  const aug = rank(eqs.map((e) => [e.a, e.b, e.c]));
  if (coef < aug) return 0;
  return coef === 2 ? 1 : Infinity;
}

/** "3x - 2y = 7" */
export const stdTex = (e: Eq, opts: { decimal?: boolean } = {}) =>
  `${lin(
    [
      [e.a, "x"],
      [e.b, "y"],
    ],
    0,
    opts
  )} = ${num(e.c, opts)}`;

// ------------------------------------------------------------------ inequalities

export type Rel = "lt" | "le" | "gt" | "ge";
export const REL: Record<Rel, string> = { lt: "<", le: "\\le", gt: ">", ge: "\\ge" };
export const flipRel = (r: Rel): Rel => (({ lt: "gt", le: "ge", gt: "lt", ge: "le" }) as const)[r];
export const toggleStrict = (r: Rel): Rel =>
  (({ lt: "le", le: "lt", gt: "ge", ge: "gt" }) as const)[r];

export function holds(left: Frac, r: Rel, right: Frac): boolean {
  const c = left.cmp(right);
  return r === "lt" ? c < 0 : r === "le" ? c <= 0 : r === "gt" ? c > 0 : c >= 0;
}

/** A one-variable inequality answer "x < 5", keyed by its relation and boundary. */
export function ineqAns(v: string, r: Rel, k: Frac): Answer {
  return { text: m(`${v} ${REL[r]} ${num(k)}`), key: `ix:${r};${k.toString()}` };
}

export function ineqSlip(v: string, r: Rel, k: Frac, why: string): Slip {
  return { ...ineqAns(v, r, k), why };
}

export function parseIneq(key: string | undefined): { r: Rel; k: Frac } | null {
  if (!key || !key.startsWith("ix:")) return null;
  const [r, k] = key.slice(3).split(";");
  return { r: r as Rel, k: Frac.parse(k) };
}

// ------------------------------------------------------------------ words

export const NAMES = [
  "Ana",
  "Ben",
  "Carmen",
  "Dev",
  "Elena",
  "Farid",
  "Grace",
  "Hiro",
  "Imani",
  "Jonah",
  "Kayla",
  "Luis",
  "Maya",
  "Nikhil",
  "Olivia",
  "Priya",
  "Quinn",
  "Rosa",
  "Sam",
  "Tariq",
  "Uma",
  "Victor",
  "Wen",
  "Yusuf",
  "Zoe",
  "Amara",
  "Diego",
  "Leila",
  "Marcus",
  "Noor",
  "Owen",
  "Sofia",
  "Theo",
  "Kenji",
  "Lucia",
  "Mateo",
  "Nadia",
  "Ravi",
] as const;
