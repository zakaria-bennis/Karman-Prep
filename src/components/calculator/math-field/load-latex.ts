// LaTeX for MathQuill, rewritten before latex(value) and write(latex). Two passes:
// 1. PR-3 spellings MathQuill's LaTeX parser cannot read. Only whole commands match (no letter may
//    follow the name).
// 2. Spellings MathQuill reads differently from parseLatex, respelled so the field's latex() parses
//    to the tree the input does (PR-2):
//    - a letter and digits written apart (`x 1`, PR-14) get `\cdot`; MathQuill drops the space and
//      the parser would read `x1` as `x_{1}`;
//    - a non-empty `{…}` group in atom position becomes `\left(…\right)` (`{x+1}2`), with `\cdot`
//      before it after a Latin identifier so it never becomes a user-function call (PR-23);
//      MathQuill drops the braces;
//    - `\sqrt(…)` (PR-27) becomes `\sqrt{…}`; MathQuill would take `(` as the radicand;
//    - a bare piecewise brace `\{…\}` (PR-31) becomes `\left\{…\right\}`; MathQuill cannot read it.
//    In a built-in's PR-24 run argument `\cdot` would end the run and parentheses right after the
//    name would make an argument list (PR-25), so the first two rules are skipped there, except
//    that a sum in braces right after the name becomes parentheses (`\sin{x+1}`). Spellings such as
//    `\sin x 2` and `\sin x{y+1}` therefore still load as MathQuill reads them; no corpus case
//    writes one.
// Every other character of the input is returned unchanged.

import {
  MEMBER_NAMES,
  OPERATOR_NAMES,
  mathQuillAutoCommands,
  mathQuillAutoOperatorNames,
} from "@/lib/calculator/core/latex/operator-names";

const REWRITES: Readonly<Record<string, string>> = Object.freeze({
  displaystyle: "",
  tfrac: "\\frac",
  leqslant: "\\le",
  geqslant: "\\ge",
  lvert: "\\left|",
  rvert: "\\right|",
});

// group 1: a named command from REWRITES; otherwise one of the spacing commands \, \; \: \!
const PATTERN = /\\(displaystyle|tfrac|leqslant|geqslant|lvert|rvert)(?![a-zA-Z])|\\[,;:!]/g;

type Block = "math" | "text";
/**
 * MathQuill commands that take blocks, and what each block holds: a math block is respelled like
 * the row, a text block (or a name) is copied as written. `\sqrt` also takes an optional `[index]`.
 */
const withBlocks = (blocks: readonly Block[], names: string) =>
  names.split(" ").map((name): [string, readonly Block[]] => [name, blocks]);
const BLOCKS: ReadonlyMap<string, readonly Block[]> = new Map([
  ...withBlocks(["math", "math"], "frac dfrac cfrac fraction binom binomial nthroot"),
  ...withBlocks(
    ["math"],
    "sqrt cbrt mathrm mathit mathbf mathsf mathtt dot hat vec tilde underline overline bar " +
      "overrightarrow overleftarrow overleftrightarrow overarc"
  ),
  ...withBlocks(
    ["text"],
    "text textnormal textrm textup textmd em italic italics emph textit textsl strong bold " +
      "textbf sf textsf tt texttt uppercase lowercase operatorname mathbb"
  ),
  ...withBlocks(["text", "math"], "textcolor class"),
]);

/**
 * The names a letter run splits into, as the parser's G7 split (PR-13): MathQuill's typed names
 * but the inference members, which typing makes names (`T.score`) while stored letters keep their
 * meaning (`pleft` is p·l·e·f·t when loaded).
 */
const RUN_NAMES: ReadonlySet<string> = new Set([
  ...mathQuillAutoOperatorNames()
    .split(" ")
    .filter((name) => !MEMBER_NAMES.includes(name)),
  ...mathQuillAutoCommands().split(" "),
]);
const LONGEST_RUN_NAME = Math.max(...[...RUN_NAMES].map((name) => name.length));
/** Names that start a built-in call and its run argument (G8); the others are operator words. */
const CALL_NAMES: ReadonlySet<string> = new Set(
  OPERATOR_NAMES.filter((n) => n.category !== null).map((n) => n.name)
);
const OPERATOR_WORDS: ReadonlySet<string> = new Set(
  OPERATOR_NAMES.filter((n) => n.category === null).map((n) => n.name)
);
/** Commands and characters that join terms, relations or items: a run argument ends there (G3). */
const OPERATOR_COMMANDS: ReadonlySet<string> = new Set(
  "cdot times div le leq ge geq lt gt".split(" ")
);
const OPERATOR_CHARS: ReadonlySet<string> = new Set(["*", "/", "=", "<", ">", ":"]);
/** Postfix signs, which leave a run argument where it was (PR-20). */
const POSTFIX_CHARS: ReadonlySet<string> = new Set(["!", "%", "'"]);
/** Text-style wrappers that hold an operator name (PR-3). */
const NAME_WRAPPERS: ReadonlySet<string> = new Set(["operatorname", "text", "mathrm"]);

