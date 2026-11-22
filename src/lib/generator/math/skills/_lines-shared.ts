/*
 * Shared helpers for the line skills (number of solutions, equations from words, slope, graphs
 * of lines, parallel and perpendicular lines): exact numeric slips, equation answers that compare
 * as lines (so two forms of one line count as the same answer), solution counts, and the SAT's
 * typed-answer box rule.
 */
import { F, Frac } from "../core/frac";
import { Sym } from "../core/sym";
import { m, n, num, term } from "../core/tex";
import type { Rng } from "../core/rng";
import type { Answer, Slip } from "../core/types";

export const valueOf = (a: Answer): Frac | null => a.value?.asRat() ?? null;

/** A numeric wrong answer. */
export function slip(value: Frac, why: string, decimal = false): Slip {
  return { text: m(num(value, { decimal })), value: Sym.rat(value), why };
}

/** True when a candidate is a number that passes the test. */
export function isValue(cand: Answer, test: (v: Frac) => boolean): boolean {
  const v = valueOf(cand);
  return v !== null && test(v);
}

/** True when q fits the SAT's typed-answer box (the builder's sprKeyOf rule). */
export function fitsBox(q: Frac): boolean {
  const limit = q.n < 0 ? 6 : 5;
  if (q.isInt()) return String(q.n).length <= limit;
  if (q.toString().length <= limit) return true;
  if (!q.terminates()) return false;
  return q.toDecimal().replace(/^(-?)0\./, "$1.").length <= limit;
}

/** "Subtract 3x from both sides" or "Add 3x to both sides", to remove coef*v from a side. */
export function moveTerm(coef: Frac, v: string): string {
  return coef.n >= 0
    ? `subtract ${m(term(coef, v))} from both sides`
    : `add ${m(term(coef.neg(), v))} to both sides`;
}

/** "+ 3x" or "- 3x": a later term of a sum. */
export function sterm(coef: Frac, v: string): string {
  return coef.n < 0 ? `- ${term(coef.neg(), v)}` : `+ ${term(coef, v)}`;
}

// ------------------------------------------------------------------ equations as answers

/** The line A·x + B·y = C, where x and y stand for the question's first and second variable. */
export interface Eq2 {
  A: Frac;
  B: Frac;
  C: Frac;
}

type WithEq = { eq?: Eq2 };

/** The residual with the y-coefficient scaled to 1 (x-coefficient for a vertical line). */
function canonical(e: Eq2): (v: Readonly<Record<string, number>>) => number {
  const s = !e.B.isZero() ? e.B : e.A;
  const [a, b, c] = [e.A.div(s).toNumber(), e.B.div(s).toNumber(), e.C.div(s).toNumber()];
  return (v) => a * v.x + b * v.y - c;
}

/** An equation answer: compares as a line, and carries its exact coefficients for the check. */
export function eqAnswer(text: string, eq: Eq2): Answer {
  return Object.assign({ text, expr: canonical(eq) }, { eq });
}

export function eqSlip(text: string, eq: Eq2, why: string): Slip {
  return Object.assign({ text, why, expr: canonical(eq) }, { eq });
}

export const eqOf = (a: Answer): Eq2 | null => (a as WithEq).eq ?? null;

export const onEq = (e: Eq2, x: Frac, y: Frac): boolean => e.A.mul(x).add(e.B.mul(y)).eq(e.C);

/** True when the candidate is a real line through every one of the points (exactly). */
export function eqThrough(cand: Answer, pts: readonly (readonly [Frac, Frac])[]): boolean {
  const e = eqOf(cand);
  if (!e || (e.A.isZero() && e.B.isZero())) return false;
  return pts.every(([x, y]) => onEq(e, x, y));
}

/** y = mx + b as an Eq2. */
export const slopeEq = (mm: Frac, b: Frac): Eq2 => ({ A: mm.neg(), B: F(1), C: b });

// ------------------------------------------------------------------ counting solutions

export type Count = "zero" | "one" | "two" | "inf";
export type Side = (x: Frac) => Frac;

export const COUNT_TEXT: Record<Count, string> = {
  zero: "Zero",
  one: "Exactly one",
  two: "Exactly two",
  inf: "Infinitely many",
};

/**
 * How many solutions L(x) = R(x) has when both sides are linear: the gap between the sides is
 * measured at x = 0, 1 and 2, as printed, never from the coefficients a template chose.
 */
export function countLinear(L: Side, R: Side): Count {
  const d = [0, 1, 2].map((x) => L(F(x)).sub(R(F(x))));
  if (!d[2].sub(d[1]).eq(d[1].sub(d[0]))) throw new Error("countLinear needs linear sides");
  if (d[0].eq(d[1])) return d[0].isZero() ? "inf" : "zero";
  return "one";
}

/**
 * A check by testing values: the two sides at x = 0 and x = 1, and what their gap says about
 * the number of solutions.
 */
export function gapCheck(L: Side, R: Side, count: Count): string {
  const [l0, r0, l1, r1] = [L(F(0)), R(F(0)), L(F(1)), R(F(1))];
  if (count === "inf") {
    return `at ${m("x = 0")} both sides equal ${n(l0)}, and at ${m("x = 1")} both equal ${n(l1)}: the sides agree for every ${m("x")}`;
  }
  const head = `at ${m("x = 0")} the sides are ${n(l0)} and ${n(r0)}, and at ${m("x = 1")} they are ${n(l1)} and ${n(r1)}`;
  if (count === "zero") {
    return `${head}. The gap between them is ${n(l0.sub(r0))} both times, so it never closes`;
  }
  return `${head}. The gap changes from ${n(l0.sub(r0))} to ${n(l1.sub(r1))}, so it closes at exactly one value of ${m("x")}`;
}

/** Letters for constants, never x or y. */
export const CONSTANTS = ["k", "a", "c", "p", "r", "n"] as const;

/** One item from a weighted list. */
export function weighted<T>(rng: Rng, list: readonly (readonly [number, T])[]): T {
  const total = list.reduce((s, [w]) => s + w, 0);
  let x = rng.next() * total;
  for (const [w, item] of list) {
    x -= w;
    if (x < 0) return item;
  }
  return list[0][1];
}
