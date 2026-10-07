export type SerializedFunctionRun =
  | { kind: "text"; value: string }
  | { kind: "inline"; latex: string; sourceFunction: true };

/** Opt-in display support for narrowly specified reviewed exponential notation.
 * Complete numeric function lines and the contextual symbolic expression below
 * are supported. Stored source text and other notation stay untouched. */
export function parseSerializedFunctionLines(
  text: string,
  { atLineStart = true, atLineEnd = true }: { atLineStart?: boolean; atLineEnd?: boolean } = {}
): SerializedFunctionRun[] {
  const matches: { index: number; length: number; latex: string }[] = [];
  const addLine = (match: RegExpExecArray, latex: string) => {
    const index = match.index;
    if ((index === 0 && !atLineStart) || (index + match[0].length === text.length && !atLineEnd))
      return;
    matches.push({ index, length: match[0].length, latex });
  };
  const fractionPattern =
    /^([A-Za-z])\(([A-Za-z])\) *= *([-−]?\d+(?:\.\d+)?)\((\d+(?:\.\d+)?)\)\^\(\2\/([1-9]\d*)\)$/gm;
  for (const match of text.matchAll(fractionPattern)) {
    const [, fn, variable, coefficient, base, denominator] = match;
    if (Number(base) <= 0) continue;
    addLine(
      match,
      `${fn}(${variable}) = ${coefficient.replace("−", "-")}(${base})^{\\frac{${variable}}{${denominator}}}`
    );
  }
  const shiftedPattern =
    /^([A-Za-z])\(([A-Za-z])\) *= *([-−]?)(\d+(?:\.\d+)?)\^\2 *\+ *(\d+(?:\.\d+)?)$/gm;
  for (const match of text.matchAll(shiftedPattern)) {
    const [, fn, variable, sign, base, constant] = match;
    if (Number(base) <= 0) continue;
    // Unary minus remains outside the power: −3^x means −(3^x), not (−3)^x.
    addLine(
      match,
      `${fn}(${variable}) = ${sign.replace("−", "-")}${base}^{${variable}} + ${constant}`
    );
  }
  // Only this reviewed, comma-delimited "where" clause is recognized inline.
  // The exponent belongs to b alone; a and the additive c remain outside it.
  for (const match of text.matchAll(/\bwhere (f\(x\) *= *ab\^x *\+ *c)(?=,)/g)) {
    matches.push({ index: match.index! + 6, length: match[1].length, latex: "f(x) = ab^{x} + c" });
  }
  const runs: SerializedFunctionRun[] = [];
  let cursor = 0;
  for (const { index, length, latex } of matches.sort((a, b) => a.index - b.index)) {
    if (index > cursor) runs.push({ kind: "text", value: text.slice(cursor, index) });
    runs.push({
      kind: "inline",
      sourceFunction: true,
      latex,
    });
    cursor = index + length;
  }
  if (cursor < text.length) runs.push({ kind: "text", value: text.slice(cursor) });
  return runs;
}
