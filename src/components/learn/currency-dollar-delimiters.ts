/** Identify paired currency amounts separated by prose, not explicit math.
 * The amounts and prose stay literal; no source text is rewritten.
 *
 * "$49 at a book sale ... for $3 each" pairs two dollar signs that are both money. Read as
 * $…$ math, the prose between them would lose its spaces and run off the screen. A pair is
 * currency when the first dollar starts an amount (a space after the sign and a variable
 * right after the amount are allowed: "$ 145", "$56n") followed by a space (optionally after a
 * comma, period, colon or semicolon), the second dollar starts another amount, and what
 * lies between reads as prose: at least two words of two or more letters that are not math
 * function names, and no LaTeX command or math operator. A variable or function name (such
 * as xy or sin) is not evidence of prose, so "$3 sin x $4" and "$3 for x $4" stay math. */
const MATH_WORDS = new Set([
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "log",
  "ln",
  "exp",
  "lim",
  "max",
  "min",
  "mod",
  "det",
]);

export function currencyDollarDelimiters(text: string): Set<number> {
  const offsets = new Set<number>();
  // Lookahead permits adjacent pairs to share the middle currency amount.
  // "$ 145" (a space after the sign) and "$56n" (an amount times a variable) are money too.
  const pairs = /(?=(?<!\\)\$ ?\d[\d,]*(?:\.\d+)?[a-z]?[,.;:]?\s([^$\n]*?)\$(?= ?\d))/g;
  for (const match of text.matchAll(pairs)) {
    const between = match[1];
    if (/[\\^_={}<>+*/≤≥×÷−]|(?:^|\s)-(?:\s|\d|$)/.test(between)) continue;
    const words = (between.match(/[A-Za-z]{2,}/g) ?? []).filter(
      (word) => !MATH_WORDS.has(word.toLowerCase())
    );
    if (words.length < 2) continue;
    offsets.add(match.index);
    offsets.add(text.indexOf("$", match.index + 1));
  }
  return offsets;
}
