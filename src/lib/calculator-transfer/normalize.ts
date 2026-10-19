// Question-dialect normalisation (TR-7, table 4.1; PR-5 thousands groups; PR-6 and TR-28 mixed
// numbers). Rewrites question math into the calculator's typed dialect before classification and
// transfer. Eager and framework-free: it imports nothing, least of all the calculator parser (AR-3).

export type QuestionMathContext = "math" | "cell" | "coordinate";

/** Decision 2: plain text has none of `\ { } ^ _`; only then do the plain `a/b` rules apply. */
export function isPlainMathText(text: string): boolean {
  return !/[\\{}^_]/.test(text);
}

const REMOVED_WORD = /^(?:displaystyle|quad|(?:big|Big|bigg|Bigg)[lrm]?)$/;
const RENAMED_WORD: Readonly<Record<string, string>> = {
  dfrac: "frac",
  tfrac: "frac",
  leq: "le",
  geq: "ge",
  times: "cdot",
};
const REMOVED_SYMBOL = new Set([",", ";", ":", "!"]);
const CHARACTER: Readonly<Record<string, string>> = {
  "−": "-",
  "–": "-",
  "×": "\\cdot",
  "·": "\\cdot",
  "÷": "\\div",
  "≤": "\\le",
  "≥": "\\ge",
  "²": "^{2}",
  "³": "^{3}",
  π: "\\pi",
  θ: "\\theta",
};
const isLetter = (ch: string | undefined) => ch !== undefined && /^[A-Za-z]$/.test(ch);

/** The control word starting at `i` (a `\` at `i`), or null for a control symbol. */
function controlWordAt(s: string, i: number): { name: string; end: number } | null {
  let end = i + 1;
  while (isLetter(s[end])) end++;
  return end > i + 1 ? { name: s.slice(i + 1, end), end } : null;
}

/**
 * Pass 1 (decision 3): one left-to-right scan of the single-symbol rewrites and removals. A control
 * word consumes the spaces after it; one space separates a written command from a following letter.
 */
function scanSymbols(input: string): string {
  let out = "";
  const emit = (piece: string) => {
    if (isLetter(piece[0]) && /\\[A-Za-z]+$/.test(out)) out += " ";
    out += piece;
  };
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "\\") {
      const word = controlWordAt(input, i);
      if (!word) {
        const next = input[i + 1];
        if (next === undefined) emit("\\");
        else if (!REMOVED_SYMBOL.has(next)) emit(`\\${next}`);
        i += 2;
        continue;
      }
      let k = word.end;
      while (input[k] === " ") k++;
      if (word.name === "text" && input[k] === "{") {
        const close = input.indexOf("}", k);
        const content = close < 0 ? null : input.slice(k + 1, close);
        if (content !== null && !content.includes("{") && /^\s*$/.test(content)) {
          i = close + 1;
          continue;
        }
        emit("\\text");
        i = k;
        continue;
      }
      if (!REMOVED_WORD.test(word.name)) emit(`\\${RENAMED_WORD[word.name] ?? word.name}`);
      i = k;
      continue;
    }
    emit(CHARACTER[ch] ?? ch);
    i++;
  }
  return out;
}

/** Pass 3: `√(` with its balanced `)` becomes `\sqrt{…}`, innermost last; unbalanced stays. */
function rewriteRadicals(s: string): string {
  let from = 0;
  for (;;) {
    const start = s.indexOf("√(", from);
    if (start < 0) return s;
    let depth = 0,
      close = -1;
    for (let j = start + 1; j < s.length; j++) {
      if (s[j] === "(") depth++;
      else if (s[j] === ")" && --depth === 0) {
        close = j;
        break;
      }
    }
    if (close < 0) {
      from = start + 2;
      continue;
    }
    s = `${s.slice(0, start)}\\sqrt{${s.slice(start + 2, close)}}${s.slice(close + 1)}`;
  }
}

/** Pass 4 (decision 2): plain `a b/c` and `a/b` with integer literals. */
function rewritePlainFractions(s: string): string {
  return s
    .replace(/(?<![A-Za-z0-9.^_}\\])(\d+) +(\d+)\/(\d+)(?![\d.^])/g, "$1\\frac{$2}{$3}")
    .replace(/(?<![A-Za-z0-9.^_}\\])(\d+)\/(\d+)(?![\d.^])/g, "\\frac{$1}{$2}");
}

const gcd = (a: bigint, b: bigint): bigint => (b === BigInt(0) ? a : gcd(b, a % b));

