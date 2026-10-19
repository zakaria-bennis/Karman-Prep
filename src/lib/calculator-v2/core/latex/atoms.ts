// Factors and atoms, precedence levels 9 to 11 (grammar contract of the 02-parser plan): the postfix
// loop (G5, PR-8, PR-19, PR-20); numbers, identifiers and constants (G6, PR-10, PR-11, PR-14,
// PR-15); groups and points (G10, PR-22); fractions and roots (G9, PR-27); absolute-value bars
// (G11, PR-21); and single-token arguments (G4). Built-in and user calls are in calls.ts (G8).

import type { Node, SourceSpan } from "./ast";
import { isBuiltinCommand, parseBuiltinCall, parseUserCall } from "./calls";
import {
  enter,
  fail,
  parseSum,
  peek,
  startsFactor,
  take,
  unexpected,
  type ParserState,
} from "./parser";
import type { Token } from "./tokens";
import { exactParse, isExactRational } from "../eval/rational";

type DigitsToken = Extract<Token, { t: "digits" }>;
type LetterToken = Extract<Token, { t: "letter" }>;
type OpenToken = Extract<Token, { t: "open" }>;
/** An argument and the end of its text: a braced argument ends at its closing brace. */
type Argument = { node: Node; end: number };

/** Postfix and operator signs PR-9 reports as `unsupported`: prime and tilde. */
const UNSUPPORTED_POSTFIX: ReadonlySet<string> = new Set(["'", "~"]);
/** Text-style wrappers: an empty group is half-typed `syntax`, any other use `unsupported` (G15). */
const NAME_WRAPPERS: ReadonlySet<string> = new Set(["operatorname", "text", "mathrm"]);

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

/** `factor := builtinCall | postfix` (G2): a built-in command starts a call (G8). */
export function parseFactor(state: ParserState): Node {
  const token = peek(state);
  return isBuiltinCommand(token) ? parseBuiltinCall(state, token) : parsePostfix(state);
}

/** `postfix := atom ("^" exponent | "\%" | "^{\circ}")*` (G2). */
export function parsePostfix(state: ParserState): Node {
  return takePostfix(state, parseAtom(state));
}

/**
 * The postfix loop after `atom` (G2), each sign applying to everything before it (PR-20): `\%`,
 * the degree sign, `^` and `!` (factorial, NM-15). An exponent directly after another is `syntax`
 * (G5, PR-19); `3!^{2}` is (3!)². Every operator position follows this loop, so it reports PR-9's
 * notation there: `'` (prime) and `~` (tilde) are `unsupported`, as is a `.` after an identifier or a call (member access); any other `.` ends the
 * loop and is `syntax` where the caller meets it. A built-in call with a `(` argument list is an
 * atom too (PR-25).
 */
export function takePostfix(state: ParserState, atom: Node): Node {
  let node = atom;
  let afterExponent = false;
  for (let token = peek(state); token.t === "symbol"; token = peek(state)) {
    if (UNSUPPORTED_POSTFIX.has(token.ch) || (token.ch === "." && isMemberBase(node))) {
      fail("unsupported", token.span, `"${token.ch}" is not supported`);
    }
    if (token.ch === "%" || token.ch === "!") {
      take(state);
      const kind = token.ch === "%" ? "pct" : "fact";
      node = { kind, arg: node, span: { start: node.span.start, end: token.span.end } };
      afterExponent = false;
    } else if (token.ch === "^" && isDegreeSign(state)) {
      for (let i = 0; i < 3; i++) take(state);
      const close = take(state);
      node = { kind: "deg", arg: node, span: { start: node.span.start, end: close.span.end } };
      afterExponent = false;
    } else if (token.ch === "^") {
      if (afterExponent) unexpected(state, token);
      take(state);
      const exponent = takeArgument(state);
      const span = { start: node.span.start, end: exponent.end };
      node = { kind: "pow", left: node, right: exponent.node, span };
      afterExponent = true;
    } else {
      break;
    }
  }
  return node;
}

/**
 * A number literal. A non-integer decimal also keeps its exact rational (MATHS-CORE-1), which
 * the evaluator uses for constants; an integer needs none, since every integer double is exact.
 */