interface Scan {
  readonly s: string;
  i: number;
}
/** The previous item of a sequence, for the rules that look back. */
type Last = "identifier" | "other";
/**
 * Where a sequence stands in a built-in's PR-24 run argument (G8): `start` right after the name,
 * its `_` base or `^` power and any leading signs; `factors` once a factor of the run is read.
 */
type Run = "none" | "start" | "factors";
interface Sequence {
  text: string;
  comma: boolean; // a `,` outside brackets
  sum: boolean; // a `+` or `-` outside brackets after the first item
}

const isLetter = (ch: string | undefined): boolean => ch !== undefined && /^[a-zA-Z]$/.test(ch);
const isDigit = (ch: string | undefined): boolean => ch !== undefined && ch >= "0" && ch <= "9";
const isSpace = (ch: string | undefined): boolean => ch !== undefined && /^\s$/.test(ch);
const afterFactor = (run: Run): Run => (run === "none" ? "none" : "factors");
const afterName = (name: string, run: Run): Run =>
  CALL_NAMES.has(name) ? "start" : OPERATOR_WORDS.has(name) ? "none" : afterFactor(run);

export function toMathFieldLatex(latex: string): string {
  const source = latex.replace(PATTERN, (_match: string, name: string | undefined) =>
    name === undefined ? "" : REWRITES[name]
  );
  return sequence({ s: source, i: 0 }, null).text;
}

/**
 * One math sequence up to `close` outside brackets, or a `}` closing an enclosing group (both left
 * at the cursor), or the end.
 */
function sequence(scan: Scan, close: ")" | "]" | "}" | null): Sequence {
  const { s } = scan;
  const out: Sequence = { text: "", comma: false, sum: false };
  let last: Last = "other";
  let run: Run = "none";
  const outer: Run[] = []; // the run outside each open `(` or `[`
  while (scan.i < s.length) {
    const ch = s[scan.i];
    if ((ch === close && outer.length === 0) || (ch === "}" && close !== null)) break;
    if (isSpace(ch)) {
      out.text += takeSpace(scan);
      continue;
    }
    const first = out.text.trim() === "";
    if (isLetter(ch)) {
      const start = scan.i;
      while (isLetter(s[scan.i])) scan.i += 1;
      const letters = s.slice(start, scan.i);
      const pieces = splitLetters(letters);
      for (const piece of pieces) run = piece.name ? afterName(piece.text, run) : afterFactor(run);
      const identifier = !pieces[pieces.length - 1].name;
      const digits =
        identifier && run === "none" && !letters.endsWith("e") ? separatedDigits(scan) : "";
      out.text += letters + digits;
      last = identifier && digits === "" ? "identifier" : "other";
    } else if (ch === "\\") {
      const item = command(scan);
      out.text += bareBrace(item.name, out.text) ?? item.text;
      last = "other";
      if (item.name !== "left" && item.name !== "right") {
        run = OPERATOR_COMMANDS.has(item.name) ? "none" : afterName(item.name, run);
      }
    } else if (ch === "^") {
      scan.i += 1;
      out.text += "^" + argument(scan, "math");
      last = "other";
    } else if (ch === "_") {
      scan.i += 1;
      out.text += "_" + argument(scan, "text");
      if (last !== "identifier") last = "other";
    } else if (ch === "{") {
      out.text += group(scan, last === "identifier", run);
      last = "other";
      run = afterFactor(run);
    } else {
      if (ch === "(" || ch === "[") {
        // `(` right after a built-in's name is its argument list (PR-25), else a factor
        outer.push(run === "start" && ch === "(" ? "none" : afterFactor(run));
        run = "none";
      } else if (ch === ")" || ch === "]") {
        run = outer.pop() ?? "none";
      } else if (ch === "+" || ch === "-") {
        if (outer.length === 0 && !first) out.sum = true;
        if (run !== "start") run = "none";
      } else if (ch === ",") {
        if (outer.length === 0) out.comma = true;
        run = "none";
      } else if (OPERATOR_CHARS.has(ch)) {
        run = "none";
      } else if (!POSTFIX_CHARS.has(ch)) {
        run = afterFactor(run);
      }
      out.text += ch;
      scan.i += 1;
      last = "other";
    }
  }
  return out;
}

/**
 * PR-31: MathQuill reads a piecewise brace only as `\left\{` and `\right\}`, so a bare `\{` or
 * `\}` (which the parser and Desmos's API accept) gets its `\left` or `\right`; else undefined.
 */
function bareBrace(name: string, before: string): string | undefined {
  if (name !== "{" && name !== "}") return undefined;
  if (/\\(?:left|right)\s*$/.test(before)) return undefined;
  return name === "{" ? "\\left\\{" : "\\right\\}";
}

/** The parser's G7 split of a letter run: the longest name at each position, else one letter. */
function splitLetters(letters: string): { text: string; name: boolean }[] {
  const pieces: { text: string; name: boolean }[] = [];
  for (let i = 0; i < letters.length; ) {
    let length = 0;
    for (let n = 1; n <= LONGEST_RUN_NAME && i + n <= letters.length; n++) {
      if (RUN_NAMES.has(letters.slice(i, i + n))) length = n;
    }
    pieces.push(
      length === 0
        ? { text: letters[i], name: false }
        : { text: letters.slice(i, i + length), name: true }
    );
    i += Math.max(length, 1);
  }
  return pieces;
}

