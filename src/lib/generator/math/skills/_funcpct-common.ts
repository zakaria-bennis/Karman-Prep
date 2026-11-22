/*
 * Shared helpers for five skills (percentages, ratios and proportions, units and conversions,
 * exponential functions, functions and transformations): decimal text, slips that drop out
 * when their value cannot be shown, exact checks, expression checks at EXPR_POINTS, statement
 * answers, and lists of names.
 */
import { EXPR_POINTS, need, sprKeyOf } from "../core/build";
import { F, Frac } from "../core/frac";
import type { Rng } from "../core/rng";
import { Sym } from "../core/sym";
import { m, num, pct } from "../core/tex";
import type { Answer, Slip } from "../core/types";

export type Vars = Readonly<Record<string, number>>;
export type Show = (value: Frac) => string;

export const valueOf = (a: Answer): Frac | null => a.value?.asRat() ?? null;

/** A terminating value as a decimal (12.5, 0.0024, 1{,}250); draws again when it repeats. */
export function dn(value: Frac | number): string {
  const q = F(value);
  need(q.terminates(), "decimal does not terminate");
  return num(q, { decimal: true });
}

/** A percent inside math (12.5\%), from a terminating value. */
export function pc(value: Frac | number): string {
  const q = F(value);
  need(q.terminates(), "percent does not terminate");
  return pct(q);
}

/** Whether a value fits the SAT's typed-answer box (5 characters, 6 with a minus sign). */
export function fitsBox(value: Frac): boolean {
  try {
    const key = sprKeyOf(Sym.rat(value));
    return key.length <= (key.startsWith("-") ? 6 : 5);
  } catch {
    return false;
  }
}

/** The typed key written as a decimal (money, measures) when that fits the box. */
export function decimalKey(value: Frac): string | undefined {
  if (value.isInt() || !value.terminates()) return undefined;
  const text = value.toDecimal().replace(/^(-?)0\./, "$1.");
  return text.length <= (value.n < 0 ? 6 : 5) ? text : undefined;
}

/** A numeric answer shown with `show` (a decimal unless told otherwise). */
export function ans(value: Frac, show: Show = dn): Answer {
  return { text: m(show(value)), value: Sym.rat(value) };
}

/** A slip, or null when its value cannot be shown (a repeating decimal, part of a cent). */
export function sv(value: Frac | null | undefined, why: string, show: Show = dn): Slip | null {
  if (!value) return null;
  try {
    return { text: m(show(value)), value: Sym.rat(value), why };
  } catch {
    return null;
  }
}

/** Arithmetic for a slip: null when a step divides by zero or leaves the safe range. */
export function tryQ(f: () => Frac): Frac | null {
  try {
    return f();
  } catch {
    return null;
  }
}

/** The slips that exist, in order. */
export function keep(...slips: (Slip | null | false | undefined)[]): Slip[] {
  return slips.filter((s): s is Slip => !!s);
}

/** Only the slips with a positive value (counts, prices, lengths, times). */
export function positive(slips: Slip[]): Slip[] {
  return slips.filter((s) => !s.value || s.value.toNumber() > 0);
}

/** The independent check on a candidate's exact value. */
export function byValue(test: (v: Frac) => boolean): (cand: Answer) => boolean {
  return (cand) => {
    const v = valueOf(cand);
    if (v === null) return false;
    try {
      return test(v);
    } catch {
      return false;
    }
  };
}

const close = (x: number, y: number) =>
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));

/** An expression answer: its MathText and its value at any point. */
export function exprAns(text: string, expr: (v: Vars) => number): Answer {
  return { text, expr };
}

export function exprSlip(text: string, expr: (v: Vars) => number, why: string): Slip {
  return { text, expr, why };
}

/** The independent check for an expression: equal to the truth at every sample point. */
export function byExpr(truth: (v: Vars) => number): (cand: Answer) => boolean {
  return (cand) => {
    if (!cand.expr) return false;
    try {
      return EXPR_POINTS.every((p) => close(cand.expr!(p), truth(p)));
    } catch {
      return false;
    }
  };
}

/** A statement answer: its words and a key that names the claim it makes. */
export function said(text: string, key: string): Answer {
  return { text, key };
}

export function saidSlip(text: string, key: string, why: string): Slip {
  return { text, key, why };
}

/** A whole number N in [lo, hi] for which p% of N is whole. */
export function wholeFor(rng: Rng, p: Frac, lo: number, hi: number): number {
  const b = p.div(100).d;
  const jlo = Math.ceil(lo / b);
  const jhi = Math.floor(hi / b);
  need(jlo <= jhi, "no whole number in range");
  return b * rng.int(jlo, jhi);
}

/** One of several items with weights: pickW(rng, [["a", 2], ["b", 1]]). */
export function pickW<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r < 0) return item;
  }
  return items[items.length - 1][0];
}

export const NAMES = [
  "Maya",
  "Andre",
  "Priya",
  "Diego",
  "Keiko",
  "Samir",
  "Elena",
  "Malik",
  "Hannah",
  "Tomas",
  "Aisha",
  "Ravi",
  "Lucia",
  "Jamal",
  "Ingrid",
  "Kofi",
  "Mei",
  "Omar",
  "Sofia",
  "Grant",
  "Nadia",
  "Theo",
  "Leila",
  "Marcus",
  "Yuki",
  "Carmen",
  "Tariq",
  "Zoe",
  "Ethan",
  "Amara",
  "Felix",
  "Rosa",
  "Dmitri",
  "Imani",
  "Jonah",
  "Lena",
  "Kwame",
  "Ana",
  "Hugo",
  "Noor",
] as const;
