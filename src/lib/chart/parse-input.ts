// ============================================================
// Parsers for the Desmos-style ChartFigureEditor inputs. Three
// kinds of text input, three pure functions. Each returns the
// parsed structure on success, or a string error message on
// failure (which the editor surfaces below the input).
//
// Used by src/components/admin/ChartFigureEditor.tsx — the
// editor wires onChange → parse → live preview via ChartFigure.
//
// Design rule: the parsers are LENIENT about whitespace + the
// common ways a human types math, but STRICT about emitting only
// the 4 supported function families. Anything outside those
// families surfaces as an error rather than silently round-
// tripping bad data.
// ============================================================

import type { FunctionSeries } from "@/types/chart";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

// ── Equation parser ──────────────────────────────────────────
// Supports:
//   y = mx + b              → linear
//   y = ax^2 + bx + c       → quadratic
//   y = a|x - h| + k        → absolute_value
//   y = a * b^x             → exponential
//
// f(x) = ... is treated the same as y = ...
//
// Normalization: strips whitespace, lowers case, swaps unicode
// minus, removes the "y =" / "f(x) =" prefix. Multiplication can
// be implicit (3x), explicit (3*x), or use × (3×x).

export function parseEquation(input: string): ParseResult<FunctionSeries["expression"]> {
  const s = normalizeEquation(input);
  if (!s) return { ok: false, error: "Equation is empty." };

  // Try each family in order of specificity. The order matters —
  // quadratic must be tried before linear because "x^2 + 1" would
  // partially match the linear pattern.
  return (
    tryQuadratic(s) ??
    tryAbsoluteValue(s) ??
    tryExponential(s) ??
    tryLinear(s) ??
    unsupported(input)
  );
}

function normalizeEquation(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-") // unicode minus / dashes
    .replace(/×/g, "*")
    .replace(/^[yf]\s*\(?\s*x?\s*\)?\s*=\s*/, "") // strip y= or f(x)=
    .replace(/\s+/g, ""); // collapse all whitespace
}

function unsupported(raw: string): ParseResult<FunctionSeries["expression"]> {
  return {
    ok: false,
    error: `Couldn't read "${raw}" — supported shapes: y = mx+b, y = ax^2+bx+c, y = a|x-h|+k, y = a*b^x`,
  };
}

// ── Linear: y = mx + b ───────────────────────────────────────
function tryLinear(s: string): ParseResult<FunctionSeries["expression"]> | null {
  // Captures m (with sign) and b (with sign). m is optional (e.g.
  // "x + 1" → m=1, b=1). b is optional (e.g. "2x" → m=2, b=0).
  // Also handles "-x + 5" (m=-1) and just "5" (m=0, b=5).
  const m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)?)x([+-](?:\d+\.?\d*|\.\d+))?$/);
  if (m) {
    const slope = parseCoefficient(m[1], 1);
    const intercept = m[2] ? parseFloat(m[2]) : 0;
    return { ok: true, value: { kind: "linear", m: slope, b: intercept } };
  }
  // Constant (horizontal line): just a number, e.g. "5" or "-3.2"
  const c = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))$/);
  if (c) {
    return { ok: true, value: { kind: "linear", m: 0, b: parseFloat(c[1]) } };
  }
  return null;
}

// ── Quadratic: y = ax^2 + bx + c ──────────────────────────────
function tryQuadratic(s: string): ParseResult<FunctionSeries["expression"]> | null {
  // Must contain x^2. Everything else is optional.
  if (!/x\^2/.test(s)) return null;
  // Pattern: optional sign + optional coef + x^2, optional ±bx
  // (the x is REQUIRED when this group matches so "+5" can't
  // accidentally bind to the b slot), optional ±c.
  const m = s.match(
    /^([+-]?(?:\d+\.?\d*|\.\d+)?)x\^2(?:([+-](?:\d+\.?\d*|\.\d+)?)x)?([+-](?:\d+\.?\d*|\.\d+))?$/
  );
  if (!m) return null;
  const a = parseCoefficient(m[1], 1);
  const b = m[2] ? parseCoefficient(m[2], 1) : 0;
  const c = m[3] ? parseFloat(m[3]) : 0;
  return { ok: true, value: { kind: "quadratic", a, b, c } };
}

