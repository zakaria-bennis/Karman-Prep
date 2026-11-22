/*
 * Small text helpers shared by the Advanced Math skill files: variable lists, "with x = 2"
 * checks, and the wrong binomial factors a student picks (a flipped sign, swapped numbers).
 */
import { F, Frac, gcd } from "../core/frac";
import { m, num } from "../core/tex";
import { MPoly, type PolyAnswer, polyAns } from "./_advexpr-poly";

export const VARS1 = ["x", "x", "x", "x", "t", "n", "w", "p", "z"] as const;
export const PAIRS: readonly (readonly [string, string])[] = [
  ["x", "y"],
  ["x", "y"],
  ["a", "b"],
  ["m", "n"],
  ["p", "q"],
  ["s", "t"],
];

/** "$x = 2$" or "$x = 2$ and $y = -1$". */
export function ptText(pt: Readonly<Record<string, number>>): string {
  return Object.keys(pt)
    .map((v) => m(`${v} = ${num(pt[v])}`))
    .join(" and ");
}

/** The value of a product of brackets at a point, as text: 3(7)(-2) = -42. */
export function productText(lead: Frac | number, values: Frac[]): string {
  const L = F(lead);
  const head = L.eq(1) ? "" : L.eq(-1) ? "-" : num(L);
  return `${head}${values.map((v) => `(${num(v)})`).join("")}`;
}

/** a*v + b with whole a > 0 and gcd(a, b) = 1 (a primitive binomial). */
export function primitive(a: number, b: number): boolean {
  return a > 0 && b !== 0 && gcd(a, Math.abs(b)) === 1;
}

/** The root of a binomial a*v + b. */
export const rootOf = (a: number, b: number) => F(-b, a);

/**
 * Wrong binomial factors of p (in v): each true factor with its constant's sign flipped, and
 * with its coefficient and constant swapped. The why says where the binomial is zero and
 * what p is there, so the student sees it is not a factor.
 */
export function wrongBinomials(p: MPoly, truth: [number, number][], v = "x"): PolyAnswer[] {
  const out: PolyAnswer[] = [];
  const add = (a: number, b: number, slip: string) => {
    if (a < 0) [a, b] = [-a, -b];
    if (a === 0 || b === 0 || gcd(a, Math.abs(b)) !== 1) return;
    const r = rootOf(a, b);
    const at = p.at({ [v]: r });
    if (at.isZero()) return;
    out.push(
      polyAns(
        MPoly.lin(a, b, v),
        `${slip}; at ${m(`${v} = ${num(r)}`)} the expression equals ${m(num(at))}, not $0$`,
        [v]
      )
    );
  };
  for (const [a, b] of truth) add(a, -b, "you flipped the sign of the constant");
  for (const [a, b] of truth)
    if (Math.abs(a) !== Math.abs(b))
      add(Math.abs(b), Math.sign(b) * a, "you swapped the coefficient and the constant");
  return out;
}
