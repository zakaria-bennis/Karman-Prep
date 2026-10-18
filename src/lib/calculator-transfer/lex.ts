// Question-math lexer (TR-8, TR-9; table 4.2). Reads normalised question math (normalize.ts) into
// tokens for the segment grammar, failing at the first token outside table 4.2's allowed column
// (TR-8) or inside its excluded column (TR-9). Eager and framework-free: it imports nothing, least
// of all the v2 parser (AR-3, TR-74).

export type QTokenKind =
  | "num"
  | "name"
  | "pi"
  | "fn"
  | "op"
  | "rel"
  | "open"
  | "close"
  | "absOpen"
  | "absClose"
  | "frac"
  | "sqrt"
  | "comma"
  | "semi"
  | "amp"
  | "newline"
  | "begin"
  | "end"
  | "sysOpen"
  | "sysClose";

/** One token; `start` and `end` are UTF-16 offsets into the lexed string. */
export interface QToken {
  kind: QTokenKind;
  text: string;
  start: number;
  end: number;
}

export type LexResult =
  | { ok: true; tokens: QToken[] }
  | { ok: false; rule: "TR-8" | "TR-9"; detail: string };

export const SEGMENT_FUNCTIONS: readonly string[] = [
  "sin",
  "cos",
  "tan",
  "csc",
  "sec",
  "cot",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "ln",
  "log",
  "exp",
];

export const GREEK_IDENTIFIERS: readonly string[] = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
  "iota",
  "kappa",
  "lambda",
  "mu",
  "nu",
  "xi",
  "rho",
  "sigma",
  "upsilon",
  "phi",
  "chi",
  "psi",
  "omega",
];

export const UNIT_WORDS: readonly string[] = [
  "cm",
  "mm",
  "km",
  "ft",
  "yd",
  "mi",
  "in",
  "hr",
  "kg",
  "lb",
  "oz",
  "mL",
];

/** Table 4.2's excluded commands (TR-9). */
const EXCLUDED_COMMANDS = new Set([
  "prime",
  "ldots",
  "cdots",
  "dots",
  "approx",
  "sim",
  "cong",
  "equiv",
  "ne",
  "neq",
  "pm",
  "mp",
  "infty",
  "in",
  "notin",
  "subset",
  "cup",
  "cap",
  "to",
  "Rightarrow",
  "iff",
  "text",
  "mathrm",
  "textrm",
  "mbox",
  "circ",
  "degree",
  "angle",
  "measuredangle",
  "triangle",
  "overleftrightarrow",
  "overrightarrow",
  "widehat",
  "parallel",
  "perp",
  "square",
  "odot",
  "overline",
]);
/** Excluded single characters (TR-9): prime, `?`, degree mark and currency. */
const EXCLUDED_CHARACTERS = new Set(["'", "?", "°", "$", "¢", "€", "£", "¥"]);
const SYSTEM_ENVIRONMENTS = new Set(["cases", "aligned", "gathered", "array"]);
const MATRIX_ENVIRONMENT = /^[pbvBV]?matrix$|^smallmatrix$/;
const SYMBOL: Readonly<Record<string, QTokenKind>> = {
  "+": "op",
  "-": "op",
  "/": "op",
  "^": "op",
  _: "op",
  "=": "rel",
  "<": "rel",
  ">": "rel",
  "(": "open",
  ")": "close",
  "{": "open",
  "}": "close",
  ",": "comma",
  ";": "semi",
};

const isLetter = (ch: string | undefined) => ch !== undefined && /^[A-Za-z]$/.test(ch);
const isDigit = (ch: string | undefined) => ch !== undefined && ch >= "0" && ch <= "9";
const isSpace = (ch: string | undefined) => ch !== undefined && /^\s$/.test(ch);

class LexFailure extends Error {
  constructor(
    readonly rule: "TR-8" | "TR-9",
    readonly detail: string
  ) {
    super(detail);
  }
}
const fail = (rule: "TR-8" | "TR-9", detail: string): never => {
  throw new LexFailure(rule, detail);
};