function numberLiteral(text: string, span: SourceSpan): Node {
  const value = Number(text);
  const exact = Number.isInteger(value) ? null : exactParse(text);
  return exact !== null && isExactRational(exact)
    ? { kind: "num", value, exact, span }
    : { kind: "num", value, span };
}

/**
 * An atom (level 11): a number, a Latin or Greek identifier or a constant (G6), an identifier's
 * user-function call (PR-23), a `(` or `{` group (G10), a fraction or root (G9) or absolute-value
 * bars (G11); any other token fails (G14).
 */
export function parseAtom(state: ParserState): Node {
  const token = peek(state);
  switch (token.t) {
    case "digits":
      take(state);
      return numberLiteral(token.text, token.span);
    case "letter":
      return parseUserCall(state, parseLetter(state, token));
    case "open":
      if (token.ch === "[") return fail("unsupported", token.span, '"[" is not supported');
      return parseGroup(state, token);
    case "symbol":
      return token.ch === "|" ? parseBars(state, token, "raw") : unexpected(state, token);
    case "command":
      if (token.name === "frac") return parseFraction(state, token);
      if (token.name === "sqrt") return parseRoot(state, token, null);
      if (token.name === "cbrt" && isLetterRun(state, token)) {
        return parseRoot(state, token, { kind: "num", value: 3, span: token.span });
      }
      if (token.name === "lvert") return parseBars(state, token, "lvert");
      return parseUserCall(state, parseCommandAtom(state, true));
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
  if (token.t === "open" && token.ch === "{") return takeDelimited(state, token, "}").node;
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

/** takeSingleArgument with the end of the argument's text, so a node can span it (G14). */
export function takeArgument(state: ParserState): Argument {
  const token = peek(state);
  if (token.t === "open" && token.ch === "{") return takeDelimited(state, token, "}");
  const node = takeSingleArgument(state);
  return { node, end: node.span.end };
}

/** The opener at the cursor, a sum one nesting level deeper (G13), then `closer`. */
function takeDelimited(state: ParserState, open: OpenToken, closer: ")" | "]" | "}"): Argument {
  take(state);
  const node = enter(state, open, () => parseSum(state));
  const close = peek(state);
  if (close.t !== "close" || close.ch !== closer) unexpected(state, close);
  take(state);
  return { node, end: close.span.end };
}

/** True when the `^` at the cursor starts `^{\circ}`, the postfix degree sign (G5, PR-8). */
export function isDegreeSign(state: ParserState): boolean {
  const [open, circ, close] = [peek(state, 1), peek(state, 2), peek(state, 3)];
  return (
    open.t === "open" &&
    open.ch === "{" &&
    circ.t === "command" &&
    circ.name === "circ" &&
    close.t === "close" &&
    close.ch === "}"
  );
}

/**
 * A `(` or `{` group in atom position (G10, PR-22): comma-separated sums, an empty part being
 * `syntax`. One part is that sum, spanning the brackets; a `(` group with two parts is a point and
 * with more is `point-arity` over the group; a `{` group fails at its first top-level comma.
 */
function parseGroup(state: ParserState, open: OpenToken): Node {
  take(state);
  const parts = enter(state, open, () => {
    const found = [parseSum(state)];
    for (let comma = peek(state); comma.t === "symbol" && comma.ch === ","; comma = peek(state)) {
      if (open.ch === "{") unexpected(state, comma);
      take(state);
      found.push(parseSum(state));
    }
    return found;
  });
  const close = peek(state);
  if (close.t !== "close" || close.ch !== (open.ch === "(" ? ")" : "}")) unexpected(state, close);
  take(state);
  const span = { start: open.span.start, end: close.span.end };
  if (parts.length > 2) {
    return fail("point-arity", span, `a point has 2 coordinates, not ${parts.length}`);
  }
  if (parts.length === 2) return { kind: "point", x: parts[0], y: parts[1], span };
  return { ...parts[0], span };
}

/**
 * `\lvert … \rvert` or raw `| … |` (G11, PR-21): `abs`. The bar stays on `state.bars` while its
 * content is read, so a raw `|` there closes it instead of starting a factor (G3).
 */
function parseBars(state: ParserState, open: Token, bar: "raw" | "lvert"): Node {
  take(state);
  const arg = enter(state, open, () => {
    state.bars.push(bar);
    try {
      return parseSum(state);
    } finally {
      state.bars.pop();
    }
  });
  const close = peek(state);
  const closes =
    bar === "raw"
      ? close.t === "symbol" && close.ch === "|"
      : close.t === "command" && close.name === "rvert";
  if (!closes) unexpected(state, close);
  take(state);
  return { kind: "abs", arg, span: { start: open.span.start, end: close.span.end } };
}

/**
 * `\frac` with two G4 arguments: `div`. The derivative operator `\frac{d}{dx}` (numerator the letter
 * d, denominator d then one letter) is `unsupported` at the `\frac` (PR-9).
 */
function parseFraction(state: ParserState, frac: Token): Node {
  take(state);
  const numerator = takeArgument(state);
  const denominator = takeArgument(state);
  if (isDerivative(numerator.node, denominator.node)) {
    return fail("unsupported", frac.span, '"\\frac{d}{d…}" (derivative) is not supported');
  }
  const span = { start: frac.span.start, end: denominator.end };
  return { kind: "div", left: numerator.node, right: denominator.node, span };
}

/** True for `\frac{d}{dx}`'s arguments: the letter d over d times one letter. */
function isDerivative(numerator: Node, denominator: Node): boolean {
  return (
    isOneLetter(numerator, "d") &&
    denominator.kind === "mul" &&
    isOneLetter(denominator.left, "d") &&
    isOneLetter(denominator.right, null)
  );
}

/** True for a node made from one Latin letter (`e` is the constant), `name` when given. */
function isOneLetter(node: Node, name: string | null): boolean {
  if (node.kind !== "id" && !(node.kind === "const" && node.name === "e")) return false;
  return name === null ? /^[A-Za-z]$/.test(node.name) : node.name === name;
}

/**
 * `\sqrt` (G9, PR-27): an optional `[index]` sum, then a braced group, a `(` group (pasted
 * `sqrt(x)`) or a G4 token. A typed `cbrt` (G7) passes its fixed index 3 and reads no `[index]`.
 */
function parseRoot(state: ParserState, sqrt: Token, fixedIndex: Node | null): Node {
  take(state);
  const bracket = peek(state);
  let index = fixedIndex;
  if (index === null && bracket.t === "open" && bracket.ch === "[") {
    index = takeDelimited(state, bracket, "]").node;
  }
  const paren = peek(state);
  const arg =
    paren.t === "open" && paren.ch === "(" ? takeDelimited(state, paren, ")") : takeArgument(state);
  return { kind: "root", arg: arg.node, index, span: { start: sqrt.span.start, end: arg.end } };
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

/**
 * `\pi` and `\tau` are constants and Greek letters are identifiers (G6). G3's operator and closer
 * commands (`\cdot`, `\le`, `\ge`, `\rvert`, `\operatorname{of}`) start no factor, so they are
 * `syntax` wherever an atom is due. `\operatorname{}`, `\text{}` and `\mathrm{}` with an empty group
 * are half-typed `syntax` at the closing brace (G15); any other command is unsupported (PR-9).
 */
function parseCommandAtom(state: ParserState, subscripts: boolean): Node {
  if (!startsFactor(state)) return unexpected(state, peek(state));
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
  const [open, close] = [peek(state), peek(state, 1)];
  const emptyGroup =
    open.t === "open" && open.ch === "{" && close.t === "close" && close.ch === "}";
  if (NAME_WRAPPERS.has(token.name) && emptyGroup) {
    return fail("syntax", close.span, `"\\${token.name}{}" is empty`);
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

/**
 * True for a command splitLetterRuns made from typed letters (G7): its text has no backslash. Only
 * the typed `cbrt` is a cube root; `\cbrt` is an unknown command like any other (G6).
 */
function isLetterRun(state: ParserState, command: Token): boolean {
  return state.normalized[command.span.start] !== "\\";
}

/** A name or a call: a `.` after one is member access (PR-45), `unsupported` until Phase 3 (PR-9). */
function isMemberBase(node: Node): boolean {
  return node.kind === "id" || node.kind === "call";
}

/** Digits with no decimal point and no inner whitespace (PR-14). */
function isPlainDigits(token: DigitsToken): boolean {
  return !token.text.includes(".") && token.span.end - token.span.start === token.text.length;
}
