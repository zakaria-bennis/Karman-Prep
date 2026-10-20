// Tokenizer (parser grammar G1). It reads
// normalizeLatex output; every span is a UTF-16 offset range into that text. Whitespace makes no
// token: numbers ignore it, and the parser reads adjacency from spans (G6, G7, G12).

import type { SourceSpan } from "./ast";
import type { ParseError } from "./errors";
import { isBuiltinName } from "./operator-names";

export type SymbolChar =
  | "+"
  | "-"
  | "*"
  | "/"
  | "^"
  | "_"
  | "!"
  | "%"
  | "="
  | "<"
  | ">"
  | "|"
  | ","
  | ":"
  | "."
  | "'"
  | "~";
export type Token =
  | { t: "digits"; text: string; span: SourceSpan } // digits with at most one ".", inner spaces removed (PR-10)
  | { t: "letter"; ch: string; span: SourceSpan } // one Latin letter
  | { t: "command"; name: string; span: SourceSpan } // no backslash: "frac", "sin", "alpha", "lvert", "rvert"
  | { t: "symbol"; ch: SymbolChar; span: SourceSpan }
  | { t: "open"; ch: "(" | "[" | "{"; span: SourceSpan }
  | { t: "close"; ch: ")" | "]" | "}"; span: SourceSpan }
  | { t: "end"; span: SourceSpan };

const SYMBOLS: ReadonlySet<string> = new Set<SymbolChar>([
  "+",
  "-",
  "*",
  "/",
  "^",
  "_",
  "!",
  "%",
  "=",
  "<",
  ">",
  "|",
  ",",
  ":",
  ".",
  "'",
  "~",
]);
const OPENERS: ReadonlySet<string> = new Set(["(", "[", "{"]);
const CLOSERS: ReadonlySet<string> = new Set([")", "]", "}"]);
const OPERATORNAME = "\\operatorname{";
const ELLIPSIS = "...";

const isDigit = (ch: string | undefined): boolean => ch !== undefined && ch >= "0" && ch <= "9";
const isLetter = (ch: string | undefined): boolean =>
  ch !== undefined && ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z"));
const isSpace = (ch: string | undefined): boolean => ch !== undefined && /\s/.test(ch);

/** One whole character at `i` (a surrogate pair counts as one), so error spans never split it. */
function characterAt(text: string, i: number): string {
  return String.fromCodePoint(text.codePointAt(i) as number);
}

/**
 * Splits normalized LaTeX into tokens ending with `end` (G1), or returns the first character no
 * token type covers: `;` is `unsupported` (FN-80 matrix rows), anything else `syntax`.
 */
