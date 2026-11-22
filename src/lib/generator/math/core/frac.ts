/*
 * Exact fractions for the generator. SAT numbers are small, so a fraction is two safe
 * integers in lowest terms with a positive denominator. Any result that would leave the safe
 * range throws a RangeError; the generator then draws new numbers (it never rounds).
 */

const LIMIT = 2 ** 50;

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function safe(n: number): number {
  if (!Number.isSafeInteger(n) || Math.abs(n) > LIMIT) {
    throw new RangeError("fraction left the safe integer range");
  }
  return n;
}

export class Frac {
  readonly n: number;
  readonly d: number;

  private constructor(n: number, d: number) {
    this.n = n;
    this.d = d;
  }

  static of(n: number, d = 1): Frac {
    safe(n);
    safe(d);
    if (d === 0) throw new RangeError("division by zero");
    if (n === 0) return new Frac(0, 1);
    const g = gcd(n, d);
    const sign = d < 0 ? -1 : 1;
    return new Frac((sign * n) / g, (sign * d) / g);
  }

  /** A terminating decimal or integer given as text ("2.5", "-0.75", "3"), exactly. */
  static parse(text: string): Frac {
    const t = text.trim();
    const frac = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(t);
    if (frac) return Frac.of(Number(frac[1]), Number(frac[2]));
    const dec = /^([+-]?)(\d*)(?:\.(\d+))?$/.exec(t);
    if (!dec || `${dec[2]}${dec[3] ?? ""}` === "") throw new RangeError(`not a number: ${text}`);
    const places = (dec[3] ?? "").length;
    const digits = Number(`${dec[2] || "0"}${dec[3] ?? ""}`);
    return Frac.of((dec[1] === "-" ? -1 : 1) * digits, 10 ** places);
  }

  add(o: Frac | number): Frac {
    const b = F(o);
    return Frac.of(safe(this.n * b.d + b.n * this.d), safe(this.d * b.d));
  }
  sub(o: Frac | number): Frac {
    return this.add(F(o).neg());
  }
  mul(o: Frac | number): Frac {
    const b = F(o);
    return Frac.of(safe(this.n * b.n), safe(this.d * b.d));
  }
  div(o: Frac | number): Frac {
    const b = F(o);
    if (b.n === 0) throw new RangeError("division by zero");
    return Frac.of(safe(this.n * b.d), safe(this.d * b.n));
  }
  neg(): Frac {
    return Frac.of(-this.n, this.d);
  }
  abs(): Frac {
    return Frac.of(Math.abs(this.n), this.d);
  }
  inv(): Frac {
    return Frac.of(this.d, this.n);
  }
  pow(k: number): Frac {
    if (!Number.isInteger(k)) throw new RangeError("Frac.pow needs an integer power");
    let out = Frac.of(1);
    const base = k < 0 ? this.inv() : this;
    for (let i = 0; i < Math.abs(k); i++) out = out.mul(base);
    return out;
  }
  eq(o: Frac | number): boolean {
    const b = F(o);
    return this.n === b.n && this.d === b.d;
  }
  cmp(o: Frac | number): number {
    const b = F(o);
    return Math.sign(this.n * b.d - b.n * this.d);
  }
  lt(o: Frac | number): boolean {
    return this.cmp(o) < 0;
  }
  gt(o: Frac | number): boolean {
    return this.cmp(o) > 0;
  }
  isInt(): boolean {
    return this.d === 1;
  }
  isZero(): boolean {
    return this.n === 0;
  }
  sign(): number {
    return Math.sign(this.n);
  }
  /** True when the decimal form ends (the denominator has only 2s and 5s). */
  terminates(): boolean {
    let d = this.d;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    return d === 1;
  }
  /** Digits after the point the exact decimal needs, or Infinity when it repeats. */
  decimalPlaces(): number {
    if (!this.terminates()) return Infinity;
    let places = 0;
    let q = Frac.of(this.n, this.d);
    while (!q.isInt()) {
      q = q.mul(10);
      places++;
    }
    return places;
  }
  toNumber(): number {
    return this.n / this.d;
  }
  /** "3/4", "-2", the form stored as a numeric answer key. */
  toString(): string {
    return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`;
  }
  /** The exact decimal ("0.75", "-2.5"), only for a terminating value. */
  toDecimal(): string {
    const places = this.decimalPlaces();
    if (!Number.isFinite(places)) throw new RangeError("decimal does not terminate");
    if (places === 0) return String(this.n);
    const scaled = this.mul(10 ** places).n;
    const sign = scaled < 0 ? "-" : "";
    const digits = String(Math.abs(scaled)).padStart(places + 1, "0");
    return `${sign}${digits.slice(0, -places)}.${digits.slice(-places)}`;
  }
}

/** A fraction from an integer, a fraction, or numerator and denominator. */
export function F(n: Frac | number, d = 1): Frac {
  if (n instanceof Frac) return d === 1 ? n : n.div(d);
  if (!Number.isInteger(n)) return Frac.parse(String(n)).div(d);
  return Frac.of(n, d);
}

export { gcd };

export function lcm(a: number, b: number): number {
  return Math.abs((a / gcd(a, b)) * b);
}
