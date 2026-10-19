// Letter runs (PR-13; grammar contract G7 of the 02-parser plan). Typed letters arrive one token
// each; a run of adjacent letters is split left to right into allowlisted names and single letters,
// the rule MathQuill applies while typing (T-3). parseLatex runs this between tokenize and parsing.

import { AUTO_COMMANDS, OPERATOR_NAMES } from "./operator-names";
import type { Token } from "./tokens";

type LetterToken = Extract<Token, { t: "letter" }>;

/** Split targets: every allowlisted name and auto-command. Member names are in neither list. */
const RUN_NAMES: ReadonlySet<string> = new Set([
  ...OPERATOR_NAMES.map((n) => n.name),
  ...AUTO_COMMANDS,
]);
const LONGEST_NAME = Math.max(...[...RUN_NAMES].map((name) => name.length));

/**
 * Replaces, in each run of adjacent letter tokens, the longest name starting at each position with
 * one command token over its letters (G7). Whitespace ends a run. A subscript's letters are never
 * split (G6): a `_{…}` group and the one letter after a bare `_` are copied as they are.
 */
export function splitLetterRuns(tokens: Token[]): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.t === "symbol" && token.ch === "_") {
      const end = subscriptEnd(tokens, i + 1);
      out.push(...tokens.slice(i, end));
      i = end;
    } else if (token.t === "letter") {
      let end = i + 1;
      while (isAdjacentLetter(tokens[end - 1], tokens[end])) end += 1;
      out.push(...splitRun(tokens.slice(i, end) as LetterToken[]));
      i = end;
    } else {
      out.push(token);
      i += 1;
    }
  }
  return out;
}

/** The index after a subscript that starts at `start`: a whole `{…}` group or one letter. */
function subscriptEnd(tokens: readonly Token[], start: number): number {
  const first = tokens[start];
  if (first === undefined) return start;
  if (first.t === "letter") return start + 1;
  if (first.t !== "open" || first.ch !== "{") return start;
  let depth = 0;
  for (let i = start; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.t === "open" && token.ch === "{") depth += 1;
    if (token.t === "close" && token.ch === "}") depth -= 1;
    if (depth === 0) return i + 1;
  }
  return tokens.length;
}

/** True when `next` is a letter written directly after the letter `previous`, with no space. */
function isAdjacentLetter(previous: Token, next: Token | undefined): boolean {
  return next !== undefined && next.t === "letter" && next.span.start === previous.span.end;
}

/** Splits one run left to right, taking the longest name that starts at each position. */
function splitRun(run: readonly LetterToken[]): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < run.length) {
    const length = longestNameAt(run, i);
    if (length === 0) {
      out.push(run[i]);
      i += 1;
    } else {
      const name = run
        .slice(i, i + length)
        .map((letter) => letter.ch)
        .join("");
      const span = { start: run[i].span.start, end: run[i + length - 1].span.end };
      out.push({ t: "command", name, span });
      i += length;
    }
  }
  return out;
}

/** The length of the longest split target starting at `start`, or 0 when none does. */
function longestNameAt(run: readonly LetterToken[], start: number): number {
  let text = "";
  let found = 0;
  for (let i = start; i < run.length && i - start < LONGEST_NAME; i++) {
    text += run[i].ch;
    if (RUN_NAMES.has(text)) found = text.length;
  }
  return found;
}
