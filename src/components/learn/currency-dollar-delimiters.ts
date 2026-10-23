/** Identify paired currency amounts separated by prose, not explicit math.
 * The amounts and prose stay literal; no source text is rewritten.
 *
 * "$49 at a book sale ... for $3 each" pairs two dollar signs that are both money. Read as
 * $…$ math, the prose between them would lose its spaces and run off the screen. A pair is
 * currency when the first dollar starts an amount (a space after the sign and a variable
 * right after the amount are allowed: "$ 145", "$56n") followed by a space (optionally after a
 * comma, period, colon or semicolon), the second dollar starts another amount, and what
 * lies between reads as prose: a single joining word (to, and, or, through, than) or at least two words of two or more letters that are not math
 * function names (sin, cos, tan, log, ln, exp), and no LaTeX command or math operator. A variable or function name (such
 * as xy or sin) is not evidence of prose, so "$3 sin x $4" and "$3 for x $4" stay math. */
// "$ 145" (a space after the sign) and "$56n" (an amount times a variable) are money too.
// The lookahead lets adjacent pairs share the middle amount.
const PAIRS = /(?=(?<!\\)\$ ?\d[\d,]*(?:\.\d+)?[a-z]?[,.;:]?\s([^$\n]*?)\$(?= ?\d))/g;
const MATH = /[\\^_={}<>+*/≤≥×÷−]|(?:^|\s)-(?:\s|\d|$)/;
const PROSE_WORD = /\b(?!(?:sin|cos|tan|log|ln|exp)\b)[a-z]{2,}/gi;
// A single joining word between two amounts is prose too: "$6 to $24", "$5 or $10".
const RANGE_WORD = /^(?:to|and|or|through|than)\s*$/i;

export function currencyDollarDelimiters(text: string): Set<number> {
  const offsets = new Set<number>();
  for (const m of text.matchAll(PAIRS))
    if (!MATH.test(m[1]) && ((m[1].match(PROSE_WORD) ?? []).length > 1 || RANGE_WORD.test(m[1])))
      offsets.add(m.index).add(text.indexOf("$", m.index + 1));
  return offsets;
}
