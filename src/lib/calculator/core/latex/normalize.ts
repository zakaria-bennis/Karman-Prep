// LaTeX normalizer (PR-3, PR-4). Typed, API and paste input pass through
// here before the tokenizer, so every SourceSpan the parser reports is an offset into this output.
// Three passes in order: Unicode characters, raw percent signs, then whole-command rewrites. The
// output is a fixed point: normalizing it again returns it unchanged.

import { isBuiltinName } from "./operator-names";

/** Single Unicode characters and their LaTeX (PR-4). A trailing space ends a command name. */
const UNICODE: ReadonlyMap<string, string> = new Map([
  ["−", "-"], // −
  ["–", "-"], // –
  ["×", "\\cdot "], // ×
  ["·", "\\cdot "], // ·
  ["÷", "/"], // ÷
  ["π", "\\pi "], // π
  ["θ", "\\theta "], // θ
  ["τ", "\\tau "], // τ
  ["≤", "\\le "], // ≤
  ["≥", "\\ge "], // ≥
  ["…", "\\ldots "], // … (PR-34's range ellipsis)
]);
/** Superscript two and three; a run of them becomes one `^{…}` group. */
const SUPERSCRIPT_DIGITS: ReadonlyMap<string, string> = new Map([
  ["²", "2"],
  ["³", "3"],
]);
const SUBSCRIPT_ZERO = 0x2080; // ₀ to ₉ are U+2080 to U+2089; a run becomes one `_{…}` group.

/** Commands replaced by fixed text; an empty string removes the command (PR-3). */
const COMMAND_REWRITES: ReadonlyMap<string, string> = new Map([
  ["dfrac", "\\frac"],
  ["tfrac", "\\frac"],
  ["displaystyle", ""],
  [",", ""],
  [";", ""],
  [":", ""],
  ["!", ""],
  [" ", ""],
  ["quad", ""],
  ["times", "\\cdot"],
  ["div", "/"],
  ["leq", "\\le"],
  ["leqslant", "\\le"],
  ["geq", "\\ge"],
  ["geqslant", "\\ge"],
  ["lt", "<"],
  ["gt", ">"],
  ["dots", "\\ldots"], // PR-34
]);
/** `\left` and `\right` with a `|` become bar commands; with a `.` they vanish with it. */
const BAR_COMMANDS: ReadonlyMap<string, string> = new Map([
  ["left", "\\lvert "],
  ["right", "\\rvert "],
]);
/** Text-style wrappers whose group, when it holds an allowlisted name, becomes that operator. */
const NAME_WRAPPERS: ReadonlySet<string> = new Set(["operatorname", "mathrm", "text"]);

const isLetter = (ch: string | undefined): boolean =>
  ch !== undefined && ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z"));

/** Normalizes typed, API or pasted LaTeX (PR-3, PR-4); see the file comment. */
export function normalizeLatex(input: string): string {
  // A removal can join pieces into a new rewrite (`\text\,{sin}`), so pass 3 repeats
  // until nothing changes. Every repeat needs an earlier removal, which shortened the text.
  let out = escapePercent(mapUnicode(input));
  for (let previous = ""; out !== previous; ) {
    previous = out;
    out = rewriteCommands(out);
  }
  return out;
}

/** Pass 1: one left-to-right pass over the Unicode math characters (PR-4). */
function mapUnicode(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    const sup = takeRun(input, i, (c) => SUPERSCRIPT_DIGITS.get(c));
    if (sup.length > 0) {
      out += `^{${sup.text}}`;
      i += sup.length;
      continue;
    }
    const sub = takeRun(input, i, subscriptDigit);
    if (sub.length > 0) {
      out += `_{${sub.text}}`;
      i += sub.length;
      continue;
    }
    out += UNICODE.get(ch) ?? ch;
    i += 1;
  }
  return out;
}

function subscriptDigit(ch: string): string | undefined {
  const digit = ch.charCodeAt(0) - SUBSCRIPT_ZERO;
  return digit >= 0 && digit <= 9 ? String(digit) : undefined;
}

/** The longest run starting at `start` whose characters `map` turns into digits. */
function takeRun(
  input: string,
  start: number,
  map: (ch: string) => string | undefined
): { text: string; length: number } {
  let text = "";
  let i = start;
  for (let digit = map(input[i] ?? ""); digit !== undefined; digit = map(input[i] ?? "")) {
    text += digit;
    i += 1;
  }
  return { text, length: i - start };
}

/** Pass 2: a `%` that no backslash escapes becomes `\%`; `\%` and `\\` are copied whole. */
function escapePercent(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "\\" && i + 1 < input.length) {
      out += input.slice(i, i + 2);
      i += 2;
    } else {
      out += ch === "%" ? "\\%" : ch;
      i += 1;
    }
  }
  return out;
}

/** The command starting at the backslash `start`: a run of letters, else one character. */
function commandAt(input: string, start: number): { name: string; end: number } {
  let end = start + 1;
  if (isLetter(input[end])) {
    while (isLetter(input[end])) end += 1;
  } else if (end < input.length) {
    end += 1;
  }
  return { name: input.slice(start + 1, end), end };
}

/** The `{name}` group at `start` when it holds an allowlisted name, else null. */
function builtinGroupAt(input: string, start: number): { name: string; end: number } | null {
  if (input[start] !== "{") return null;
  let end = start + 1;
  while (isLetter(input[end])) end += 1;
  const name = input.slice(start + 1, end);
  return input[end] === "}" && isBuiltinName(name) ? { name, end: end + 1 } : null;
}

/**
 * Pass 3: whole-command rewrites. A command name ends at the first non-letter, so `\leftarrow`
 * and `\timesx` are other commands and stay as written.
 */
function rewriteCommands(input: string): string {
  let out = "";
  let i = 0;
  // Removing a command must not glue a preceding command name to following letters (`\pi\,x`).
  const removed = (next: number) => {
    if (isLetter(input[next]) && /\\[A-Za-z]+$/.test(out)) out += " ";
  };
  while (i < input.length) {
    const ch = input[i];
    if (ch !== "\\") {
      out += ch;
      i += 1;
      continue;
    }
    const { name, end } = commandAt(input, i);
    const bar = BAR_COMMANDS.get(name);
    const rewrite = COMMAND_REWRITES.get(name);
    const group = NAME_WRAPPERS.has(name) ? builtinGroupAt(input, end) : null;
    if (bar !== undefined) {
      if (input[end] === "|") {
        out += bar;
        i = end + 1;
      } else {
        i = input[end] === "." ? end + 1 : end;
        removed(i);
      }
    } else if (rewrite !== undefined) {
      out += rewrite;
      i = end;
      if (rewrite === "") removed(i);
    } else if (group !== null) {
      out += `\\operatorname{${group.name}}`;
      i = group.end;
    } else {
      out += input.slice(i, end);
      i = end;
    }
  }
  return out;
}