export function tokenize(normalized: string): Token[] | ParseError {
  const tokens: Token[] = [];
  let i = 0;
  while (i < normalized.length) {
    const ch = normalized[i];
    const span = (end: number): SourceSpan => ({ start: i, end });
    if (isSpace(ch)) {
      i += 1;
    } else if (normalized.startsWith(ELLIPSIS, i)) {
      // PR-34: a typed or pasted `...` is the range ellipsis, the same token as `\ldots`.
      tokens.push({ t: "command", name: "ldots", span: span(i + ELLIPSIS.length) });
      i += ELLIPSIS.length;
    } else if (ch === "." && isDigit(normalized[i + 1]) && afterDecimal(tokens)) {
      // `1.2.3`: Desmos's "Sorry, I don't know what to do with adjacent numbers '1.2' and '.3'."
      const before = tokens[tokens.length - 1] as Extract<Token, { t: "digits" }>;
      const next = readDigits(normalized, i);
      if (before.text.endsWith(".")) {
        // `1..5`: "Sorry, I don't understand this use of '.' after a constant number."
        return { code: "number-dot", span: span(i + 1), detail: "a dot after a number" };
      }
      return {
        code: "adjacent-numbers",
        span: { start: before.span.start, end: next.span.end },
        detail: "two numbers side by side",
        names: [before.text, next.text],
      };
    } else if (isDigit(ch) || (ch === "." && isDigit(normalized[i + 1]))) {
      const digits = readDigits(normalized, i);
      tokens.push(digits);
      i = digits.span.end;
    } else if (isLetter(ch)) {
      tokens.push({ t: "letter", ch, span: span(i + 1) });
      i += 1;
    } else if (ch === "\\") {
      const command = readCommand(normalized, i);
      if (command === null) {
        return { code: "syntax", span: span(i + 1), detail: "a backslash ends the input" };
      }
      tokens.push(command);
      i = command.span.end;
    } else if (SYMBOLS.has(ch)) {
      tokens.push({ t: "symbol", ch: ch as SymbolChar, span: span(i + 1) });
      i += 1;
    } else if (OPENERS.has(ch)) {
      tokens.push({ t: "open", ch: ch as "(" | "[" | "{", span: span(i + 1) });
      i += 1;
    } else if (CLOSERS.has(ch)) {
      tokens.push({ t: "close", ch: ch as ")" | "]" | "}", span: span(i + 1) });
      i += 1;
    } else if (ch === ";") {
      return {
        code: "unsupported",
        span: span(i + 1),
        detail: '";" (matrix rows) is not supported',
      };
    } else {
      // Desmos names a character it does not read: "Sorry, I don't understand the '@' symbol."
      const character = characterAt(normalized, i);
      return {
        code: "unknown-symbol",
        span: span(i + character.length),
        detail: `unexpected character "${character}"`,
        feature: character,
      };
    }
  }
  tokens.push({ t: "end", span: { start: normalized.length, end: normalized.length } });
  return tokens;
}

/** True when the last token is a number that already holds a decimal point (`1.2.3`, G1). */
function afterDecimal(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1];
  return last !== undefined && last.t === "digits" && last.text.includes(".");
}

/**
 * The number starting at `start`: digits with at most one `.`, continuing across whitespace when
 * a digit or the first `.` follows it; a `.` that starts `...` ends the number (PR-34). Whitespace is dropped from `text` but stays inside the span,
 * so the parser can tell `x1` from `x 1` (PR-14).
 */
function readDigits(text: string, start: number): Extract<Token, { t: "digits" }> {
  let digits = "";
  let end = start;
  let i = start;
  for (;;) {
    const ch = text[i];
    if (isDigit(ch) || (ch === "." && !digits.includes(".") && !text.startsWith(ELLIPSIS, i))) {
      digits += ch;
      i += 1;
      end = i;
      continue;
    }
    let next = i;
    while (isSpace(text[next])) next += 1;
    const after = text[next];
    if (next === i || !(isDigit(after) || (after === "." && !digits.includes(".")))) break;
    i = next;
  }
  return { t: "digits", text: digits, span: { start, end } };
}

/**
 * The command at the backslash `start` (G1): `\name` for a run of letters, `\` plus one other
 * character for that character, `\%` the symbol `%`, and `\operatorname{n}` with an allowlisted n
 * one command `n` over the whole text. Null when the backslash is the last character.
 */
function readCommand(text: string, start: number): Token | null {
  const next = text[start + 1];
  if (next === undefined) return null;
  if (!isLetter(next)) {
    const character = characterAt(text, start + 1);
    const span = { start, end: start + 1 + character.length };
    return character === "%"
      ? { t: "symbol", ch: "%", span }
      : { t: "command", name: character, span };
  }
  if (text.startsWith(OPERATORNAME, start)) {
    let end = start + OPERATORNAME.length;
    while (isLetter(text[end])) end += 1;
    const name = text.slice(start + OPERATORNAME.length, end);
    if (text[end] === "}" && isBuiltinName(name)) {
      return { t: "command", name, span: { start, end: end + 1 } };
    }
  }
  let end = start + 1;
  while (isLetter(text[end])) end += 1;
  return { t: "command", name: text.slice(start + 1, end), span: { start, end } };
}
