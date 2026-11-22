/*
 * Exact numbers with square roots and pi kept symbolic: a sum of fraction coefficients times
 * atoms pi^p * sqrt(r), with r square-free. 3*sqrt(2), 2 + sqrt(5), (9/2)*pi and 4*pi*sqrt(3)
 * are all exact; two numbers are equal only when every coefficient matches.
 */
import { F, Frac } from "./frac";

interface Atom {
  pi: number;
  rad: number;
}

const key = (a: Atom) => `${a.pi}|${a.rad}`;
const unkey = (k: string): Atom => {
  const [pi, rad] = k.split("|").map(Number);
  return { pi, rad };
};

/** sqrt(n) as (outside, square-free inside): sqrt(72) is 6*sqrt(2). */
export function simplifyRoot(n: number): { out: number; inside: number } {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("simplifyRoot needs a whole number");
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

export class Sym {
  /** atom key to its coefficient; never holds a zero coefficient. */
  private readonly terms: ReadonlyMap<string, Frac>;

  private constructor(terms: Map<string, Frac>) {
    this.terms = terms;
  }

  static from(entries: Iterable<[Atom, Frac]>): Sym {
    const terms = new Map<string, Frac>();
    for (const [atom, coef] of entries) {
      const k = key(atom);
      const sum = (terms.get(k) ?? F(0)).add(coef);
      if (sum.isZero()) terms.delete(k);
      else terms.set(k, sum);
    }
    return new Sym(terms);
  }

  static rat(q: Frac | number): Sym {
    return Sym.from([[{ pi: 0, rad: 1 }, F(q)]]);
  }

  /** coef * sqrt(n), simplified. */
  static root(n: number, coef: Frac | number = 1): Sym {
    if (n === 0) return Sym.rat(0);
    const { out, inside } = simplifyRoot(n);
    return Sym.from([[{ pi: 0, rad: inside }, F(coef).mul(out)]]);
  }

  /** coef * pi. */
  static pi(coef: Frac | number = 1): Sym {
    return Sym.from([[{ pi: 1, rad: 1 }, F(coef)]]);
  }

  entries(): [Atom, Frac][] {
    return [...this.terms.entries()].map(([k, c]) => [unkey(k), c]);
  }

  add(o: Sym | Frac | number): Sym {
    const b = o instanceof Sym ? o : Sym.rat(o);
    return Sym.from([...this.entries(), ...b.entries()]);
  }
  sub(o: Sym | Frac | number): Sym {
    const b = o instanceof Sym ? o : Sym.rat(o);
    return this.add(b.neg());
  }
  neg(): Sym {
    return Sym.from(this.entries().map(([a, c]) => [a, c.neg()]));
  }
  mul(o: Sym | Frac | number): Sym {
    const b = o instanceof Sym ? o : Sym.rat(o);
    const out: [Atom, Frac][] = [];
    for (const [a1, c1] of this.entries()) {
      for (const [a2, c2] of b.entries()) {
        const { out: k, inside } = simplifyRoot(a1.rad * a2.rad);
        out.push([{ pi: a1.pi + a2.pi, rad: inside }, c1.mul(c2).mul(k)]);
      }
    }
    return Sym.from(out);
  }
  /** Division by a rational (exact); other divisors are not needed by the templates. */
  divRat(q: Frac | number): Sym {
    return this.mul(F(1).div(F(q)));
  }
  eq(o: Sym | Frac | number): boolean {
    const b = o instanceof Sym ? o : Sym.rat(o);
    if (this.terms.size !== b.terms.size) return false;
    for (const [k, c] of this.terms) {
      const other = b.terms.get(k);
      if (!other || !other.eq(c)) return false;
    }
    return true;
  }
  isZero(): boolean {
    return this.terms.size === 0;
  }
  /** The rational value, or null when a root or pi is present. */
  asRat(): Frac | null {
    if (this.terms.size === 0) return F(0);
    if (this.terms.size !== 1) return null;
    const [[k, c]] = [...this.terms.entries()];
    return k === "0|1" ? c : null;
  }
  isRat(): boolean {
    return this.asRat() !== null;
  }
  hasPi(): boolean {
    return this.entries().some(([a]) => a.pi > 0);
  }
  toNumber(): number {
    let v = 0;
    for (const [a, c] of this.entries()) v += c.toNumber() * Math.PI ** a.pi * Math.sqrt(a.rad);
    return v;
  }
}

export const S = {
  rat: Sym.rat,
  root: Sym.root,
  pi: Sym.pi,
};
