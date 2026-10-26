/** SAT numeric forms: signed decimals and fractions; never expressions or units. */
export function parseNumericAnswer(value: string): number | null {
  const text = value.trim();
  if (/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(text)) {
    const [top, bottom] = text.split("/").map((part) => Number(part.trim()));
    const result = top / bottom;
    return bottom !== 0 && Number.isFinite(result) ? result : null;
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const result = Number(text);
  return Number.isFinite(result) ? result : null;
}

/** An exact rational value: numerator over a positive denominator. */
type Rational = { num: bigint; den: bigint };

const [ZERO, ONE, TWO, FIVE, TEN] = [0, 1, 2, 5, 10].map((n) => BigInt(n));
const abs = (n: bigint) => (n < ZERO ? -n : n);

/** Exact value of a numeric answer (no floating point), or null when it is not one. */
function parseExactAnswer(value: string): Rational | null {
  const text = value.trim();
  const fraction = /^([+-]?)(\d+)\s*\/\s*([+-]?)(\d+)$/.exec(text);
  if (fraction) {
    const den = BigInt(fraction[4]);
    if (den === ZERO) return null;
    const negative = (fraction[1] === "-") !== (fraction[3] === "-");
    return { num: (negative ? -ONE : ONE) * BigInt(fraction[2]), den };
  }
  const decimal = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!decimal || `${decimal[2]}${decimal[3] ?? ""}` === "") return null;
  const places = (decimal[3] ?? "").length;
  const digits = BigInt(`${decimal[2]}${decimal[3] ?? ""}`);
  return { num: (decimal[1] === "-" ? -ONE : ONE) * digits, den: TEN ** BigInt(places) };
}

/** Characters the shortest exact decimal of `value` needs, or Infinity when it repeats. */
function exactDecimalLength(value: Rational): number {
  let den = value.den / gcd(abs(value.num), value.den);
  let twos = 0;
  let fives = 0;
  while (den % TWO === ZERO) [den, twos] = [den / TWO, twos + 1];
  while (den % FIVE === ZERO) [den, fives] = [den / FIVE, fives + 1];
  if (den !== ONE) return Infinity;
  const places = Math.max(twos, fives);
  const whole = abs(value.num) / value.den;
  const wholeLength = whole === ZERO ? (places === 0 ? 1 : 0) : whole.toString().length;
  return (value.num < ZERO ? 1 : 0) + wholeLength + (places > 0 ? 1 + places : 0);
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== ZERO) [a, b] = [b, a % b];
  return a;
}

/**
 * The official SAT (Bluebook) rule for decimal entries: a positive answer has 5
 * characters and a negative one 6 (with the minus sign). When the exact answer
 * does not fit, a decimal that fills every character and is the answer either
 * truncated or rounded at its last digit is accepted (2/3: .6666, .6667, 0.666,
 * 0.667, but not .67 or 0.67). Answers that fit must be entered exactly.
 */
export function isSatShortenedDecimal(entry: string, answer: string): boolean {
  const correct = parseExactAnswer(answer);
  const match = /^(-?)(\d*)(?:\.(\d+))?$/.exec(entry.trim());
  if (!correct || !match || `${match[2]}${match[3] ?? ""}` === "") return false;
  const [text, sign, whole] = match;
  const places = match[3] ?? "";
  const limit = correct.num < ZERO ? 6 : 5;
  if (text.length !== limit || exactDecimalLength(correct) <= limit) return false;
  // Padding zeros ("00.33") take characters without adding precision.
  if (whole.length > 1 && whole.startsWith("0")) return false;
  if ((sign === "-") !== correct.num < ZERO) return false;
  const scale = TEN ** BigInt(places.length);
  const scaled = abs(correct.num) * scale;
  const truncated = scaled / correct.den;
  const rounded = (TWO * scaled + correct.den) / (TWO * correct.den);
  const typed = BigInt(`${whole}${places}`);
  // A run of zeros (".0000" for 1/100000) is never an accepted SAT entry.
  return typed !== ZERO && (typed === truncated || typed === rounded);
}
