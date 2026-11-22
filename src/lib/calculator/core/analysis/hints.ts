// Friendly hints for the slips SAT students make most (docs/research/2026-11-22-calculator-tricks.md,
// section 5). A hint only replaces the message of a row that already has an error, so valid input
// is never touched; the error's code and names stay as they were. Pure TypeScript (AR-44).

/** Words students type for functions this calculator names differently (or lacks). */
const WORD_HINTS: readonly [RegExp, string][] = [
  [/^mode$/i, "There's no mode function. Try sort(L) to spot the most common value."],
  [/^iqr$/i, "For the IQR, use quartile(L,3) - quartile(L,1)."],
  [/^range$/i, "For the range, use max(L) - min(L)."],
  [/^sum$/i, "To add up a list, use total(L)."],
  [/^(average|avg)$/i, "For the average, use mean(L)."],
  [/^(sd|std|stdv)$/i, "For standard deviation, use stdev(L), or stdevp(L) for a population."],
];

/** The plain text of a row's start: `\operatorname{mode}\left(` and `mode(` both read "mode(". */
function plain(latex: string): string {
  return latex
    .replace(/\\operatorname\{([^}]*)\}/g, "$1")
    .replace(/\\left|\\right/g, "")
    .replace(/\\ /g, "")
    .trim();
}

/** The errors that come from letters with no value: the ones a slip like f(2) or mode(L) causes. */
const UNKNOWN_NAMES: ReadonlySet<string> = new Set([
  "too-many-variables",
  "equation-required",
  "function-parentheses",
]);

/**
 * The hint for a row with an error of `code` whose names are `names`, or null to keep its
 * message. Only errors caused by unknown letters get one (and a sigma with no limits).
 */
export function studentHint(latex: string, code: string, names: readonly string[]): string | null {
  const text = plain(latex);
  if (/^\\sum\s*\(/.test(text)) return "To add up a list, use total(L).";
  if (/^stats\s*\(/.test(text)) {
    return "For min, Q1, median, Q3 and max, use quartile(L,[0,1,2,3,4]).";
  }
  if (!UNKNOWN_NAMES.has(code)) return null;
  const word = /^([A-Za-z]+)\s*\(/.exec(text)?.[1];
  if (word !== undefined && word.length > 1) {
    for (const [pattern, hint] of WORD_HINTS) if (pattern.test(word)) return hint;
  }
  // f(2) with no f: read as f times 2. A number inside means the student wanted a function.
  const call = /^([A-Za-z])\(([^()]*)\)$/.exec(text);
  const numbers = call !== null && call[2].trim() !== "" && !/[a-z]/i.test(call[2]);
  if (call !== null && numbers && names.length === 1 && names[0] === call[1]) {
    return `${call[1]} isn't defined yet. Define ${call[1]}(x) = ... on its own line first.`;
  }
  // y_1 = m x_1 + b: the student wants a fit, which uses ~
  if (
    /^[A-Za-z]_\{?\w+\}?\s*=/.test(text) &&
    names.length > 0 &&
    /_\{?\w/.test(text.split("=")[1] ?? "")
  ) {
    const list =
      names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
    return `${list} ${names.length === 1 ? "isn't" : "aren't"} defined. To fit data, use ~ instead of =.`;
  }
  return null;
}
