// Bracket pairing before parsing. Desmos groups brackets before it reads any operator, so a
// bracket without its partner is reported first, whatever else the row holds: "Expected '(' to
// match ')'." for `(1`, `1)`, `(1]` and `\sin(`, the same with '[' and '{' for list and piecewise
// brackets, and its generic "Sorry, I don't understand this." for a LaTeX group brace (captured
// 2026-10-20).

import type { ParseError } from "./errors";
import type { Token } from "./tokens";

type Opener = "(" | "[" | "\\{" | "{";
/** The opener each closer pairs with. */
const PARTNER: Readonly<Record<string, Opener>> = { ")": "(", "]": "[", "\\}": "\\{", "}": "{" };

/** The opener a token is, or null. */
function openerOf(token: Token): Opener | null {
  if (token.t === "open") return token.ch;
  return token.t === "command" && token.name === "{" ? "\\{" : null;
}

/** The closer a token is, as PARTNER keys it, or null. */
function closerOf(token: Token): string | null {
  if (token.t === "close") return token.ch;
  return token.t === "command" && token.name === "}" ? "\\}" : null;
}

/**
 * The first unpaired bracket in `tokens`, read left to right: a closer that does not close the
 * innermost open bracket reports that bracket (or, with none open, its own partner), and at the
 * end the innermost bracket still open is reported. Null when every bracket pairs.
 */
export function delimiterError(tokens: readonly Token[]): ParseError | null {
  const open: { opener: Opener; token: Token }[] = [];
  let previous: Token | null = null;
  for (const token of tokens) {
    const before = previous;
    previous = token;
    const opener = openerOf(token);
    if (opener !== null) {
      open.push({ opener, token });
      continue;
    }
    const closer = closerOf(token);
    if (closer === null) continue;
    const top = open[open.length - 1];
    if (top !== undefined && top.opener === PARTNER[closer]) {
      open.pop();
      continue;
    }
    // a wrong closer right after its opener names the closer's own partner: `(]` and
    // `\left[\left(\right]` read "Expected '[' to match ']'.", `(1]` "Expected '(' …"
    if (top === undefined || top.token === before) return unpaired(PARTNER[closer], token);
    return unpaired(top.opener, top.token);
  }
  const top = open[open.length - 1];
  return top === undefined ? null : unpaired(top.opener, top.token);
}

function unpaired(opener: Opener, token: Token): ParseError {
  const span = { start: token.span.start, end: token.span.end };
  if (opener === "{") return { code: "syntax", span, detail: "an unpaired brace" };
  const shown = opener === "\\{" ? "{" : opener;
  return { code: "unmatched", span, detail: `an unpaired "${shown}"`, feature: shown };
}