/**
 * `\cdot` and the number after a letter when spaces part them or sit inside it, so the parser
 * reads a product (PR-14) that MathQuill, dropping the spaces, would make a subscript; else "".
 * The number is read as the tokenizer reads it; one with a `.` is never a subscript.
 */
function separatedDigits(scan: Scan): string {
  const { s } = scan;
  let j = scan.i;
  while (isSpace(s[j])) j += 1;
  if (!isDigit(s[j])) return "";
  const start = j;
  let spaced = j > scan.i;
  let dot = false;
  for (;;) {
    if (isDigit(s[j])) {
      j += 1;
    } else if (s[j] === "." && !dot) {
      dot = true;
      j += 1;
    } else {
      let k = j;
      while (isSpace(s[k])) k += 1;
      if (k === j || !(isDigit(s[k]) || (s[k] === "." && !dot))) break;
      spaced = true;
      j = k;
    }
  }
  if (!spaced || dot) return "";
  scan.i = j;
  return "\\cdot" + s.slice(start, j);
}

/**
 * The command at the cursor's backslash, with its blocks when MathQuill gives it some. `name` is
 * the command's name, or the operator name a text-style wrapper holds (`\operatorname{sin}`).
 */
function command(scan: Scan): { text: string; name: string } {
  const { s } = scan;
  let end = scan.i + 1;
  if (isLetter(s[end])) while (isLetter(s[end])) end += 1;
  else if (end < s.length) end += 1;
  const name = s.slice(scan.i + 1, end);
  let text = s.slice(scan.i, end);
  scan.i = end;
  if (name === "sqrt") return { text: text + rootBlocks(scan), name };
  const blocks = (BLOCKS.get(name) ?? []).map((block) => argument(scan, block));
  text += blocks.join("");
  const wrapped = NAME_WRAPPERS.has(name) ? /^\{([a-zA-Z]+)\}$/.exec(blocks[0]) : null;
  return { text, name: wrapped === null ? name : wrapped[1] };
}

/** `\sqrt`'s optional `[index]`, then its radicand; a `(…)` radicand becomes `{…}` (PR-27). */
function rootBlocks(scan: Scan): string {
  const { s } = scan;
  let text = takeSpace(scan);
  if (s[scan.i] === "[") {
    scan.i += 1;
    text += "[" + sequence(scan, "]").text;
    if (s[scan.i] === "]") {
      text += "]";
      scan.i += 1;
    }
  }
  const resume = scan.i;
  const space = takeSpace(scan);
  if (s[scan.i] !== "(") {
    scan.i = resume;
    return text + argument(scan, "math");
  }
  scan.i += 1;
  const radicand = sequence(scan, ")").text;
  if (s[scan.i] !== ")") return `${text}${space}(${radicand}`;
  scan.i += 1;
  return `${text}${space}{${radicand}}`;
}

/** One block after a command, `^` or `_`: a `{…}` group, else one command or one character. */
function argument(scan: Scan, block: Block): string {
  const { s } = scan;
  const space = takeSpace(scan);
  const ch = s[scan.i];
  if (ch === "{") {
    scan.i += 1;
    const inner = block === "math" ? sequence(scan, "}").text : verbatim(scan);
    const closed = s[scan.i] === "}";
    if (closed) scan.i += 1;
    return `${space}{${inner}${closed ? "}" : ""}`;
  }
  if (ch === "\\") return space + command(scan).text;
  if (ch === undefined || ch === "}") return space;
  scan.i += 1;
  return space + ch;
}

/**
 * A `{…}` group in atom position (G10): parentheses when it holds one non-empty sum, unless it is
 * a factor of a run argument that the braces alone keep right (see the file comment).
 */
function group(scan: Scan, afterIdentifier: boolean, run: Run): string {
  const { s } = scan;
  scan.i += 1;
  const inner = sequence(scan, "}");
  const closed = s[scan.i] === "}";
  if (closed) scan.i += 1;
  const asWritten = `{${inner.text}${closed ? "}" : ""}`;
  if (!closed || inner.comma || inner.text.trim() === "") return asWritten;
  if (run === "factors" || (run === "start" && !inner.sum)) return asWritten;
  return `${afterIdentifier ? "\\cdot" : ""}\\left(${inner.text}\\right)`;
}

/** A text block's contents up to its closing `}` (left at the cursor), copied as written. */
function verbatim(scan: Scan): string {
  const { s } = scan;
  const start = scan.i;
  let depth = 0;
  while (scan.i < s.length) {
    const ch = s[scan.i];
    if (ch === "}" && depth === 0) break;
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    scan.i += ch === "\\" ? 2 : 1;
  }
  scan.i = Math.min(scan.i, s.length);
  return s.slice(start, scan.i);
}

function takeSpace(scan: Scan): string {
  const start = scan.i;
  while (isSpace(scan.s[scan.i])) scan.i += 1;
  return scan.s.slice(start, scan.i);
}
