// Public parser API (01-interfaces.md section 1). Parser modules import limits.ts, never this file,
// at run time.

import { countNodes, type Node } from "./ast";
import type { ParseError } from "./errors";
import { splitLetterRuns } from "./letters";
import { MAX_TREE_NODES } from "./limits";
import { normalizeLatex } from "./normalize";
import { createParserState, ParseFailure, parseRow } from "./parser";
import { tokenize } from "./tokens";

export {
  MAX_FUNCTION_PARAMS,
  MAX_NESTING_DEPTH,
  MAX_ROW_CHARACTERS,
  MAX_ROWS,
  MAX_TREE_NODES,
} from "./limits";
export { countNodes, toSExpr, treesEqual } from "./ast";
export { functionDefinitionHead } from "./function-head";
export { normalizeLatex } from "./normalize";
export { printLatex } from "./printer";

export interface ParseOptions {
  userFunctions?: ReadonlySet<string>;
} // names some row defines as functions (PR-23)
export type ParseResult =
  | { ok: true; tree: Node; normalized: string }
  | { ok: false; error: ParseError; normalized: string };

/**
 * Parses one row of LaTeX. Never throws (PR-38): empty or blank input, tokenizer errors and parse
 * failures all come back as `{ ok: false }` with a span into the normalized text. A tree of more
 * than MAX_TREE_NODES nodes is `too-many-nodes` over the whole row (G13); a `RangeError` (a call
 * stack overflow) is `too-deep` and any other throw `syntax` with an `internal:` detail.
 */
export function parseLatex(input: string, options: ParseOptions = {}): ParseResult {
  let normalized = "";
  try {
    normalized = normalizeLatex(input);
    if (normalized.trim() === "") {
      return failed({ code: "syntax", span: { start: 0, end: 0 }, detail: "empty" }, normalized);
    }
    const tokens = tokenize(normalized);
    if (!Array.isArray(tokens)) return failed(tokens, normalized);
    const tree = parseRow(createParserState(splitLetterRuns(tokens), normalized, options));
    const nodes = countNodes(tree);
    if (nodes > MAX_TREE_NODES) {
      const span = { start: 0, end: normalized.length };
      const detail = `${nodes} nodes, more than ${MAX_TREE_NODES}`;
      return failed({ code: "too-many-nodes", span, detail }, normalized);
    }
    return { ok: true, tree, normalized };
  } catch (thrown) {
    if (thrown instanceof ParseFailure) return failed(thrown.error, normalized);
    const span = { start: 0, end: normalized.length };
    if (thrown instanceof RangeError) {
      return failed({ code: "too-deep", span, detail: "nesting too deep" }, normalized);
    }
    const name = thrown instanceof Error ? thrown.name : typeof thrown;
    return failed({ code: "syntax", span, detail: `internal: ${name}` }, normalized);
  }
}

function failed(error: ParseError, normalized: string): ParseResult {
  return { ok: false, error, normalized };
}
