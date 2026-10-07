export type SerializedFunctionRun =
  | { kind: "text"; value: string }
  | { kind: "inline"; latex: string; sourceFunction: true };

/** Explicit, opt-in display support for complete ASCII exponential function lines.
 * Only f(x) = a(b)^(x/n), with matching variables and a positive integer n,
 * is supported. Stored source text and other notation stay untouched. */
export function parseSerializedFunctionLines(
  text: string,
  { atLineStart = true, atLineEnd = true }: { atLineStart?: boolean; atLineEnd?: boolean } = {}
): SerializedFunctionRun[] {
  const pattern =
    /^([A-Za-z])\(([A-Za-z])\) *= *(-?\d+(?:\.\d+)?)\((\d+(?:\.\d+)?)\)\^\(\2\/([1-9]\d*)\)$/gm;
  const runs: SerializedFunctionRun[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (Number(match[4]) <= 0) continue;
    const index = match.index!;
    if ((index === 0 && !atLineStart) || (index + match[0].length === text.length && !atLineEnd))
      continue;
    if (index > cursor) runs.push({ kind: "text", value: text.slice(cursor, index) });
    const [, fn, variable, coefficient, base, denominator] = match;
    runs.push({
      kind: "inline",
      sourceFunction: true,
      latex: `${fn}(${variable}) = ${coefficient}(${base})^{\\frac{${variable}}{${denominator}}}`,
    });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) runs.push({ kind: "text", value: text.slice(cursor) });
  return runs;
}
