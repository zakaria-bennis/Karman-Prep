// Reads the value of a choice or an answer line written in the lessons' marks ($...$ math), for the
// answer checks in lessons.test.ts. Tests only.
import { evaluate } from "mathjs";
import type { Expect } from "./types";

/** The math inside a choice: every $...$ joined, or the whole text when it has none. */
function mathOf(text: string): string {
  const parts = [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
  return parts.length ? parts.join(" ") : text;
}

/** The index just past the brace group that opens at `open`. */
function closeOf(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return i + 1;
  }
  return -1;
}

/** LaTeX to mathjs: fractions, roots, pi, degrees, percents, products, unicode minus. */
export function toMathjs(latex: string): string {
  let s = latex
    .replace(/\\text\{[^}]*\}/g, "")
    .replace(/\\(left|right|displaystyle)/g, "")
    .replace(/\\[,;!: ]/g, "")
    .replace(/\^\{?\\circ\}?/g, "")
    .replace(/°/g, "")
    .replace(/\\%/g, "")
    .replace(/%/g, "")
    .replace(/\\[dt]frac/g, "\\frac")
    .replace(/−/g, "-")
    .replace(/\\(cdot|times)/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\pi/g, " pi ");
  // \frac{a}{b} and \sqrt{a}, innermost first
  for (let guard = 0; /\\frac|\\sqrt/.test(s) && guard < 50; guard++) {
    s = s.replace(/\\sqrt\[([^\]]+)\]\{/g, "\\nroot{$1}{");
    const at = s.search(/\\frac\{|\\sqrt\{|\\nroot\{/);
    if (at < 0) break;
    const name = s.slice(at).match(/^\\(frac|sqrt|nroot)/)![1];
    const a0 = at + name.length + 1;
    const a1 = closeOf(s, a0);
    if (a1 < 0) break;
    const a = s.slice(a0 + 1, a1 - 1);
    if (name === "sqrt") {
      s = `${s.slice(0, at)} sqrt(${a}) ${s.slice(a1)}`;
      continue;
    }
    const b1 = closeOf(s, a1);
    if (b1 < 0) break;
    const b = s.slice(a1 + 1, b1 - 1);
    s =
      name === "frac"
        ? `${s.slice(0, at)} ((${a})/(${b})) ${s.slice(b1)}`
        : `${s.slice(0, at)} nthRoot(${b}, ${a}) ${s.slice(b1)}`;
  }
  return s
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/(\d),(\d{3})(?!\d)/g, "$1$2")
    .trim();
}

/** The right-hand side of an equation ("x = 4" gives "4"); the text itself otherwise. */
function rhs(s: string): string {
  const parts = s.split(/(?<![<>!])=(?!=)/);
  return parts[parts.length - 1];
}

/** The number a choice stands for, or null. */
export function numberOf(text: string): number | null {
  try {
    const v = evaluate(toMathjs(rhs(mathOf(text))));
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** The pair a choice stands for, "(3, -2)", or null. */
export function pairOf(text: string): [number, number] | null {
  const m = mathOf(text).match(/^\s*\(([^,]+),([^)]+)\)\s*$/);
  if (!m) return null;
  const a = numberOf(`$${m[1]}$`);
  const b = numberOf(`$${m[2]}$`);
  return a === null || b === null ? null : [a, b];
}

/** A choice as an expression in its one variable (whatever letter it uses), or null. */
export function expressionOf(text: string): ((x: number) => number) | null {
  const expr = toMathjs(rhs(mathOf(text)));
  const letters = [...new Set(expr.replace(/sqrt|nthRoot|pi/g, "").match(/[a-zA-Z]/g) ?? [])];
  if (letters.length > 1) return null;
  const v = letters[0] ?? "x";
  return (x: number) => {
    try {
      const out = evaluate(expr, { [v]: x });
      return typeof out === "number" ? out : NaN;
    } catch {
      return NaN;
    }
  };
}

const close = (a: number, b: number) =>
  Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const squash = (s: string) => s.toLowerCase().replace(/[\s$]/g, "");
const XS = [-3.1, -1.3, 0.7, 2.2, 5.9];

/** True when this choice (or answer line) is what the check expects. */
export function meets(expect: Expect, text: string, index: number): boolean {
  if (typeof expect === "number") {
    const v = numberOf(text);
    return v !== null && close(v, expect);
  }
  if (typeof expect === "function") {
    const f = expressionOf(text);
    if (!f) return false;
    const tried = XS.filter((x) => Number.isFinite(expect(x)));
    return tried.length >= 3 && tried.every((x) => close(f(x), expect(x)));
  }
  if (Array.isArray(expect)) {
    const p = pairOf(text);
    return p !== null && close(p[0], expect[0]) && close(p[1], expect[1]);
  }
  if ("index" in expect) return index === expect.index;
  return squash(text).includes(squash((expect as { text: string }).text));
}
