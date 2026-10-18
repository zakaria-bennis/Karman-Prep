export type SerializedFunctionRun =
  | { kind: "text"; value: string }
  | { kind: "inline"; latex: string; sourceFunction: true };

/** Opt-in display support for narrowly specified reviewed serialized math.
 * Complete equation lines and the contextual function expressions below
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
  // Reviewed square-root equation: the square alone is under the radical.
  // Do not evaluate sqrt(x²) to x or extend its overbar onto the right side.
  const radicalPattern = /^√\(([A-Za-z])²\) *= *(\d+) *([-−+]) *(\d+)\1$/gm;
  for (const match of text.matchAll(radicalPattern)) {
    const [, variable, constant, sign, coefficient] = match;
    addLine(
      match,
      `\\sqrt{${variable}^{2}} = ${constant} ${sign.replace("−", "-")} ${coefficient}${variable}`
    );
  }
  // Reviewed rational linear function in prose. Require the defining clause,
  // matching function/variable, nonzero denominator, and sentence boundary.
  // Parentheses around the serialized coefficient group the fraction only;
  // the following parenthesized sum remains outside the fraction.
  const rationalPattern =
    /\bThe function ([A-Za-z]) is defined by (\1\(([A-Za-z])\) *= *\((\d+)\/([1-9]\d*)\)\(\3 *([+−-]) *(\d+)\))(?=\.(?:\s|$))/g;
  for (const match of text.matchAll(rationalPattern)) {
    const [, fn, expression, variable, numerator, denominator, sign, constant] = match;
    matches.push({
      index: match.index! + match[0].length - expression.length,
      length: expression.length,
      latex: `${fn}(${variable}) = \\dfrac{${numerator}}{${denominator}}(${variable} ${sign.replace("−", "-")} ${constant})`,
    });
  }
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
  // Reviewed numeric equation in prose, with an explicit introducer and a full
  // stop after the complete expression. Keep the coefficient and offset outside
  // the exponent, retaining the source's parenthesized positive base.
  const inlineEquationPattern =
    /\bequation ([A-Za-z]) *= *([-−]?\d+(?:\.\d+)?)\((\d+(?:\.\d+)?)\)\^([A-Za-z]) *\+ *(\d+(?:\.\d+)?)(?=\.(?:\s|$))/g;
  for (const match of text.matchAll(inlineEquationPattern)) {
    const [, dependent, coefficient, base, variable, constant] = match;
    if (Number(base) <= 0) continue;
    matches.push({
      index: match.index! + 9,
      length: match[0].length - 9,
      latex: `${dependent} = ${coefficient.replace("−", "-")}(${base})^{${variable}} + ${constant}`,
    });
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
