import katex from "katex";

/** Remove only a complete math wrapper, never currency or stray delimiters. */
export function unwrapMath(raw: string): string | null {
  const value = raw.trim();
  for (const [open, close] of [
    ["$$", "$$"],
    ["$", "$"],
    ["\\(", "\\)"],
    ["\\[", "\\]"],
  ]) {
    if (value.startsWith(open)) {
      if (!value.endsWith(close) || value.length <= open.length + close.length) return null;
      const body = value.slice(open.length, -close.length).trim();
      return /\$|\\[()[\]]/.test(body) ? null : body;
    }
  }
  return /\$|\\[()[\]]/.test(value) ? null : value;
}

const COMMANDS = new Set([
  "frac",
  "sqrt",
  "left",
  "right",
  "cdot",
  "times",
  "pi",
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
]);
export function validatedDesmosMath(raw: string): string | null {
  const latex = unwrapMath(raw)?.replace(/−/g, "-");
  if (!latex || latex.length > 500 || /[;<>]|\\\\/.test(latex)) return null;
  if ([...latex.matchAll(/\\([a-zA-Z]+)/g)].some((m) => !COMMANDS.has(m[1]))) return null;
  const plain = latex.replace(/\\[a-zA-Z]+/g, "");
  if (/[^a-zA-Z0-9\s=+\-*/^_().{},|\[\]]/.test(plain) || /[a-zA-Z]{3,}/.test(plain)) return null;
  try {
    katex.renderToString(latex, { throwOnError: true, strict: "error", trust: false });
    return latex;
  } catch {
    return null;
  }
}

type Rational = { n: bigint; d: bigint };
const ZERO = BigInt(0),
  ONE = BigInt(1),
  TEN = BigInt(10);
function rational(n: bigint, d: bigint): Rational {
  if (d === ZERO) throw new Error("Undefined value");
  if (d < ZERO) {
    n = -n;
    d = -d;
  }
  let a = n < ZERO ? -n : n,
    b = d;
  while (b !== ZERO) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return { n: n / a, d: d / a };
}
function decimalLiteral(value: string): Rational {
  const [mantissa, exponent = "0"] = value.toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const shift = Number(exponent) - fraction.length;
  if (Math.abs(shift) > 100) throw new Error("Value too large");
  const n = BigInt((whole || "0") + fraction);
  return shift >= 0 ? rational(n * TEN ** BigInt(shift), ONE) : rational(n, TEN ** BigInt(-shift));
}

/** Small bounded arithmetic parser; no eval, floating-point rounding or stripping of units. */
export function numericDesmosCell(raw: string): { latex: string; repeating: boolean } | null {
  const unwrapped = unwrapMath(raw);
  if (!unwrapped || unwrapped.length > 200) return null;
  const value = unwrapped.replace(/−/g, "-").replace(/\\(?:cdot|times)/g, "*");
  const tokens = value.match(/\\frac|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[+\-*/^(){}]/g) ?? [];
  if (tokens.join("") !== value.replace(/\s/g, "")) return null;
  let cursor = 0,
    depth = 0;
  const peek = () => tokens[cursor];
  const consume = (token: string) => {
    if (tokens[cursor++] !== token) throw new Error("Invalid math");
  };
  function group(): Rational {
    if (++depth > 20) throw new Error("Nested math");
    let result: Rational;
    const token = tokens[cursor++];
    if (token === "(" || token === "{") {
      result = sum();
      consume(token === "(" ? ")" : "}");
    } else if (token === "\\frac") {
      consume("{");
      const a = sum();
      consume("}");
      consume("{");
      const b = sum();
      consume("}");
      result = rational(a.n * b.d, a.d * b.n);
    } else if (token && /^(?:\d|\.)/.test(token)) result = decimalLiteral(token);
    else throw new Error("Unsupported value");
    depth--;
    return result;
  }
  function power(): Rational {
    const a = group();
    if (peek() !== "^") return a;
    cursor++;
    const b = unary();
    if (b.d !== ONE || b.n < BigInt(-20) || b.n > BigInt(20)) throw new Error("Unsupported power");
    const exponent = b.n < ZERO ? -b.n : b.n;
    return b.n < ZERO
      ? rational(a.d ** exponent, a.n ** exponent)
      : rational(a.n ** exponent, a.d ** exponent);
  }
  function unary(): Rational {
    if (peek() === "+") {
      cursor++;
      return unary();
    }
    if (peek() === "-") {
      cursor++;
      const a = unary();
      return { n: -a.n, d: a.d };
    }
    return power();
  }
  function product(): Rational {
    let a = unary();
    while (peek() === "*" || peek() === "/") {
      const op = tokens[cursor++],
        b = unary();
      a = op === "*" ? rational(a.n * b.n, a.d * b.d) : rational(a.n * b.d, a.d * b.n);
    }
    return a;
  }
  function sum(): Rational {
    let a = product();
    while (peek() === "+" || peek() === "-") {
      const op = tokens[cursor++],
        b = product();
      a = rational(a.n * b.d + (op === "+" ? b.n : -b.n) * a.d, a.d * b.d);
    }
    return a;
  }
  try {
    const parsed = sum();
    if (cursor !== tokens.length) return null;
    let denominator = parsed.d,
      twos = 0,
      fives = 0;
    while (denominator % BigInt(2) === ZERO) {
      denominator /= BigInt(2);
      twos++;
    }
    while (denominator % BigInt(5) === ZERO) {
      denominator /= BigInt(5);
      fives++;
    }
    if (denominator !== ONE) return { latex: `\\frac{${parsed.n}}{${parsed.d}}`, repeating: true };
    const places = Math.max(twos, fives);
    if (places > 200) return null;
    const scaled = parsed.n * (TEN ** BigInt(places) / parsed.d);
    const digits = (scaled < ZERO ? -scaled : scaled).toString().padStart(places + 1, "0");
    const decimal = places
      ? `${digits.slice(0, -places)}.${digits.slice(-places)}`.replace(/\.?0+$/, "")
      : digits;
    return { latex: `${scaled < ZERO ? "-" : ""}${decimal}`, repeating: false };
  } catch {
    return null;
  }
}
