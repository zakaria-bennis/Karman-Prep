/*
 * Shared helpers for the four Advanced Math equation skills (solving quadratics, graphs of
 * quadratics, radical and rational equations, nonlinear systems): answers of every shape these
 * skills need (numbers, radicals, sets of solutions, ordered pairs, solution counts), SAT-style
 * LaTeX for quadratic roots, and exact arithmetic for the independent checks.
 */
import { F, Frac, gcd, lcm } from "../core/frac";
import { S, Sym } from "../core/sym";
import { lin, m, num, pair } from "../core/tex";
import type { Answer, Slip } from "../core/types";

type Q = Frac | number;

/** A candidate's rational value, or null when it is not a number. */
export const valueOf = (a: Answer): Frac | null => a.value?.asRat() ?? null;

/** A wrong answer that is a rational number. */
export function slip(value: Q, why: string): Slip {
  const q = F(value);
  return { text: m(num(q)), value: Sym.rat(q), why };
}

/** A wrong answer with its own text (a radical, an expression of a number). */
export function symSlip(value: Sym, text: string, why: string): Slip {
  return { text, value, why };
}

// ------------------------------------------------------------------ exact roots

export function isqrt(n: number): number {
  if (n < 0) return NaN;
  let r = Math.floor(Math.sqrt(n));
  while (r * r > n) r--;
  while ((r + 1) * (r + 1) <= n) r++;
  return r;
}

/** The exact square root of a rational, or null when it is not rational. */
export function sqrtRat(q: Frac): Frac | null {
  if (q.n < 0) return null;
  const a = isqrt(q.n);
  const b = isqrt(q.d);
  return a * a === q.n && b * b === q.d ? F(a, b) : null;
}

/** The exact cube root of a rational, or null when it is not rational. */
export function cbrtRat(q: Frac): Frac | null {
  const root = (n: number) => {
    const s = Math.sign(n);
    let r = Math.round(Math.cbrt(Math.abs(n)));
    while (r ** 3 > Math.abs(n)) r--;
    while ((r + 1) ** 3 <= Math.abs(n)) r++;
    return r ** 3 === Math.abs(n) ? s * r : null;
  };
  const a = root(q.n);
  const b = root(q.d);
  return a === null || b === null ? null : F(a, b);
}

/** The square root of a nonnegative rational as an exact number (sqrt(0) is 0). */
export function sqrtSym(q: Frac): Sym {
  if (q.n < 0) throw new RangeError("square root of a negative number");
  if (q.n === 0) return Sym.rat(0);
  return S.root(q.n * q.d, F(1, q.d));
}

/** a x^2 + b x + c at an exact x. */
export function quadAt(a: Q, b: Q, c: Q, x: Sym): Sym {
  return x
    .mul(x)
    .mul(F(a))
    .add(x.mul(F(b)))
    .add(F(c));
}

/** b^2 - 4ac. */
export function disc(a: Q, b: Q, c: Q): Frac {
  return F(b)
    .mul(F(b))
    .sub(F(a).mul(F(c)).mul(4));
}

/** The real solutions of a x^2 + b x + c = 0 (a nonzero), ascending, by the quadratic formula. */
export function solveQuad(a: Q, b: Q, c: Q): Sym[] {
  const A = F(a);
  const B = F(b);
  const D = disc(A, B, c);
  if (D.n < 0) return [];
  const mid = Sym.rat(B.neg().div(A.mul(2)));
  if (D.n === 0) return [mid];
  const half = sqrtSym(D).divRat(A.mul(2));
  return [mid.add(half), mid.sub(half)].sort((x, y) => x.toNumber() - y.toNumber());
}

/** The value p + q*sqrt(r) of an exact number with at most one square root, or null. */
export function splitRoot(x: Sym): { p: Frac; q: Frac; r: number } | null {
  let p = F(0);
  let q = F(0);
  let r = 1;
  for (const [atom, coef] of x.entries()) {
    if (atom.pi !== 0) return null;
    if (atom.rad === 1) p = coef;
    else if (r === 1) {
      r = atom.rad;
      q = coef;
    } else return null;
  }
  return { p, q, r };
}

// ------------------------------------------------------------------ polynomials

/** Product of two polynomials given highest power first. */
export function polyMul(a: readonly Frac[], b: readonly Frac[]): Frac[] {
  const out = Array.from({ length: a.length + b.length - 1 }, () => F(0));
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] = out[i + j].add(x.mul(y)))));
  return out;
}