// ── Absolute value: y = a|x - h| + k ─────────────────────────
function tryAbsoluteValue(s: string): ParseResult<FunctionSeries["expression"]> | null {
  if (!s.includes("|")) return null;
  // Pattern: optional ±a, |x ± h|, optional ±k
  const m = s.match(
    /^([+-]?(?:\d+\.?\d*|\.\d+)?)\|x([+-](?:\d+\.?\d*|\.\d+))?\|([+-](?:\d+\.?\d*|\.\d+))?$/
  );
  if (!m) return null;
  const a = parseCoefficient(m[1], 1);
  // The inside of the | | is `x - h` so to get h we NEGATE what's
  // inside: "|x - 3|" has h=3, "|x + 2|" has h=-2. Coerce -0 → 0
  // via `|| 0` so callers never see negative zero.
  const inside = m[2] ? parseFloat(m[2]) : 0;
  const h = -inside || 0;
  const k = m[3] ? parseFloat(m[3]) : 0;
  return { ok: true, value: { kind: "absolute_value", a, h, k } };
}

// ── Exponential: y = a * b^x  or  y = ab^x ────────────────────
function tryExponential(s: string): ParseResult<FunctionSeries["expression"]> | null {
  if (!s.includes("^x")) return null;
  // With explicit "*": "2*3^x"
  let m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\*((?:\d+\.?\d*|\.\d+))\^x$/);
  if (m) {
    return { ok: true, value: { kind: "exponential", a: parseFloat(m[1]), b: parseFloat(m[2]) } };
  }
  // Implicit: "2*3^x" without star ("23^x" is ambiguous so we
  // require either an explicit * OR a single-digit/decimal a
  // followed directly by a multi-digit b). Simplest reliable
  // form: just "b^x" (a=1).
  m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\^x$/);
  if (m) {
    return { ok: true, value: { kind: "exponential", a: 1, b: parseFloat(m[1]) } };
  }
  return null;
}

/** Turn a string like "+", "-", "+3", "-2.5", "" into a number.
 *  Falls back to `defaultValue` when the string is empty or just
 *  a sign (the typical "implicit 1" cases like "x" or "+x"). */
function parseCoefficient(raw: string, defaultValue: number): number {
  if (raw === "" || raw === "+") return defaultValue;
  if (raw === "-") return -defaultValue;
  return parseFloat(raw);
}

// ── Points parser ───────────────────────────────────────────
// Accepts loose human formats:
//   (1, 2), (3, 4), (5, 6)
//   (1,2) (3,4)
//   1, 2
//   3, 4
//   1 2
//   3 4
// Returns the list of [x, y] pairs.

export function parsePoints(input: string): ParseResult<Array<[number, number]>> {
  const cleaned = input
    .replace(/[()[\]]/g, " ")
    .replace(/[−–—]/g, "-")
    .replace(/,/g, " ");
  // Split on whitespace and parse pairwise. Reject if odd count.
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { ok: false, error: "No points entered." };
  if (tokens.length % 2 !== 0) {
    return {
      ok: false,
      error: `Expected an even number of values, got ${tokens.length}. Make sure each point has both x and y.`,
    };
  }
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const x = parseFloat(tokens[i]);
    const y = parseFloat(tokens[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { ok: false, error: `Couldn't read "${tokens[i]}, ${tokens[i + 1]}" as numbers.` };
    }
    pairs.push([x, y]);
  }
  return { ok: true, value: pairs };
}

// ── Bars parser ─────────────────────────────────────────────
// Accepts:
//   A: 5, B: 3, C: 8
//   A=5, B=3
//   A 5
//   B 3
//   "Math": 60, "R&W": 40    (quotes for categories with spaces)
// Returns the list of {category, value} entries in order.

export function parseBars(input: string): ParseResult<Array<{ category: string; value: number }>> {
  // Split on lines OR commas; each piece is "category[: =]value".
  const pieces = input
    .split(/[\n,]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (pieces.length === 0) return { ok: false, error: "No bars entered." };
  const bars: Array<{ category: string; value: number }> = [];
  for (const piece of pieces) {
    const m = piece.match(/^["']?([^"':=]+?)["']?\s*[:=\s]\s*([+-]?\d+\.?\d*)\s*$/);
    if (!m) {
      return {
        ok: false,
        error: `Couldn't read "${piece}". Use "Category: value" or "Category = value" or "Category value".`,
      };
    }
    const category = m[1].trim();
    const value = parseFloat(m[2]);
    if (!category) {
      return { ok: false, error: `Bar is missing a category name: "${piece}".` };
    }
    if (!Number.isFinite(value)) {
      return { ok: false, error: `Bar "${category}" has a non-numeric value.` };
    }
    bars.push({ category, value });
  }
  return { ok: true, value: bars };
}
