// Sizing rules for QuestionTable. Words never break: cells wrap only at spaces, so
// each column is at least as wide as its longest word. A table that is too wide
// for its column first steps its padding and type down (never below 13px); if it
// is still too wide, it scrolls sideways inside its frame instead of breaking words.

export const DENSITY_TIERS = ["roomy", "compact", "dense"] as const;
export type TableDensity = (typeof DENSITY_TIERS)[number];

/** First-paint guess before measuring: wide tables are likely smaller (8+ columns dense, 6-7 compact). */
export function startingDensity(columns: number): TableDensity {
  if (columns >= 8) return "dense";
  if (columns >= 6) return "compact";
  return "roomy";
}

/**
 * Steps from `start` down to "dense" and returns the first tier where `fits` is true.
 * When even "dense" (13px) is too wide, it stays at "dense" and reports overflow,
 * so the table scrolls rather than breaking words or shrinking text further.
 */
export function fitDensity(
  start: TableDensity,
  fits: (tier: TableDensity) => boolean
): { tier: TableDensity; overflow: boolean } {
  for (const tier of DENSITY_TIERS.slice(DENSITY_TIERS.indexOf(start))) {
    if (fits(tier)) return { tier, overflow: false };
  }
  return { tier: "dense", overflow: true };
}

/** Which edges have hidden content past them (drives the left and right fades). */
export function scrollEdges(scrollLeft: number, clientWidth: number, scrollWidth: number) {
  return {
    left: scrollLeft > 1,
    right: scrollLeft + clientWidth < scrollWidth - 1,
  };
}

/**
 * Splits plain cell text into words and the spaces between them, so each word can be
 * rendered unbreakable (browsers would otherwise wrap at hyphens and dashes, as in
 * "1980-81"). Text with math, blanks or source markup returns null and renders as is.
 */
const MARKUP = /[$\\<[_]/;
export function plainWords(text: string): string[] | null {
  if (MARKUP.test(text)) return null;
  return text.split(/(\s+)/).filter((part) => part.length > 0);
}

/** Numbers (counts, money, percents, ranges like 1980-81) never wrap. */
export function isNumericCell(text: string) {
  return /^[-−+$€£(]?\d[\d,.\s ]*(%|\))?([-–]\d[\d,.]*)?$/.test(text.trim());
}

/** Wrap only at spaces: no breaks inside a word, no hyphenation. */
export const WORD_WRAP = "[word-break:normal] [overflow-wrap:normal] [hyphens:none]";

/** Padding and type per density; the figure's data-table-density attribute picks the tier. */
export const DENSITY_CELL = [
  "px-4 py-3 text-base leading-snug",
  "group-data-[table-density=compact]/table:px-2.5 group-data-[table-density=compact]/table:py-2 group-data-[table-density=compact]/table:text-sm",
  "group-data-[table-density=dense]/table:px-1.5 group-data-[table-density=dense]/table:py-1.5 group-data-[table-density=dense]/table:text-[13px] group-data-[table-density=dense]/table:leading-tight",
].join(" ");
