// Pasted math text (break-ui, matching the reference): the plain text is cleaned, split into lines
// and turned into LaTeX through the shared normalizer. The MathField adapter writes one line at the
// caret; the expression list turns more lines into rows. Text over the field's limit is refused
// before it reaches MathQuill, so a 100,000-character paste cannot freeze the page.

import { MAX_ROW_CHARACTERS } from "@/lib/calculator/core/latex/limits";
import { normalizeLatex } from "@/lib/calculator/core/latex/normalize";

/** Control, zero-width and bidirectional-override characters; never part of math. */
const INVISIBLE =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

/** Terminal colour codes ("ESC[31m"), which a copy from a console can carry. */
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

/** A pasted text's math lines: invisible characters removed, each line trimmed, blank lines dropped. */
export function pastedLines(text: string): string[] {
  return text
    .replace(ANSI, "")
    .replace(/\r\n?|[\u2028\u2029]/g, "\n")
    .replace(INVISIBLE, "")
    .split("\n")
    .map((line) => line.replace(/\t/g, " ").trim())
    .filter((line) => line !== "");
}

/** One pasted line as LaTeX for a row (PR-3, PR-4). */
export function pastedLatex(line: string): string {
  return normalizeLatex(line);
}

/**
 * Whether `latex` is too long for a field of `limit` characters (a row's by default) even before
 * MathQuill reformats it (spaces never count, as MathQuill drops them), so it can be refused at
 * once with the T-13 message.
 */
export function overRowLimit(latex: string, limit = MAX_ROW_CHARACTERS): boolean {
  return latex.replace(/\s+/g, "").length > limit;
}