/** A polynomial (highest power first) at an exact x. */
export function polyAt(coeffs: readonly Frac[], x: Sym): Sym {
  let out = Sym.rat(0);
  for (const c of coeffs) out = out.mul(x).add(c);
  return out;
}

function divisors(n: number): number[] {
  const out: number[] = [];
  const a = Math.abs(n);
  for (let d = 1; d * d <= a; d++) {
    if (a % d === 0) {
      out.push(d);
      if (d * d !== a) out.push(a / d);
    }
  }
  return out;
}

/**
 * Every rational root of a polynomial with integer coefficients, found by testing the
 * candidates p/q (p divides the constant, q divides the leading coefficient). Ascending.
 */
export function rationalRoots(coeffs: readonly Frac[]): Frac[] {
  let cs = [...coeffs];
  while (cs.length && cs[0].isZero()) cs.shift();
  const roots: Frac[] = [];
  while (cs.length > 1 && cs[cs.length - 1].isZero()) {
    cs = cs.slice(0, -1);
    if (!roots.some((r) => r.isZero())) roots.push(F(0));
  }
  if (cs.length > 1) {
    const scale = cs.reduce((acc, c) => lcm(acc, c.d), 1);
    const ints = cs.map((c) => c.mul(scale));
    const lead = ints[0].n;
    const constant = ints[ints.length - 1].n;
    for (const p of divisors(constant)) {
      for (const q of divisors(lead)) {
        for (const s of [1, -1]) {
          const r = F(s * p, q);
          if (roots.some((x) => x.eq(r))) continue;
          if (polyAt(ints, Sym.rat(r)).isZero()) roots.push(r);
        }
      }
    }
  }
  return roots.sort((x, y) => x.cmp(y));
}

// ------------------------------------------------------------------ LaTeX

/** The factor whose zero is r: x - 3, x + 5, x, and 2x - 3 for r = 3/2. */
export function factorTex(r: Frac, v = "x"): string {
  if (r.isInt()) return lin([[1, v]], r.neg());
  return lin([[r.d, v]], -r.n);
}

/** k times factors, with brackets: 2x(x - 1)(x + 7), -(x - 4)(x + 2), (x - 3)(x + 1). */
export function productTex(k: Q, factors: string[]): string {
  const K = F(k);
  const head = K.eq(1) ? "" : K.eq(-1) ? "-" : num(K);
  const body = factors.map((f) => (/^[a-z]$/.test(f) ? f : `(${f})`));
  // A bare variable reads best right after the constant: 2x(x - 1), not 2(x - 1)x.
  body.sort((a, b) => Number(a.startsWith("(")) - Number(b.startsWith("(")));
  return `${head}${body.join("")}`;
}

/** p + q*sqrt(r) as the SAT prints a root: \frac{-3 + \sqrt{5}}{2}, 4 - 2\sqrt{3}. */
export function radTex(p: Frac, q: Frac, r: number): string {
  if (q.isZero() || r === 1) return num(p.add(q.mul(r === 1 ? 1 : 0)));
  const D = lcm(p.d, q.d);
  const P = p.mul(D).n;
  const Qn = q.mul(D).n;
  const root = `${Math.abs(Qn) === 1 ? "" : Math.abs(Qn)}\\sqrt{${r}}`;
  if (P === 0) {
    const body = D === 1 ? root : `\\frac{${root}}{${D}}`;
    return Qn < 0 ? `-${body}` : body;
  }
  const body = `${P} ${Qn < 0 ? "-" : "+"} ${root}`;
  return D === 1 ? body : `\\frac{${body}}{${D}}`;
}

/** p plus or minus q*sqrt(r) (q > 0): \frac{-13 \pm \sqrt{133}}{2}, 2 \pm \sqrt{5}. */
export function pmTex(p: Frac, q: Frac, r: number): string {
  const D = lcm(p.d, q.d);
  const P = p.mul(D).n;
  const Qn = Math.abs(q.mul(D).n);
  const root = `${Qn === 1 ? "" : Qn}\\sqrt{${r}}`;
  const body = P === 0 ? `\\pm ${root}` : `${P} \\pm ${root}`;
  return D === 1 ? body : `\\frac{${body}}{${D}}`;
}

/** Simplified sqrt of a positive integer as (outside, inside): 72 -> (6, 2). */
export function rootParts(n: number): { out: number; inside: number } {
  let out = 1;
  let inside = n;
  for (let f = 2; f * f <= inside; f++) {
    while (inside % (f * f) === 0) {
      inside /= f * f;
      out *= f;
    }
  }
  return { out, inside };
}

