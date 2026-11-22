/*
 * Shared helpers for the Advanced Math skills (expanding and factoring, rational expressions,
 * exponents and radicals, polynomials): exact polynomials in one or more variables, their LaTeX
 * in the SAT's order, exact division (so "is a factor" is checked by dividing, not by how the
 * question was built), and answers made from them. Not a template file.
 */
import { EXPR_POINTS } from "../core/build";
import { F, Frac } from "../core/frac";
import { Sym } from "../core/sym";
import { m, num, pow } from "../core/tex";
import type { Answer, Slip } from "../core/types";

type Q = Frac | number;
export type Exps = Readonly<Record<string, number>>;
export interface Term {
  readonly e: Exps;
  readonly c: Frac;
}

export const ORDER: readonly string[] = ["x", "y"];

function cleanExps(e: Exps): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of Object.keys(e)) if (e[v] !== 0) out[v] = e[v];
  return out;
}

const keyOf = (e: Exps) =>
  Object.keys(e)
    .filter((v) => e[v] !== 0)
    .sort()
    .map((v) => `${v}^${e[v]}`)
    .join("*");

/** Lex order: the variables of `order` first, then the rest alphabetically; higher powers first. */
function compare(a: Exps, b: Exps, order: readonly string[]): number {
  const rest = [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((v) => !order.includes(v))
    .sort();
  for (const v of [...order, ...rest]) {
    const d = (b[v] ?? 0) - (a[v] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function monoTex(e: Exps): string {
  const vars = Object.keys(e)
    .filter((v) => e[v] !== 0)
    .sort();
  let out = "";
  vars.forEach((v, i) => {
    out += pow(v, e[v]);
    if (v.startsWith("\\") && e[v] === 1 && i < vars.length - 1) out += " ";
  });
  return out;
}

/** An exact polynomial with fraction coefficients in any number of variables. */
export class MPoly {
  private readonly map: ReadonlyMap<string, Term>;

  private constructor(map: Map<string, Term>) {
    this.map = map;
  }

  static from(terms: Iterable<readonly [Q, Exps]>): MPoly {
    const map = new Map<string, Term>();
    for (const [c0, e0] of terms) {
      const c = F(c0);
      if (c.isZero()) continue;
      const e = cleanExps(e0);
      const k = keyOf(e);
      const prev = map.get(k);
      const sum = prev ? prev.c.add(c) : c;
      if (sum.isZero()) map.delete(k);
      else map.set(k, { e, c: sum });
    }
    return new MPoly(map);
  }
  static c(q: Q): MPoly {
    return MPoly.from([[q, {}]]);
  }
  /** coef * name^exp */
  static v(name = "x", coef: Q = 1, exp = 1): MPoly {
    return MPoly.from([[coef, { [name]: exp }]]);
  }
  /** a*v + b */
  static lin(a: Q, b: Q, v = "x"): MPoly {
    return MPoly.from([
      [a, { [v]: 1 }],
      [b, {}],
    ]);
  }
  /** Coefficients, highest power first. */
  static uni(coeffs: readonly Q[], v = "x"): MPoly {
    const d = coeffs.length - 1;
    return MPoly.from(coeffs.map((c, i) => [c, { [v]: d - i }] as const));
  }

  terms(): Term[] {
    return [...this.map.values()];
  }
  sorted(order: readonly string[] = ORDER): Term[] {
    return this.terms().sort((a, b) => compare(a.e, b.e, order));
  }
  private pairs(): [Frac, Exps][] {
    return this.terms().map((t) => [t.c, t.e]);
  }
  add(o: MPoly | Q): MPoly {
    const b = o instanceof MPoly ? o : MPoly.c(o);
    return MPoly.from([...this.pairs(), ...b.pairs()]);
  }
  neg(): MPoly {
    return MPoly.from(this.terms().map((t) => [t.c.neg(), t.e] as const));
  }
  sub(o: MPoly | Q): MPoly {
    return this.add(o instanceof MPoly ? o.neg() : F(o).neg());
  }
  scale(q: Q): MPoly {
    return MPoly.from(this.terms().map((t) => [t.c.mul(F(q)), t.e] as const));
  }
  mul(o: MPoly | Q): MPoly {
    const b = o instanceof MPoly ? o : MPoly.c(o);
    const out: [Frac, Exps][] = [];
    for (const s of this.terms()) {
      for (const t of b.terms()) {
        const e: Record<string, number> = { ...s.e };
        for (const v of Object.keys(t.e)) e[v] = (e[v] ?? 0) + t.e[v];
        out.push([s.c.mul(t.c), e]);
      }
    }
    return MPoly.from(out);
  }
  pow(k: number): MPoly {
    let out = MPoly.c(1);
    for (let i = 0; i < k; i++) out = out.mul(this);
    return out;
  }
  isZero(): boolean {
    return this.map.size === 0;
  }
  eq(o: MPoly): boolean {
    return this.sub(o).isZero();
  }
  /** The coefficient of one monomial ({} for the constant term). */
  coef(e: Exps = {}): Frac {
    return this.map.get(keyOf(cleanExps(e)))?.c ?? F(0);
  }
  degree(v = "x"): number {
    return Math.max(0, ...this.terms().map((t) => t.e[v] ?? 0));
  }
  lead(order: readonly string[] = ORDER): Term {
    const s = this.sorted(order);
    if (!s.length) throw new RangeError("the zero polynomial has no leading term");
    return s[0];
  }
  /** The value at a point; "\\pi" counts as pi. */
  eval(vars: Readonly<Record<string, number>>): number {
    let total = 0;
    for (const t of this.terms()) {
      let p = t.c.toNumber();
      for (const v of Object.keys(t.e)) p *= (v === "\\pi" ? Math.PI : vars[v]) ** t.e[v];
      total += p;
    }
    return total;
  }
  /** The exact value when every variable is given a fraction. */
  at(vars: Readonly<Record<string, Q>>): Frac {
    let total = F(0);
    for (const t of this.terms()) {
      let p = t.c;
      for (const v of Object.keys(t.e)) p = p.mul(F(vars[v]).pow(t.e[v]));
      total = total.add(p);
    }
    return total;
  }
  /** One variable replaced by a polynomial. */
  subst(v: string, by: MPoly): MPoly {
    let out = MPoly.c(0);
    for (const t of this.terms()) {
      const rest: Record<string, number> = { ...t.e };
      const k = rest[v] ?? 0;
      delete rest[v];
      out = out.add(MPoly.from([[t.c, rest]]).mul(by.pow(k)));
    }
    return out;
  }
  tex(order: readonly string[] = ORDER): string {
    const ts = this.sorted(order);
    if (!ts.length) return "0";
    return ts
      .map((t, i) => {
        const mono = monoTex(t.e);
        const mag = t.c.abs();
        const body = mono === "" ? num(mag) : mag.eq(1) ? mono : `${num(mag)}${mono}`;
        if (i === 0) return t.c.n < 0 ? `-${body}` : body;
        return `${t.c.n < 0 ? "-" : "+"} ${body}`;
      })
      .join(" ");
  }
  /** Division by one polynomial (lex order): the remainder is zero exactly when g divides this. */
  divmod(g: MPoly, order: readonly string[] = ORDER): { q: MPoly; r: MPoly } {
    const lg = g.lead(order);
    let p = this.add(0);
    let q = MPoly.c(0);
    let r = MPoly.c(0);
    for (let guard = 0; !p.isZero(); guard++) {
      if (guard > 400) throw new RangeError("division did not finish");
      const lp = p.lead(order);
      const fits = Object.keys(lg.e).every((v) => (lp.e[v] ?? 0) >= lg.e[v]);
      if (fits) {
        const e: Record<string, number> = { ...lp.e };
        for (const v of Object.keys(lg.e)) e[v] -= lg.e[v];
        const t = MPoly.from([[lp.c.div(lg.c), e]]);
        q = q.add(t);
        p = p.sub(t.mul(g));
      } else {
        const t = MPoly.from([[lp.c, lp.e]]);
        r = r.add(t);
        p = p.sub(t);
      }
    }
    return { q, r };
  }
  /** True when this is a factor of f with a whole-number quotient (f with whole coefficients). */
  dividesOverZ(f: MPoly, order: readonly string[] = ORDER): boolean {
    if (this.isZero()) return false;
    // In lex division the quotient and remainder terms come out in falling order and never
    // cancel, so the first remainder term or non-whole quotient term already settles it.
    const lg = this.lead(order);
    let p: MPoly = f;
    for (let guard = 0; !p.isZero(); guard++) {
      if (guard > 400) return false;
      const lp = p.lead(order);
      if (!Object.keys(lg.e).every((v) => (lp.e[v] ?? 0) >= lg.e[v])) return false;
      const c = lp.c.div(lg.c);
      if (!c.isInt()) return false;
      const e: Record<string, number> = { ...lp.e };
      for (const v of Object.keys(lg.e)) e[v] -= lg.e[v];
      p = p.sub(MPoly.from([[c, e]]).mul(this));
    }
    return true;
  }
}

/**
 * A product in factored form: lead (a number or a one-term polynomial) then each factor in
 * brackets, with a power when given: 2x(x - 3)^2(x + 1).
 */
export function factored(
  lead: MPoly | Q,
  factors: readonly (MPoly | readonly [MPoly, number])[],
  order: readonly string[] = ORDER
): string {
  const L = lead instanceof MPoly ? lead : MPoly.c(lead);
  const isConst = L.terms().length === 1 && Object.keys(L.terms()[0].e).length === 0;
  let head = L.tex(order);
  if (isConst && L.coef().eq(1)) head = "";
  if (isConst && L.coef().eq(-1)) head = "-";
  const body = factors
    .map((f) => {
      const [p, k] = f instanceof MPoly ? [f, 1] : f;
      const inner = `(${p.tex(order)})`;
      return k === 1 ? inner : `${inner}^${k >= 10 ? `{${k}}` : k}`;
    })
    .join("");
  return head + body;
}

/** The product a factored text shows, as a polynomial. */
export function product(lead: MPoly | Q, factors: readonly (MPoly | readonly [MPoly, number])[]) {
  let out = lead instanceof MPoly ? lead : MPoly.c(lead);
  for (const f of factors) {
    const [p, k] = f instanceof MPoly ? [f, 1] : f;
    out = out.mul(p.pow(k));
  }
  return out;
}

const close = (x: number, y: number) =>
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));

type Fn = (vars: Readonly<Record<string, number>>) => number;

/** Two expressions agree at every sample point (polynomial identity testing). */
export function sameExpr(f: Fn, g: Fn): boolean {
  return EXPR_POINTS.every((p) => close(f(p), g(p)));
}

/** An answer (or slip) that carries its polynomial, so a check can divide by it. */
export interface PolyAnswer extends Slip {
  poly?: MPoly;
}

export function polyAns(
  p: MPoly,
  why = "",
  order: readonly string[] = ORDER,
  text?: string
): PolyAnswer {
  return { text: text ?? m(p.tex(order)), expr: (v) => p.eval(v), poly: p, why };
}

/** An expression answer from its text and its value at a point. */
export function exprAns(text: string, f: Fn, why = ""): Slip {
  return { text, expr: f, why };
}

export function numSlip(value: Q, why: string): Slip {
  return { text: m(num(value)), value: Sym.rat(F(value)), why };
}

export const valueOf = (a: Answer): Frac | null => a.value?.asRat() ?? null;

/** The four statement choices of a "I only / II only / I and II / Neither" question. */
export const ROMAN = {
  i: "I only",
  ii: "II only",
  both: "I and II",
  neither: "Neither I nor II",
} as const;
export type RomanKey = keyof typeof ROMAN;

export function romanKey(one: boolean, two: boolean): RomanKey {
  return one && two ? "both" : one ? "i" : two ? "ii" : "neither";
}

/** The answer and three slips for a two-statement question, given each choice's slip. */
export function romanChoices(
  right: RomanKey,
  why: (k: RomanKey) => string
): { answer: Answer; slips: Slip[] } {
  const keys = Object.keys(ROMAN) as RomanKey[];
  return {
    answer: { text: ROMAN[right], key: right },
    slips: keys.filter((k) => k !== right).map((k) => ({ text: ROMAN[k], key: k, why: why(k) })),
  };
}

/** Positive divisors of a whole number. */
export function divisors(n: number): number[] {
  const a = Math.abs(n);
  const low: number[] = [];
  const high: number[] = [];
  for (let d = 1; d * d <= a; d++) {
    if (a % d === 0) {
      low.push(d);
      if (d * d !== a) high.unshift(a / d);
    }
  }
  return [...low, ...high];
}

/**
 * The rational roots of a polynomial in one variable with whole coefficients (rational root
 * theorem). Each candidate is screened in floating point, then confirmed exactly when the exact
 * arithmetic stays in range. Never throws: an empty list when the search would be too large.
 */
export function rationalRoots(p: MPoly, v = "x"): Frac[] {
  const deg = p.degree(v);
  if (deg === 0) return [];
  let low = 0;
  while (p.coef(low === 0 ? {} : { [v]: low }).isZero()) low++;
  const roots: Frac[] = low > 0 ? [F(0)] : [];
  const a0 = p.coef(low === 0 ? {} : { [v]: low });
  const an = p.coef({ [v]: deg });
  if (Math.abs(a0.n) > 1e8 || Math.abs(an.n) > 1e5) return roots;
  for (const top of divisors(a0.n)) {
    for (const bottom of divisors(an.n)) {
      for (const s of [1, -1]) {
        const r = F(s * top, bottom);
        if (roots.some((x) => x.eq(r))) continue;
        const t = r.toNumber();
        const scale = p
          .terms()
          .reduce(
            (acc, term) => acc + Math.abs(term.c.toNumber()) * Math.abs(t) ** (term.e[v] ?? 0),
            0
          );
        if (Math.abs(p.eval({ [v]: t })) > 1e-9 * scale) continue;
        let exact = true;
        try {
          exact = p.at({ [v]: r }).isZero();
        } catch {
          exact = true;
        }
        if (exact) roots.push(r);
      }
    }
  }
  return roots.sort((a, b) => a.cmp(b));
}
