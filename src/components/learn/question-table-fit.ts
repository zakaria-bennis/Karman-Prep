// Sizing rules for QuestionTable. Words never break: cells wrap only at spaces, so
// each column is at least as wide as its longest word. Tables start large (18px type,
// founder review 2026-10-22: fill the box without crowding). A table that is too wide
// for its column, or too tall for its laptop pane, steps its padding and type down
// (never below 13px); if it is still too wide, it scrolls sideways inside its frame
// instead of breaking words.

export const DENSITY_TIERS = ["large", "roomy", "compact", "dense"] as const;
export type TableDensity = (typeof DENSITY_TIERS)[number];

/** First-paint guess before measuring: wide tables are likely smaller (8+ columns dense, 6-7 compact). */
export function startingDensity(columns: number): TableDensity {
  if (columns >= 8) return "dense";
  if (columns >= 6) return "compact";
  if (columns >= 5) return "roomy";
  return "large";
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

/**
 * Picks the roomiest tier whose table is both narrow enough for its column and short
 * enough for its pane. A table too tall even at "dense" takes "dense" (least scrolling
 * of the pane); `overflow` reports only sideways overflow, which scrolls the table.
 */
export function fitTable(
  start: TableDensity,
  measure: (tier: TableDensity) => { width: boolean; height: boolean }
): { tier: TableDensity; overflow: boolean } {
  const both = fitDensity(start, (t) => {
    const m = measure(t);
    return m.width && m.height;
  });
  if (!both.overflow) return both;
  return { tier: "dense", overflow: !measure("dense").width };
}

/** Currency and unit symbols sit tight against their number: "$ 4.99" -> "$4.99", "12 %" -> "12%". */
export function tightenUnits(text: string): string {
  return text
    .replace(/(^|[\s(−-])([$€£])\s+(?=\d)/g, "$1$2")
    .replace(/(\d)\s+(%|¢)(?=$|[\s),.])/g, "$1$2");
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
  "px-5 py-3 text-lg leading-snug",
  "group-data-[table-density=roomy]/table:px-4 group-data-[table-density=roomy]/table:py-3 group-data-[table-density=roomy]/table:text-base",
  "group-data-[table-density=compact]/table:px-2.5 group-data-[table-density=compact]/table:py-2 group-data-[table-density=compact]/table:text-sm",
  "group-data-[table-density=dense]/table:px-1.5 group-data-[table-density=dense]/table:py-1.5 group-data-[table-density=dense]/table:text-[13px] group-data-[table-density=dense]/table:leading-tight",
].join(" ");
