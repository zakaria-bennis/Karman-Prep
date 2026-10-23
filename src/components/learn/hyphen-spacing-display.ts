// Display-only clean-up of single hyphens that OCR left with stray spaces (founder, 2026-10-22:
// "no misformatted text"). Callers pass prose only, never math. Source text is never altered.
//
// - List bullets: when 2+ lines of a text start with "- ", each such line shows "• " instead,
//   unless the line holds an equation ("=", "≤", "≥"). A lone "- 5" is a minus sign (below).
// - Spaced minus signs: a text that is only "- 5", "- 1/6" or "- (5/12)π", and an equation line
//   starting "- 6x + 48px = 96", show the minus against its number ("-5", "-6x + 48px = 96").
// - Split compounds: "cost- effective" and "xy-\nplane" (a compound broken at a line end) show
//   as "cost-effective" and "xy-plane". Left alone: suspended hyphens before and/or/to
//   ("plant- and animal-inspired"), a following function word ("metals- among"), a one-letter
//   second part ("(t- x)"), and line-break splits whose first part is longer than 5 letters.
// - After inline math: "$xy$ -plane" shows as "$xy$-plane".

const LIST_LINE = /^([ \t]*)-[ \t]+(?=\S)/gm;
const SPLIT_COMPOUND = /(?<![\p{L}\p{N}])(\p{L}+)-([ \t]+|[ \t]*\n[ \t]*)(\p{L}{2,})/gu;
const FUNCTION_WORDS = new Set(
  (
    "a an and or nor to but as of the among in on at for with by from than then that which who " +
    "so yet if is was are were be"
  ).split(" ")
);

export function displayListBullets(text: string): string {
  if (!text.includes("- ") || (text.match(LIST_LINE)?.length ?? 0) < 2) return text;
  return text.replace(LIST_LINE, (m: string, indent: string, offset: number) => {
    const end = text.indexOf("\n", offset);
    return /[=≤≥]/.test(text.slice(offset, end === -1 ? undefined : end)) ? m : `${indent}• `;
  });
}

const MINUS_LINE = /^([ \t]*)-[ \t]+(?=[\d.(])/gm;

function joinSpacedMinus(text: string): string {
  return text.replace(MINUS_LINE, (m: string, indent: string, offset: number) => {
    const end = text.indexOf("\n", offset);
    const line = text.slice(offset, end === -1 ? undefined : end);
    const loneNumber = !text.includes("\n") && !/[A-Za-z]/.test(text);
    return loneNumber || line.includes("=") ? `${indent}-` : m;
  });
}

/** Whole-text pass for line-start hyphens: list bullets, then spaced minus signs. */
export function displayLineHyphens(text: string): string {
  return text.includes("- ") ? joinSpacedMinus(displayListBullets(text)) : text;
}

export function joinSplitCompounds(text: string): string {
  if (!/-\s/.test(text)) return text;
  return text.replace(SPLIT_COMPOUND, (m: string, left: string, gap: string, right: string) =>
    FUNCTION_WORDS.has(right.toLowerCase()) || (gap.includes("\n") && left.length > 5)
      ? m
      : `${left}-${right}`
  );
}

/** Text right after inline math: drop the spaces before a hyphenated suffix ("$xy$ -plane"). */
export function joinAfterMath(text: string): string {
  return text.replace(/^[ \t]+-(?=\p{L})/u, "-");
}
