// Commands outside the grammar, read as Desmos reads them (captured 2026-10-20): most are names,
// `x\ne1` being x·ne·1 ("Too many variables. Try defining 'ne'.") and `\operatorname{foo}` the
// name foo; a few are symbols Desmos does not read ("Sorry, I don't understand the '≈' symbol.");
// `\operatorname{dt}` and `\operatorname{ans}` belong to contexts this calculator does not have
// ("You can't use 'dt' in this context."); and notation whose meaning has not shipped (sums,
// integrals, infinity, actions, matrices) stays `unsupported`. Pure TypeScript: no DOM.

import { fail, take, type ParserState } from "./parser";
import type { Token } from "./tokens";

type CommandToken = Extract<Token, { t: "command" }>;

/** Notation this calculator reads but has not shipped: these stay `unsupported`. */
const UNSHIPPED: ReadonlySet<string> = new Set([
  "sum",
  "prod",
  "int",
  "nthroot",
  "to",
  "end",
  "with",
  "and",
  "or",
]);
/** Commands Desmos shows as a symbol it does not read, with the symbol it names. */
const SYMBOLS: Readonly<Record<string, string>> = { approx: "≈", backslash: "backslash" };
/** Names Desmos keeps for a context this calculator does not have. */
const CONTEXT_NAMES: ReadonlySet<string> = new Set(["dt", "ans"]);

/**
 * The name `command` (just taken) reads as, `\ne` or `\operatorname{foo}`, with the cursor after
 * it; or fails with Desmos's error for it. `unsupported` for UNSHIPPED notation.
 */
export function commandName(state: ParserState, command: CommandToken): string {
  const symbol = SYMBOLS[command.name] ?? (/^[A-Za-z]/.test(command.name) ? null : command.name);
  if (symbol !== null) return fail("unknown-symbol", command.span, "a symbol", symbol);
  // text and matrices: Desmos's "Sorry, I don't understand this."
  if (command.name === "text" || command.name === "begin") {
    return fail("syntax", command.span, `"\\${command.name}" in math`);
  }
  if (UNSHIPPED.has(command.name)) {
    return fail("unsupported", command.span, `"\\${command.name}" is not supported`);
  }
  if (command.name !== "operatorname") return `\\${command.name}`;
  const text = groupText(state);
  if (text === null) return fail("syntax", command.span, "\\operatorname without a name");
  if (CONTEXT_NAMES.has(text)) {
    // `\operatorname{ans}_{1}`: "Sorry, I don't understand the way that 'ans' is used here."
    const next = state.tokens[state.pos];
    if (next?.t === "symbol" && next.ch === "_") {
      return fail("unexpected-symbol", command.span, "a context name with a subscript", text);
    }
    return fail("symbol-context", command.span, "a context name", text);
  }
  if (!/^[A-Za-z]+$/.test(text)) return fail("unknown-symbol", command.span, "a name", text);
  return `\\operatorname{${text}}`;
}

/** The text of the `{…}` group at the cursor, which it takes; null when there is none. */
function groupText(state: ParserState): string | null {
  const open = state.tokens[state.pos];
  if (open?.t !== "open" || open.ch !== "{") return null;
  let depth = 0;
  for (let k = state.pos; k < state.tokens.length; k++) {
    const token = state.tokens[k];
    if (token.t === "open" && token.ch === "{") depth += 1;
    if (token.t === "close" && token.ch === "}") depth -= 1;
    if (depth > 0) continue;
    const text = state.normalized.slice(open.span.end, token.span.start).trim();
    while (state.pos <= k) take(state);
    return text === "" ? null : text;
  }
  return null;
}
