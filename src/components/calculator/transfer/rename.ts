// Apply-time renames (c-transfer TR-36): rewrites one name in question-dialect
// LaTeX through the question-math lexer, so only identifier tokens change, never command words,
// environment names or other identifiers that merely contain the name.

import { lexQuestionMath } from "@/lib/calculator-transfer/lex";

/** `latex` with every identifier token `from` written as `to`; null when `latex` does not lex. */
export function renameName(latex: string, from: string, to: string): string | null {
  const lexed = lexQuestionMath(latex);
  if (!lexed.ok) return null;
  let out = latex;
  for (let k = lexed.tokens.length - 1; k >= 0; k--) {
    const token = lexed.tokens[k];
    if (token.kind === "name" && token.text === from)
      out = out.slice(0, token.start) + to + out.slice(token.end);
  }
  return out;
}

/** The name without its subscript: "a_{1}" → "a", "\\alpha_{2}" → "\\alpha". */
export function nameBase(name: string): string {
  return name.replace(/_(?:\{[^{}]*\}|[A-Za-z0-9])$/, "");
}