/** Pass 5: `A.B\overline{C}` becomes its exact reduced fraction; over 15 digits it stays. */
function rewriteRepeatingDecimals(s: string): string {
  return s.replace(/(\d*)\.(\d*)\\overline\{(\d+)\}/g, (whole, a: string, b: string, c: string) => {
    if (a.length + b.length + c.length > 15) return whole;
    const ten = BigInt(10),
      one = BigInt(1);
    const fixed = ten ** BigInt(b.length),
      repeat = ten ** BigInt(c.length) - one;
    const n = (BigInt(a || "0") * fixed + BigInt(b || "0")) * repeat + BigInt(c);
    const d = fixed * repeat;
    const g = gcd(n, d);
    return d / g === one ? `${n / g}` : `\\frac{${n / g}}{${d / g}}`;
  });
}

const BAR_OPENER_CONTEXT = /(?:[+\-*/^=<>([{,]|\\cdot|\\div|\\le|\\ge|\\left\|)$/;

/**
 * Pass 6 (PR-21, 02's G11): raw `|` bars pair left to right. A bar closes the innermost open bar
 * unless it follows an operator, relation, opening bracket, comma or opening bar; otherwise it
 * opens. Paired bars become `\left|` and `\right|`; an unpaired input keeps all its raw bars.
 */
function pairRawBars(s: string): string {
  const open: number[] = [];
  const role = new Map<number, "open" | "close">();
  let lastOpenBarEnd = -1;
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\\") {
      const word = controlWordAt(s, i);
      if (word && (word.name === "left" || word.name === "right") && s[word.end] === "|") {
        i = word.end + 1;
        if (word.name === "left") lastOpenBarEnd = i;
        continue;
      }
      i = word ? word.end : i + 2;
      continue;
    }
    if (s[i] === "|") {
      const before = s.slice(0, i).trimEnd();
      const openerContext = before.length === lastOpenBarEnd || BAR_OPENER_CONTEXT.test(before);
      const innermost = open.at(-1);
      if (innermost !== undefined && !openerContext) {
        open.pop();
        role.set(innermost, "open");
        role.set(i, "close");
      } else {
        open.push(i);
        lastOpenBarEnd = i + 1;
      }
    }
    i++;
  }
  if (open.length > 0 || role.size === 0) return s;
  let out = "";
  for (let j = 0; j < s.length; j++) {
    const r = role.get(j);
    out += r === "open" ? "\\left|" : r === "close" ? "\\right|" : s[j];
  }
  return out;
}

const MIXED_PREFIX = /(?:^|[+\-*/=<>,([{]|\\cdot|\\div|\\le|\\ge)$/;

/**
 * Pass 8 (PR-6, TR-28, decision 12, D1): an integer, optional spaces, then `\frac{b}{c}` with
 * integer literals 0 < b < c, at the start of the math or after an operator, relation, comma or
 * opening bracket, is a mixed number: a parenthesised sum in math, an improper fraction in table
 * cells and point coordinates. Only the braced `\frac` spelling matches (D3).
 */
function rewriteMixedNumbers(s: string, context: QuestionMathContext): string {
  return s.replace(
    /(\d+)\s*\\frac\{(\d+)\}\{(\d+)\}/g,
    (whole, a: string, b: string, c: string, offset: number) => {
      const before = s.slice(0, offset);
      if (/[\d.]$/.test(before) || !MIXED_PREFIX.test(before.trimEnd())) return whole;
      const [whole_, num, den] = [BigInt(a), BigInt(b), BigInt(c)];
      if (num <= BigInt(0) || num >= den) return whole;
      return context === "math"
        ? `\\left(${a}+\\frac{${b}}{${c}}\\right)`
        : `\\frac{${whole_ * den + num}}{${c}}`;
    }
  );
}

/** TR-7: table 4.1, PR-5 and PR-6/TR-28 applied to question math, in the plan's pass order. */
export function normalizeQuestionMath(latex: string, context: QuestionMathContext): string {
  const input = latex.trim();
  const plain = isPlainMathText(input);
  let s = scanSymbols(input);
  s = s.replace(/(\d)\{,\}(?=\d)/g, "$1");
  s = rewriteRadicals(s);
  if (plain) s = rewritePlainFractions(s);
  s = rewriteRepeatingDecimals(s);
  s = pairRawBars(s);
  s = s.replace(/(?<!\\|\\right)[,.;:]$/, "").trim(); // `\right.` closes a system wrapper
  return rewriteMixedNumbers(s, context);
}