/** TR-8, TR-9: lex normalised question math, stopping at the first failing token. */
export function lexQuestionMath(latex: string): LexResult {
  try {
    return { ok: true, tokens: new Lexer(latex).run() };
  } catch (error) {
    if (error instanceof LexFailure) return { ok: false, rule: error.rule, detail: error.detail };
    throw error;
  }
}

class Lexer {
  private i = 0;
  private readonly tokens: QToken[] = [];
  private environments = 0;
  /** Open `\sqrt[` indexes; a `]` closes one and must be followed by `{`. */
  private sqrtIndexes = 0;

  constructor(private readonly s: string) {}

  run(): QToken[] {
    const { s } = this;
    while (this.i < s.length) {
      const ch = s[this.i];
      if (isSpace(ch)) this.i++;
      else if (isDigit(ch) || (ch === "." && isDigit(s[this.i + 1]))) this.number();
      else if (ch === ".") fail(s.startsWith("...", this.i) ? "TR-9" : "TR-8", "stray .");
      else if (isLetter(ch)) this.letters();
      else if (ch === "\\") this.command();
      else this.symbol(ch);
    }
    return this.tokens;
  }

  private push(kind: QTokenKind, text: string, start: number, end: number) {
    this.tokens.push({ kind, text, start, end });
    this.i = end;
  }

  private skipSpaces(from: number): number {
    let k = from;
    while (isSpace(this.s[k])) k++;
    return k;
  }

  private number() {
    const { s } = this;
    const start = this.i;
    let k = start;
    while (isDigit(s[k])) k++;
    if (s[k] === "." && isDigit(s[k + 1])) {
      k++;
      while (isDigit(s[k])) k++;
    }
    if (s[k] === ".") fail(s.startsWith("...", k) ? "TR-9" : "TR-8", "dot after a number");
    this.push("num", s.slice(start, k), start, k);
  }

  /** Decision 5: function names, unit words (D2), long runs and identifier letters. */
  private letters() {
    const { s } = this;
    const start = this.i;
    let end = start;
    while (isLetter(s[end])) end++;
    const run = s.slice(start, end);
    if (SEGMENT_FUNCTIONS.includes(run)) return this.push("fn", run, start, end);
    if (run.length >= 3) fail("TR-9", `letter run ${run}`);
    if (UNIT_WORDS.includes(run) && this.tokens.at(-1)?.kind === "num") fail("TR-9", `unit ${run}`);
    for (let k = start; k < end; k++) {
      if (s[k] === "i") fail("TR-9", "identifier i");
      if (k < end - 1) this.push("name", s[k], k, k + 1);
      else this.identifier(s[k], k, k + 1);
    }
  }

  /** An identifier (letter or Greek command) with its optional `_{[A-Za-z0-9]+}` or `_c`. */
  private identifier(base: string, start: number, end: number) {
    const { s } = this;
    const k = this.skipSpaces(end);
    if (s[k] !== "_") return this.push("name", base, start, end);
    const after = s[k + 1];
    if (after === "{") {
      const close = s.indexOf("}", k + 2);
      const body = close < 0 ? "" : s.slice(k + 2, close);
      if (!/^[A-Za-z0-9]+$/.test(body)) fail("TR-8", "subscript");
      return this.push("name", `${base}_{${body}}`, start, close + 1);
    }
    if (isLetter(after) || isDigit(after))
      return this.push("name", `${base}_{${after}}`, start, k + 2);
    return fail("TR-8", "subscript");
  }

