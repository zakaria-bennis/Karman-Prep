/** Identify paired currency amounts separated by prose, not explicit math.
 * The amounts and prose stay literal; no source text is rewritten. */
export function currencyDollarDelimiters(text: string): Set<number> {
  const offsets = new Set<number>();
  // Lookahead permits adjacent pairs to share the middle currency amount.
  // Require a numeric amount, an English word, prose ending in whitespace,
  // and another numeric amount. LaTeX commands remain explicit math.
  const pairs = /(?=(?<!\\)\$(\d[\d,]*(?:\.\d+)?)\s+([A-Za-z]{2,}\b[^$\n]*?\s)\$(?=\d))/g;
  for (const match of text.matchAll(pairs)) {
    if (match[2].includes("\\")) continue;
    offsets.add(match.index);
    const closing = text.indexOf("$", match.index + 1);
    offsets.add(closing);
  }
  return offsets;
}
