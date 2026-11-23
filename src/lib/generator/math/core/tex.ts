/*
 * LaTeX for the generator, in the forms MathText renders (KaTeX inside $...$). Fractions are
 * \frac, never slashes; negatives get parentheses where a product needs them; money is
 * \$ inside math (never a bare dollar sign in prose); thousands take {,} as the SAT prints them.
 */
import { F, Frac } from "./frac";
import { Sym } from "./sym";

type Q = Frac | number;

const thousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, "{,}");

/** An integer, with {,} between thousands from 1,000 up (as the SAT prints them). */
export function int(n: number, opts: { commas?: boolean } = {}): string {
  if (!Number.isInteger(n)) throw new RangeError(`tex.int needs an integer, got ${n}`);
  const sign = n < 0 ? "-" : "";
  const digits = String(Math.abs(n));
  return sign + (opts.commas === false || Math.abs(n) < 1000 ? digits : thousands(digits));
}

/** A rational: 5, -5, \frac{3}{4}, -\frac{3}{4}. `decimal` prints a terminating value as a decimal. */
export function num(value: Q, opts: { decimal?: boolean; commas?: boolean } = {}): string {
  const q = F(value);
  if (q.isInt()) return int(q.n, opts);
  if (opts.decimal && q.terminates()) return dec(q, opts);
  const sign = q.n < 0 ? "-" : "";
  return `${sign}\\frac{${Math.abs(q.n)}}{${q.d}}`;
}

/** A terminating decimal with a leading zero: 0.75, -2.5, 1{,}250.5. */
export function dec(value: Q, opts: { commas?: boolean } = {}): string {
  const text = F(value).toDecimal();
  const [whole, frac] = text.split(".");
  const sign = whole.startsWith("-") ? "-" : "";
  const digits = whole.replace("-", "");
  const head = opts.commas === false || Number(digits) < 1000 ? digits : thousands(digits);
  return `${sign}${head}${frac ? `.${frac}` : ""}`;
}

/** A value in parentheses when negative (for products and substitutions): (-3), 4, \left(-\frac{1}{2}\right). */
export function paren(value: Q, opts: { decimal?: boolean } = {}): string {
  const q = F(value);
  const body = num(q, opts);
  if (q.n >= 0) return body;
  return q.isInt() || opts.decimal ? `(${body})` : `\\left(${body}\\right)`;
}

/** A product written out with brackets, as in a substitution: 9(4), -2(-3), (5) for 1, -(5) for -1. */
export function times(coef: Q, value: Q, opts: { decimal?: boolean } = {}): string {
  const c = F(coef);
  const inner = num(value, opts);
  const head = c.eq(1) ? "" : c.eq(-1) ? "-" : num(c, opts);
  const isFrac = !F(value).isInt() && !opts.decimal;
  return isFrac ? `${head}\\left(${inner}\\right)` : `${head}(${inner})`;
}

/** A number for prose: wrapped in $...$ so a minus sign or fraction renders as math. */
export function n(value: Q, opts: { decimal?: boolean } = {}): string {
  return `$${num(value, opts)}$`;
}

/** "+ 3" or "- 3", for the second and later terms of a sum. */
export function signed(value: Q, opts: { decimal?: boolean } = {}): string {
  const q = F(value);
  return q.n < 0 ? `- ${num(q.neg(), opts)}` : `+ ${num(q, opts)}`;
}

/** A coefficient times a variable: 3x, -x, x, \frac{1}{2}x; "" for a zero coefficient. */
export function term(coef: Q, variable: string, opts: { decimal?: boolean } = {}): string {
  const q = F(coef);
  if (q.isZero()) return "";
  if (variable === "") return num(q, opts);
  if (q.eq(1)) return variable;
  if (q.eq(-1)) return `-${variable}`;
  return `${num(q, opts)}${variable}`;
}

/**
 * A sum of terms in order, signs handled: lin([[3, "x"], [-2, "y"]], 5) is 3x - 2y + 5.
 * Zero terms are left out; an all-zero sum is 0.
 */