  private command() {
    const { s } = this;
    const start = this.i;
    let end = start + 1;
    while (isLetter(s[end])) end++;
    if (end === start + 1) return this.controlSymbol(start);
    const word = s.slice(start + 1, end);
    const next = this.skipSpaces(end);
    switch (word) {
      case "frac":
        if (s[next] !== "{") fail("TR-8", "brace-less \\frac"); // D3
        return this.push("frac", "\\frac", start, end);
      case "sqrt":
        if (s[next] === "[") this.sqrtIndexes++;
        else if (s[next] !== "{") fail("TR-8", "brace-less \\sqrt"); // D3
        return this.push("sqrt", "\\sqrt", start, end);
      case "cdot":
        return this.push("op", "*", start, end);
      case "div":
        return this.push("op", "/", start, end);
      case "le":
        return this.push("rel", "<=", start, end);
      case "ge":
        return this.push("rel", ">=", start, end);
      case "pi":
        return this.push("pi", "\\pi", start, end);
      case "left":
      case "right":
        return this.delimiter(word, start, next);
      case "begin":
      case "end":
        return this.environment(word, start, next);
    }
    if (SEGMENT_FUNCTIONS.includes(word)) return this.push("fn", word, start, end);
    if (GREEK_IDENTIFIERS.includes(word)) return this.identifier(`\\${word}`, start, end);
    if (EXCLUDED_COMMANDS.has(word)) fail("TR-9", `\\${word}`);
    fail("TR-8", `\\${word}`);
  }

  private controlSymbol(start: number) {
    const next = this.s[start + 1];
    if (next === "\\" && this.environments > 0)
      return this.push("newline", "\\\\", start, start + 2);
    if (next === "$" || next === "%") fail("TR-9", `\\${next}`);
    fail("TR-8", `\\${next ?? ""}`);
  }

  private delimiter(word: "left" | "right", start: number, at: number) {
    const { s } = this;
    const d = s[at];
    const end = at + 1;
    if (word === "left" && d === "(") return this.push("open", "(", start, end);
    if (word === "right" && d === ")") return this.push("close", ")", start, end);
    if (d === "|")
      return this.push(word === "left" ? "absOpen" : "absClose", `\\${word}|`, start, end);
    if (word === "left" && s.startsWith("\\{", at))
      return this.push("sysOpen", "\\left\\{", start, at + 2);
    if (word === "right" && d === ".") return this.push("sysClose", "\\right.", start, end);
    if (d === "[" || d === "]") fail("TR-9", "bracket");
    fail("TR-8", `\\${word}`);
  }

  private environment(word: "begin" | "end", start: number, at: number) {
    const { s } = this;
    const close = s[at] === "{" ? s.indexOf("}", at) : -1;
    const name = close < 0 ? "" : s.slice(at + 1, close);
    if (MATRIX_ENVIRONMENT.test(name)) fail("TR-9", `matrix ${name}`);
    if (!SYSTEM_ENVIRONMENTS.has(name)) fail("TR-8", `environment ${name}`);
    let end = close + 1;
    if (word === "begin" && name === "array") {
      const k = this.skipSpaces(end);
      const specEnd = s[k] === "{" ? s.indexOf("}", k) : -1;
      const spec = specEnd < 0 ? "" : s.slice(k + 1, specEnd).replace(/\s/g, "");
      if ((spec.match(/[lcr]/g) ?? []).length > 1) fail("TR-9", "multi-column array");
      if (!/^[lcr]$/.test(spec)) fail("TR-8", "array column spec");
      end = specEnd + 1;
    }
    this.environments += word === "begin" ? 1 : -1;
    this.push(word, name, start, end);
  }

  private symbol(ch: string) {
    const start = this.i;
    if (ch === "&" && this.environments > 0) return this.push("amp", "&", start, start + 1);
    if (ch === "[") {
      if (this.tokens.at(-1)?.kind !== "sqrt") fail("TR-9", "bracket");
      return this.push("open", "[", start, start + 1);
    }
    if (ch === "]") {
      if (this.sqrtIndexes === 0) fail("TR-9", "bracket");
      this.sqrtIndexes--;
      if (this.s[this.skipSpaces(start + 1)] !== "{") fail("TR-8", "\\sqrt index without argument");
      return this.push("close", "]", start, start + 1);
    }
    if (EXCLUDED_CHARACTERS.has(ch)) fail("TR-9", ch);
    const kind = SYMBOL[ch];
    if (!kind) return fail("TR-8", ch);
    this.push(kind, ch, start, start + 1);
  }
}