/** "$3$ and $12$", "$-7$, $0$, and $1$", for a list of rationals in ascending order. */
export function listTex(values: readonly Frac[]): string {
  const parts = [...values].sort((a, b) => a.cmp(b)).map((v) => m(num(v)));
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

// ------------------------------------------------------------------ sets of solutions

const symKey = (s: Sym) =>
  s
    .entries()
    .map(([a, c]) => `${a.pi},${a.rad},${c.toString()}`)
    .sort()
    .join(";") || "0";

/**
 * Answers that are whole sets of solutions ("$3$ and $12$", "no solution"). Each answer's key
 * names its set, and the template's check reads the set back with `values`.
 */
export class SolutionSets {
  private readonly sets = new Map<string, Sym[]>();

  private key(values: readonly Sym[]): string {
    const sorted = [...values].sort((x, y) => x.toNumber() - y.toNumber());
    const key = `set:${sorted.map(symKey).join("/")}`;
    this.sets.set(key, sorted);
    return key;
  }

  answer(values: readonly (Sym | Frac)[], text: string): Answer {
    return { text, key: this.key(values.map((v) => (v instanceof Sym ? v : Sym.rat(v)))) };
  }

  slip(values: readonly (Sym | Frac)[], text: string, why: string): Slip {
    return { ...this.answer(values, text), why };
  }

  /** The set a candidate names, or null when it names none. */
  values(candidate: Answer): Sym[] | null {
    return candidate.key ? (this.sets.get(candidate.key) ?? null) : null;
  }
}

/** True when two lists hold the same exact values (each value once). */
export function sameSet(a: readonly Sym[], b: readonly Sym[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x) => b.some((y) => y.eq(x))) && b.every((y) => a.some((x) => x.eq(y)));
}

// ------------------------------------------------------------------ ordered pairs

export function pairAnswer(x: Q, y: Q): Answer {
  const X = F(x);
  const Y = F(y);
  return { text: m(pair(X, Y)), key: `pt:${X.toString()}|${Y.toString()}` };
}

export function pairSlip(x: Q, y: Q, why: string): Slip {
  return { ...pairAnswer(x, y), why };
}

/** The point a candidate names, or null. */
export function pairOf(a: Answer): [Frac, Frac] | null {
  const hit = /^pt:(.+)\|(.+)$/.exec(a.key ?? "");
  return hit ? [Frac.parse(hit[1]), Frac.parse(hit[2])] : null;
}

// ------------------------------------------------------------------ solution counts

export type Count = 0 | 1 | 2 | 3 | "inf";

const COUNT_EQ: Record<string, string> = {
  "0": "Zero",
  "1": "Exactly one",
  "2": "Exactly two",
  "3": "Exactly three",
  inf: "Infinitely many",
};

const COUNT_SYS: Record<string, string> = {
  "0": "There are no solutions",
  "1": "There is exactly one solution",
  "2": "There are exactly two solutions",
  "3": "There are exactly three solutions",
  inf: "There are infinitely many solutions",
};

export function countAnswer(n: Count, style: "eq" | "sys" = "eq"): Answer {
  return { text: (style === "eq" ? COUNT_EQ : COUNT_SYS)[String(n)], key: `count:${n}` };
}

export function countSlip(n: Count, why: string, style: "eq" | "sys" = "eq"): Slip {
  return { ...countAnswer(n, style), why };
}

export function countOf(a: Answer): Count | null {
  const hit = /^count:(\d|inf)$/.exec(a.key ?? "");
  if (!hit) return null;
  return hit[1] === "inf" ? "inf" : (Number(hit[1]) as Count);
}

/** How many real solutions a x^2 + b x + c = 0 has, from the value at the vertex. */
export function countByVertex(a: Q, b: Q, c: Q): 0 | 1 | 2 {
  const A = F(a);
  const h = F(b).neg().div(A.mul(2));
  const k = A.mul(h).mul(h).add(F(b).mul(h)).add(F(c));
  if (k.isZero()) return 1;
  return k.sign() === A.sign() ? 0 : 2;
}

// ------------------------------------------------------------------ words

export const NAMES = [
  "Ava",
  "Mateo",
  "Priya",
  "Jonah",
  "Lena",
  "Omar",
  "Sofia",
  "Kenji",
  "Nadia",
  "Theo",
  "Imani",
  "Diego",
  "Hana",
  "Ravi",
  "Elena",
  "Malik",
];

/** The greatest common divisor of a list of integers (positive). */
export function gcdAll(values: readonly number[]): number {
  return values.reduce((g, v) => gcd(g, v), 0) || 1;
}
