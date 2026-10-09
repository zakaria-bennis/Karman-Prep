/** Identify paired currency amounts separated by prose, not explicit math.
 * The amounts and prose stay literal; no source text is rewritten. */
export function currencyDollarDelimiters(text: string): Set<number> {
  const offsets = new Set<number>();
  // Lookahead permits adjacent pairs to share the middle currency amount.
  // A narrow price phrase is required: "for the/a/an/each ...". A variable
  // or function name (such as xy or sin) is not evidence of currency prose.
  // Commands and symbolic operators retain the explicit-math path.
  const pairs =
    /(?=(?<!\\)\$(\d[\d,]*(?:\.\d+)?)\s+(for\s+(?:the|a|an|each)\b[^$\n]*?\s)\$(?=\d))/gi;
  for (const match of text.matchAll(pairs)) {
    if (/[\\^_={}<>+*/≤≥×÷]/.test(match[2])) continue;
    offsets.add(match.index);
    const closing = text.indexOf("$", match.index + 1);
    offsets.add(closing);
  }
  return offsets;
}
