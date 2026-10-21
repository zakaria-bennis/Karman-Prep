// Function-definition heads (PR-23, RC-4; parser grammar G15). The RC-4 pre-scan builds
// ParseOptions.userFunctions from these names before parsing.

import { GREEK_IDENTIFIERS } from "./atoms";
import { normalizeLatex } from "./normalize";
import { tokenize, type Token } from "./tokens";

/**
 * The head of a row written `f(p1,…,pn)=…`, or null. The name is one Latin letter with an optional
 * subscript (`_` with one letter or digit, or a braced run of them), named as identifiers are
 * (`f_{1}`), or a Greek letter but θ (`\\omega`); each parameter is one Latin letter or π or τ. Any
 * number of parameters is returned, repeats included, as written: RC-4's limits are the checks.
 */
export function functionDefinitionHead(input: string): { name: string; params: string[] } | null {
  const tokens = tokenize(normalizeLatex(input));
  if (!Array.isArray(tokens)) return null;
  const first = tokens[0];
  // Desmos also takes a Greek letter as a function's name, `\omega(x)=x^2` (captured 2026-10-20)
  const greek =
    first.t === "command" && GREEK_IDENTIFIERS.has(first.name) && first.name !== "theta";
  if (first.t !== "letter" && !greek) return null;
  let name = first.t === "letter" ? first.ch : `\\${(first as { name: string }).name}`;
  let pos = 1;
  if (isSymbol(tokens[pos], "_")) {
    const subscript = readSubscript(tokens, pos + 1);
    if (subscript === null) return null;
    name += `_{${subscript.text}}`;
    pos = subscript.end;
  }
  if (!isBracket(tokens[pos], "open", "(")) return null;
  const params: string[] = [];
  for (pos += 1; ; pos += 2) {
    const param = tokens[pos];
    // `\pi` and `\tau` are read so analysis can refuse them as Desmos does (`f(\pi)=1`)
    const constant = param?.t === "command" && (param.name === "pi" || param.name === "tau");
    if (param === undefined || (param.t !== "letter" && !constant)) return null;
    params.push(param.t === "letter" ? param.ch : (param as { name: string }).name);
    if (isBracket(tokens[pos + 1], "close", ")")) break;
    if (!isSymbol(tokens[pos + 1], ",")) return null;
  }
  return isSymbol(tokens[pos + 2], "=") ? { name, params } : null;
}

/** The subscript starting at `start` and the index after it, or null when there is none. */
function readSubscript(tokens: Token[], start: number): { text: string; end: number } | null {
  const first = tokens[start];
  if (first === undefined) return null;
  if (first.t === "letter") return { text: first.ch, end: start + 1 };
  if (first.t === "digits") {
    return first.text.length === 1 ? { text: first.text, end: start + 1 } : null;
  }
  if (!isBracket(first, "open", "{")) return null;
  let text = "";
  for (let pos = start + 1; pos < tokens.length; pos++) {
    const token = tokens[pos];
    if (isBracket(token, "close", "}")) return text === "" ? null : { text, end: pos + 1 };
    if (token.t === "letter") text += token.ch;
    else if (token.t === "digits" && !token.text.includes(".")) text += token.text;
    else return null;
  }
  return null;
}

function isSymbol(token: Token | undefined, ch: string): boolean {
  return token !== undefined && token.t === "symbol" && token.ch === ch;
}

function isBracket(token: Token | undefined, t: "open" | "close", ch: string): boolean {
  return token !== undefined && token.t === t && token.ch === ch;
}