export function lin(
  terms: readonly (readonly [Q, string])[],
  constant: Q = 0,
  opts: { decimal?: boolean } = {}
): string {
  const parts: string[] = [];
  for (const [coef, variable] of [...terms, [constant, ""] as const]) {
    const q = F(coef);
    if (q.isZero()) continue;
    if (parts.length === 0) {
      parts.push(term(q, variable, opts));
    } else {
      const magnitude = term(q.abs(), variable, opts);
      parts.push(`${q.n < 0 ? "-" : "+"} ${magnitude}`);
    }
  }
  return parts.length ? parts.join(" ") : "0";
}

/** x^{2}, x^{10}: a power with braces only when needed. */
export function pow(base: string, exponent: number | string): string {
  const e = String(exponent);
  if (e === "1") return base;
  return `${base}^${e.length === 1 ? e : `{${e}}`}`;
}

/** A polynomial from its coefficients, highest power first: poly([2, -3, 1], "x") is 2x^2 - 3x + 1. */
export function poly(
  coeffs: readonly Q[],
  variable = "x",
  opts: { decimal?: boolean } = {}
): string {
  const degree = coeffs.length - 1;
  const terms = coeffs.map((c, i) => {
    const p = degree - i;
    return [c, p === 0 ? "" : pow(variable, p)] as const;
  });
  const constant = terms.pop()!;
  return lin(terms, constant[0], opts);
}

/** Money inside math: \$12.50, \$1{,}250, \$8. Whole dollars print without cents. */
export function money(value: Q): string {
  const q = F(value);
  if (q.isInt()) return `\\$${int(q.n)}`;
  const cents = q.mul(100);
  if (!cents.isInt()) throw new RangeError("money needs whole cents");
  const text = F(cents.n, 100).toDecimal();
  const [whole, frac = ""] = text.split(".");
  return `\\$${int(Number(whole))}.${frac.padEnd(2, "0")}`;
}

/** A percent inside math: 25\%, 12.5\%. */
export function pct(value: Q): string {
  return `${num(value, { decimal: true })}\\%`;
}

/**
 * An exact symbolic number: 3\sqrt{2}, 2 + 3\sqrt{5}, \frac{\sqrt{3}}{2}, 4\pi, \frac{3\pi}{4}.
 * Rational part first, then roots by size, then pi terms.
 */
export function sym(value: Sym | Q): string {
  const s = value instanceof Sym ? value : Sym.rat(value);
  const entries = s.entries().sort(([a], [b]) => a.pi - b.pi || a.rad - b.rad);
  if (entries.length === 0) return "0";
  const pieces = entries.map(([atom, coef], index) => {
    const tail = `${atom.pi === 1 ? "\\pi" : atom.pi > 1 ? `\\pi^${atom.pi}` : ""}${
      atom.rad > 1 ? `\\sqrt{${atom.rad}}` : ""
    }`;
    const magnitude = coef.abs();
    let body: string;
    if (tail === "") body = num(magnitude);
    else if (magnitude.isInt()) body = `${magnitude.n === 1 ? "" : int(magnitude.n)}${tail}`;
    else body = `\\frac{${magnitude.n === 1 ? "" : int(magnitude.n)}${tail}}{${magnitude.d}}`;
    const negative = coef.n < 0;
    if (index === 0) return `${negative ? "-" : ""}${body}`;
    return `${negative ? "-" : "+"} ${body}`;
  });
  return pieces.join(" ");
}

/** Wraps LaTeX for MathText: $...$. */
export function m(latex: string): string {
  return `$${latex}$`;
}

/** A displayed equation on its own line: $$...$$. */
export function block(latex: string): string {
  return `$$${latex}$$`;
}

/** An ordered pair: (3, -2). */
export function pair(x: Q | Sym, y: Q | Sym): string {
  return `(${sym(x instanceof Sym ? x : Sym.rat(x))}, ${sym(y instanceof Sym ? y : Sym.rat(y))})`;
}
