// Transfer descriptions (c-transfer table 8.1; TR-50 builds the accessible name from them): the
// plain-text form of normalised question math, cut at 60 characters. Eager and framework-free; it
// imports no calculator parser, renderer or KaTeX module (AR-3).

import { GREEK_IDENTIFIERS, SEGMENT_FUNCTIONS } from "./lex";

export const DESCRIPTION_LIMIT = 60;

const GREEK_LETTERS = "αβγδεζηθικλμνξρσυφχψω";
const GREEK: Readonly<Record<string, string>> = Object.fromEntries(
  GREEK_IDENTIFIERS.map((name, k) => [name, GREEK_LETTERS[k]])
);
const SYMBOL_COMMAND: Readonly<Record<string, [string, Kind]>> = {
  cdot: ["·", "operator"],
  times: ["·", "operator"],
  div: ["÷", "operator"],
  pi: ["π", "operand"],
};
const RELATION_COMMAND: Readonly<Record<string, string>> = {
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
};
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
const OPERATOR_TEXT = /[\s+\-·÷/*^=<>≤≥]/;
const NAME_TEXT = /^\p{L}(?:[₀-₉]+|_[A-Za-z0-9]+)?$/u;
const WRAPS_FRACTION = /^[\p{L}\d(√∛∜]/u;

type Kind = "start" | "operand" | "operator" | "open";

/** One left-to-right scan; `emit` applies the spacing, fraction and function-space rules. */
class PlainWriter {
  private i = 0;
  private readonly out: string[] = [];
  private last: Kind = "start";
  private pendingFraction = -1;
  private functionSpace = false;

  constructor(private readonly s: string) {}

  run(): string {
    while (this.i < this.s.length) this.step();
    return this.out.join("").replace(/ {2,}/g, " ").trim();
  }

  private emit(text: string, kind: Kind, script = false) {
    if (text === "") return;
    if (this.pendingFraction >= 0 && WRAPS_FRACTION.test(text))
      this.out[this.pendingFraction] = `(${this.out[this.pendingFraction]})`;
    this.pendingFraction = -1;
    if (this.functionSpace && !script) {
      if (/^[\p{L}\d]/u.test(text)) text = ` ${text}`;
      this.functionSpace = false;
    }
    this.out.push(text);
    this.last = kind;
  }

  /** `{…}` content, or one character or control word for a brace-less argument. */
  private argument(): string {
    const { s } = this;
    while (/\s/.test(s[this.i] ?? "")) this.i++;
    const start = this.i;
    if (s[start] === "{") {
      let depth = 0;
      for (let k = start; k < s.length; k++) {
        if (s[k] === "\\") k++;
        else if (s[k] === "{") depth++;
        else if (s[k] === "}" && --depth === 0) {
          this.i = k + 1;
          return s.slice(start + 1, k);
        }
      }
      this.i = s.length;
      return s.slice(start + 1);
    }
    if (s[start] === "\\") {
      let end = start + 1;
      while (/[A-Za-z]/.test(s[end] ?? "")) end++;
      this.i = Math.max(end, start + 2);
      return s.slice(start, this.i);
    }
    this.i = start + 1;
    return s.slice(start, start + 1);
  }

  private step() {
    const ch = this.s[this.i];
    if (/\s/.test(ch)) {
      this.i++;
    } else if (/[0-9.]/.test(ch)) {
      let end = this.i;
      while (/[0-9.]/.test(this.s[end] ?? "")) end++;
      this.emit(this.s.slice(this.i, end), "operand");
      this.i = end;
    } else if (/[A-Za-z]/.test(ch)) {
      let end = this.i;
      while (/[A-Za-z]/.test(this.s[end] ?? "")) end++;
      const run = this.s.slice(this.i, end);
      if (SEGMENT_FUNCTIONS.includes(run)) {
        this.i = end;
        this.function(run);
      } else {
        this.emit(ch, "operand");
        this.i++;
      }
    } else if (ch === "\\") this.command();
    else if (ch === "^" || ch === "_") {
      this.i++;
      this.script(ch);
    } else this.symbol(ch);
  }

  private symbol(ch: string) {
    this.i++;
    if (ch === "=" || ch === "<" || ch === ">") this.emit(` ${ch} `, "operator");
    else if (ch === "+" || ch === "-")
      this.emit(this.last === "operand" ? ` ${ch} ` : ch, "operator");
    else if (ch === "(" || ch === "[") this.emit(ch, "open");
    else if (ch === ")" || ch === "]") this.emit(ch, "operand");
    else if (ch === "|") this.emit("|", this.last === "operand" ? "operand" : "open");
    else if (ch === "," || ch === ";") this.emit(`${ch} `, "operator");
    else if (ch === "*") this.emit("·", "operator");
    else if (ch === "/") this.emit("/", "operator");
    else if (ch === "{" || ch === "}" || ch === "&") return;
    else this.emit(ch, "operand");
  }

  private command() {
    const { s } = this;
    const start = this.i;
    let end = start + 1;
    while (/[A-Za-z]/.test(s[end] ?? "")) end++;
    if (end === start + 1) {
      const next = s[start + 1] ?? "";
      this.i = start + 2;
      if (next === "{" || next === "}") this.emit(next, next === "{" ? "open" : "operand");
      return;
    }
    const word = s.slice(start + 1, end);
    this.i = end;
    if (word === "left" || word === "right") return this.delimiter(word);
    if (word === "frac") return this.fraction();
    if (word === "sqrt") return this.radical();
    if (RELATION_COMMAND[word]) return this.emit(` ${RELATION_COMMAND[word]} `, "operator");
    const symbol = SYMBOL_COMMAND[word];
    if (symbol) return this.emit(symbol[0], symbol[1]);
    if (GREEK[word]) return this.emit(GREEK[word], "operand");
    if (SEGMENT_FUNCTIONS.includes(word)) return this.function(word);
    this.emit(word, "operand");
  }

  private delimiter(word: "left" | "right") {
    while (/\s/.test(this.s[this.i] ?? "")) this.i++;
    const d = this.s[this.i];
    if (d === undefined) return;
    if (d === "\\") {
      this.i += 2;
      const brace = this.s[this.i - 1];
      if (brace === "{" || brace === "}") this.emit(brace, word === "left" ? "open" : "operand");
      return;
    }
    this.i++;
    if (d !== ".") this.emit(d, word === "left" ? "open" : "operand");
  }

  private function(name: string) {
    this.emit(name, "operand");
    this.functionSpace = true;
  }

  private script(mark: "^" | "_") {
    const keepSpace = this.functionSpace;
    const text = plainMath(this.argument());
    let piece: string;
    if (mark === "_") {
      piece = /^\d+$/.test(text)
        ? [...text].map((d) => SUBSCRIPT_DIGITS[Number(d)]).join("")
        : `_${text}`;
    } else if (text === "2" || text === "3") piece = text === "2" ? "²" : "³";
    else piece = /^\d+$/.test(text) || [...text].length === 1 ? `^${text}` : `^(${text})`;
    this.emit(piece, "operand", true);
    this.functionSpace = keepSpace;
  }

  private fraction() {
    const part = (latex: string) => {
      const text = plainMath(latex);
      return OPERATOR_TEXT.test(text) ? `(${text})` : text;
    };
    const num = part(this.argument());
    const den = part(this.argument());
    this.emit(`${num}/${den}`, "operand");
    this.pendingFraction = this.out.length - 1;
  }

  private radical() {
    while (/\s/.test(this.s[this.i] ?? "")) this.i++;
    let index: string | null = null;
    if (this.s[this.i] === "[") {
      const close = this.s.indexOf("]", this.i);
      index = plainMath(this.s.slice(this.i + 1, close < 0 ? this.s.length : close));
      this.i = close < 0 ? this.s.length : close + 1;
    }
    const arg = plainMath(this.argument());
    const bare = /^\d+$/.test(arg) || NAME_TEXT.test(arg);
    if (index === null || index === "2") this.emit(bare ? `√${arg}` : `√(${arg})`, "operand");
    else if (index === "3" || index === "4")
      this.emit(`${index === "3" ? "∛" : "∜"}${bare ? arg : `(${arg})`}`, "operand");
    else this.emit(`√[${index}](${arg})`, "operand");
  }
}

/** The plain-text form of normalised question math (table 8.1). */
export function plainMath(latex: string): string {
  return new PlainWriter(latex).run();
}

/** plainMath cut to DESCRIPTION_LIMIT characters, then "…". */
export function describeMath(latex: string): string {
  const text = plainMath(latex);
  return text.length > DESCRIPTION_LIMIT ? `${text.slice(0, DESCRIPTION_LIMIT)}…` : text;
}

export function describeSystem(kinds: readonly ("equation" | "inequality")[]): string {
  const n = kinds.length;
  const noun = kinds.every((k) => k === "equation")
    ? n === 1
      ? "equation"
      : "equations"
    : kinds.every((k) => k === "inequality")
      ? n === 1
        ? "inequality"
        : "inequalities"
      : "equations and inequalities";
  return `system of ${n} ${noun}`;
}

export function describeChoice(letter: string): string {
  return `choice ${letter}`;
}
