// Factors and atoms, precedence levels 9 to 11 (grammar contract of the 02-parser plan): numbers,
// identifiers and constants (G6, PR-10, PR-11, PR-14, PR-15) and single-token arguments (G4).
// Built-in calls (Task 9), the postfix loop and groups (Task 8) join here.

import type { Node, SourceSpan } from "./ast";
import { enter, fail, parseSum, peek, take, unexpected, type ParserState } from "./parser";
import type { Token } from "./tokens";

type DigitsToken = Extract<Token, { t: "digits" }>;
type LetterToken = Extract<Token, { t: "letter" }>;

/** Lowercase Greek letter commands that are identifiers (G6, PR-11); `\pi` and `\tau` are constants. */
export const GREEK_IDENTIFIERS: ReadonlySet<string> = new Set([
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "varepsilon",
  "zeta",
  "eta",
  "theta",
  "vartheta",
  "iota",
  "kappa",
  "lambda",
  "mu",
  "nu",
  "xi",
  "rho",
  "varrho",
  "sigma",
  "varsigma",
  "upsilon",
  "phi",
  "varphi",
  "chi",
  "psi",
  "omega",
]);

/** `factor := builtinCall | postfix` (G2); built-in calls join in Task 9. */
export function parseFactor(state: ParserState): Node {
  return parsePostfix(state);
}

/** `postfix := atom ("^" exponent | "\%" | "^{\circ}")*` (G2); the postfix loop joins in Task 8. */
export function parsePostfix(state: ParserState): Node {
  return parseAtom(state);
}

/** A number, a Latin or Greek identifier or a constant (G6); any other token fails (G14). */
export function parseAtom(state: ParserState): Node {
  const token = peek(state);
  switch (token.t) {
    case "digits":
      take(state);
      return { kind: "num", value: Number(token.text), span: token.span };
    case "letter":
      return parseLetter(state, token);
    case "command":
      return parseCommandAtom(state, true);
    default:
      return unexpected(state, token);
  }
}

/**
 * The argument of `^`, `_`, `\frac` or `\sqrt` written without braces, or a braced group (G4): one
 * character split off a number, one letter (no PR-14) or one atom command.
 */
export function takeSingleArgument(state: ParserState): Node {
  const token = peek(state);
  if (token.t === "open" && token.ch === "{") {
    take(state);
    const arg = enter(state, token, () => parseSum(state));
    const close = peek(state);
    if (close.t !== "close" || close.ch !== "}") unexpected(state, close);
    take(state);
    return arg;
  }
  if (token.t === "digits") {
    const digit = takeFirstDigit(state, token);
    return { kind: "num", value: Number(digit.text), span: digit.span };
  }
  if (token.t === "letter") {
    take(state);
    return token.ch === "e"
      ? { kind: "const", name: "e", span: token.span }
      : { kind: "id", name: token.ch, span: token.span };
  }
  if (token.t === "command") return parseCommandAtom(state, false);
  return unexpected(state, token);
}

/**
 * A Latin letter (G6): `e` is the constant unless `_` follows (OI-27); a subscript comes from `_`
 * or, with none, from digits written directly after the letter with no `.` or space (PR-14).
 */
function parseLetter(state: ParserState, letter: LetterToken): Node {
  take(state);
  const next = peek(state);
  if (next.t === "symbol" && next.ch === "_") {
    return parseSubscript(state, letter.ch, letter.span.start);
  }
  if (letter.ch === "e") return { kind: "const", name: "e", span: letter.span };
  if (next.t === "digits" && next.span.start === letter.span.end && isPlainDigits(next)) {
    take(state);
    const span = { start: letter.span.start, end: next.span.end };
    return { kind: "id", name: `${letter.ch}_{${next.text}}`, span };
  }
  return { kind: "id", name: letter.ch, span: letter.span };
}

/** `\pi` and `\tau` are constants and Greek letters are identifiers; other commands are unsupported. */
function parseCommandAtom(state: ParserState, subscripts: boolean): Node {
  const token = take(state) as Extract<Token, { t: "command" }>;
  if (token.name === "pi" || token.name === "tau") {
    return { kind: "const", name: token.name, span: token.span };
  }
  if (GREEK_IDENTIFIERS.has(token.name)) {
    const name = `\\${token.name}`;
    const next = peek(state);
    if (subscripts && next.t === "symbol" && next.ch === "_") {
      return parseSubscript(state, name, token.span.start);
    }
    return { kind: "id", name, span: token.span };
  }
  return fail("unsupported", token.span, `"\\${token.name}" is not supported`);
}

/**
 * The `_` at the cursor and its subscript (G6): a braced run of letters and digits kept as written,
 * one letter or one digit split off a number. The identifier is named `base_{text}`.
 */
function parseSubscript(state: ParserState, base: string, start: number): Node {
  take(state);
  const token = peek(state);
  let text: string;
  let end: number;
  if (token.t === "open" && token.ch === "{") {
    take(state);
    text = enter(state, token, () => readSubscriptGroup(state));
    end = take(state).span.end;
  } else if (token.t === "letter") {
    take(state);
    text = token.ch;
    end = token.span.end;
  } else if (token.t === "digits") {
    const digit = takeFirstDigit(state, token);
    text = digit.text;
    end = digit.span.end;
  } else {
    return unexpected(state, token);
  }
  return { kind: "id", name: `${base}_{${text}}`, span: { start, end } };
}

/** Letters and digits up to a closing `}`, which stays at the cursor; an empty group fails. */
function readSubscriptGroup(state: ParserState): string {
  let text = "";
  for (let token = peek(state); ; token = peek(state)) {
    if (token.t === "close" && token.ch === "}" && text !== "") return text;
    if (token.t === "letter") text += token.ch;
    else if (token.t === "digits" && !token.text.includes(".")) text += token.text;
    else return unexpected(state, token);
    take(state);
  }
}

/**
 * Takes the first digit of the number at the cursor (G4). The rest stays at the cursor as its own
 * token and keeps its end: digits, or the symbol `.` when only the point is left.
 */
function takeFirstDigit(
  state: ParserState,
  token: DigitsToken
): { text: string; span: SourceSpan } {
  const text = token.text[0];
  const span = { start: token.span.start, end: token.span.start + 1 };
  if (text === ".") return fail("syntax", span, 'unexpected "."');
  const rest = token.text.slice(1);
  if (rest === "") {
    take(state);
    return { text, span: token.span };
  }
  let start = span.end;
  while (/\s/.test(state.normalized[start])) start += 1;
  const restSpan = { start, end: token.span.end };
  state.tokens[state.pos] =
    rest === "."
      ? { t: "symbol", ch: ".", span: restSpan }
      : { t: "digits", text: rest, span: restSpan };
  return { text, span };
}

/** Digits with no decimal point and no inner whitespace (PR-14). */
function isPlainDigits(token: DigitsToken): boolean {
  return !token.text.includes(".") && token.span.end - token.span.start === token.text.length;
}
