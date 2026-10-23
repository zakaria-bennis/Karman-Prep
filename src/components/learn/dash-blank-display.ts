// Display-only clean-up of OCR'd dash and blank artifacts in question prose (founder, 2026-10-22:
// "any stringing of hyphens together is an em dash, any stringing of underscores is a blank").
// Callers pass prose only, never math. Approved source text is never altered.
//
// Hyphens: a run of 2+ hyphens ("--", "---", "-------"), a spaced run of 3+ ("- - -"), a hyphen
// run split by one line break ("--\n-") and any hyphen touching an em dash ("-—") all show as one
// "—", and the spaces or tabs beside it are dropped (SAT em dashes are unspaced). Left literal:
// single hyphens and "- -" (minus signs like "5 - -3"), "--" before a digit ("x--1"), runs
// touching "|" or ":" (Markdown table rules "|---|", ":---:"), a line of only hyphens in
// multi-line text (a horizontal rule), and anything inside a URL or `code`.
// A run of 5+ hyphens with a space or text edge on both sides sits where SAT prints a blank
// ("suggests that ------"), so it becomes a blank instead.
//
// Underscores: every run of 2+ underscores, and spaced runs ("_ _ _"), is one answer blank,
// except inside a URL or `code`. MathText draws each blank as the same fixed-width line.

/** Hyphen/em dash clusters, with the spaces or tabs around them. */
const DASH_CLUSTER = /[ \t]*[-—]+(?: [-—]+)*[ \t]*/g;
/** Only worth scanning text that has a hyphen next to (or one space from) a hyphen or em dash. */
const MAYBE_DASH = /-[ \t]?-|—-|-—/;
/** A line ending in 2+ hyphens whose dash continues on the next line ("distinction --\n- why"). */
const SPLIT_DASH = /(?<=[^\s-][ \t]*-{2,})[ \t]*\n[ \t]*(?=-+[ \t]*[^\s|:-])/g;
/** Spans whose characters are never display-converted. */
const PROTECTED = /`[^`\n]*`|(?:https?:\/\/|www\.)\S+/g;
/** The blank text a hyphen blank becomes; MathText's blank pattern draws it. */
const BLANK_MARK = "______";
/** Blank markers MathText draws as one line: underscore runs and spaced runs ("_ _ _"). An
 *  underscore run followed by the word "blank" (screen-reader text captured with the source:
 *  `______blank`, `______ blank`, `______ [blank]`) is one blank, never two. */
const UNDERSCORE_BLANK =
  /_{2,}[ \t]*[[(]?blank[\])]?_*(?!\w)|_{2,}|(?<![\w_])_(?:[ \t]_)+(?![\w_])/gi;
/** Passages also treat the word "blank" (optionally wrapped in `_` or `-`) as a blank. */
const UNDERSCORE_OR_WORD_BLANK = new RegExp(
  `${UNDERSCORE_BLANK.source}|(?<!\\w)[_-]*blank[_-]*(?!\\w)`,
  "gi"
);

/** [start, end) ranges of URLs and code spans. */
function protectedRanges(text: string): [number, number][] {
  if (!text.includes("`") && !/https?:\/\/|www\./.test(text)) return [];
  return [...text.matchAll(PROTECTED)].map((m) => [m.index!, m.index! + m[0].length]);
}

function inRanges(ranges: [number, number][], start: number, end: number) {
  return ranges.some(([a, b]) => start < b && end > a);
}

function lineOf(text: string, start: number, end: number) {
  const from = text.lastIndexOf("\n", start - 1) + 1;
  const to = text.indexOf("\n", end);
  return text.slice(from, to === -1 ? text.length : to);
}

function convertCluster(match: string, offset: number, text: string, ranges: [number, number][]) {
  const core = match.trim();
  const hyphens = core.replace(/[^-]/g, "").length;
  if (hyphens === 0 || (hyphens === 1 && !core.includes("—"))) return match;
  const end = offset + match.length;
  if (inRanges(ranges, offset, end)) return match;
  const before = text.slice(0, offset).match(/[^ \t]?$/)![0];
  const after = text.slice(end).match(/^[ \t]*([^ \t]?)/)![1];
  if (before === ":" && !match.startsWith(" ")) return match;
  if (after === ":" && !match.endsWith(" ")) return match;
  if (before === "|" || after === "|") return match;
  const hyphenOnly = !core.includes("—");
  const groups = core.split(" ");
  if (hyphenOnly && lineOf(text, offset, end).trim() === core && text.includes("\n")) return match;
  if (hyphenOnly && groups.length > 1) return groups.length >= 3 ? "—" : match;
  if (hyphenOnly && core === "--" && /^\.?\d/.test(text.slice(end))) return match;
  const spacedLeft = offset === 0 || /^\s/.test(match) || before === "\n";
  const spacedRight = end === text.length || /\s$/.test(match) || after === "\n";
  if (hyphenOnly && groups.length === 1 && hyphens >= 5 && spacedLeft && spacedRight) {
    if (text.trim() === core) return "—";
    return match.replace(core, BLANK_MARK);
  }
  return "—";
}

/** Prose display text: hyphen runs drawn as "—", blank-position hyphen runs as `BLANK_MARK`. */
export function displayDashes(text: string): string {
  if (!MAYBE_DASH.test(text)) return text;
  const ranges = protectedRanges(text);
  const joined = ranges.length ? text : text.replace(SPLIT_DASH, "");
  return joined.replace(DASH_CLUSTER, (m: string, offset: number) =>
    convertCluster(m, offset, joined, ranges)
  );
}

export interface BlankSegment {
  value: string;
  isBlank: boolean;
}

function splitBlanks(text: string, pattern: RegExp): BlankSegment[] {
  const segments: BlankSegment[] = [];
  const ranges = protectedRanges(text);
  let cursor = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index === undefined || inRanges(ranges, m.index, m.index + m[0].length)) continue;
    if (m.index > cursor) segments.push({ value: text.slice(cursor, m.index), isBlank: false });
    segments.push({ value: m[0], isBlank: true });
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length) segments.push({ value: text.slice(cursor), isBlank: false });
  return segments;
}

/** Prose split into display text (dashes applied) and blanks. Passages pass `treatBlankWord`. */
export function blankSegments(text: string, treatBlankWord = false): BlankSegment[] {
  const pattern = treatBlankWord ? UNDERSCORE_OR_WORD_BLANK : UNDERSCORE_BLANK;
  return splitBlanks(text, pattern).flatMap((s) =>
    s.isBlank ? [s] : splitBlanks(displayDashes(s.value), UNDERSCORE_BLANK)
  );
}
