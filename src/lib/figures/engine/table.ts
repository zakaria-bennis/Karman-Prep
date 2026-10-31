/**
 * House table rules. Tables stay HTML (TableView) for screen readers and text
 * selection; this module decides what each cell is and how it lines up:
 *
 * - numbers align on the decimal point: every number in a column is drawn as
 *   two boxes, the integer part right-aligned in one and the decimal point and
 *   fraction left-aligned in the other, both as wide as the column's widest
 *   part (computed here, in em), so the point sits at the same x in every row;
 * - text is left-aligned, and a cell that is wholly math is centered;
 * - a number written as math ("$1$") is still a number;
 * - currency and unit symbols sit tight against their number, and a leading
 *   hyphen becomes a minus sign.
 */
import type { FigureSpec, Part } from "./spec";

type TablePart = Extract<Part, { kind: "table" }>;

export type CellAlign = "decimal" | "left" | "center";

export type TableCell = {
  /** The text to show (units tightened, a number's math delimiters removed). */
  text: string;
  align: CellAlign;
  /** For numbers: the integer part, then the decimal point and everything after it. */
  int?: string;
  frac?: string;
};

export type DecimalColumn = { intEm: number; fracEm: number };

export type TableModel = {
  title?: string;
  note?: string;
  groups: { label: string; span: number }[] | null;
  header: TableCell[] | null;
  blankCorner: boolean;
  rows: TableCell[][];
  columnCount: number;
  /** With a multi-column header, each row's first cell is the row's heading. */
  rowHeaders: boolean;
  /** Per column: the widths of the integer and fraction boxes, or null without numbers. */
  decimal: (DecimalColumn | null)[];
};

/** Currency and unit symbols sit tight against their number: "$ 4.99" -> "$4.99", "12 %" -> "12%". */
export function tightenUnits(text: string): string {
  return text
    .replace(/(^|[\s(−-])([$€£])\s+(?=\d)/g, "$1$2")
    .replace(/(\d)\s+(%|¢)(?=$|[\s),.])/g, "$1$2");
}

/** Numbers: counts, money, percents and ranges like 1980-81. */
export function isNumericCell(text: string) {
  return /^[-−+$€£(]?\d[\d,.\s ]*(%|\))?([-–]\d[\d,.]*)?$/.test(text.trim());
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

/** "$1$" or "\(2.5\)": a number in math delimiters, as plain text; otherwise null. */
function unwrapMathNumber(text: string): string | null {
  const m = text.match(/^\$\s*([^$]+?)\s*\$$/) ?? text.match(/^\\\(\s*(.+?)\s*\\\)$/);
  if (!m) return null;
  const inner = m[1].replace(/\{,\}/g, ",");
  return isNumericCell(inner) ? inner : null;
}

/** A cell that is one math expression from end to end. */
function isWholeMath(text: string) {
  return /^\$[^$]+\$$/.test(text) || /^\\\(.+\\\)$/.test(text) || /^\$\$[\s\S]+\$\$$/.test(text);
}

/**
 * Splits a number into the part left of its decimal point and the rest, and turns a
 * leading hyphen into a minus sign. A number without a point splits after its leading
 * digits, so a suffix ("%", ")", "¢", a range's "-81") sits right of where the point
 * would be, and "12%" lines up with "12.5%".
 */
export function splitDecimal(text: string): { int: string; frac: string } {
  const number = text.trim().replace(/^-/, "−");
  const point = number.search(/\.\d/);
  if (point >= 0) return { int: number.slice(0, point), frac: number.slice(point) };
  const lead = number.match(/^[-−+$€£(]?\d(?:[\d,]|\s(?=\d))*/);
  if (!lead) return { int: number, frac: "" };
  return { int: lead[0], frac: number.slice(lead[0].length) };
}

/** Which edges have more content past them while a frame scrolls (drives the fades). */
export function scrollEdges(scrollLeft: number, clientWidth: number, scrollWidth: number) {
  return {
    left: scrollLeft > 1,
    right: scrollLeft + clientWidth < scrollWidth - 1,
  };
}

/**
 * Approximate advance widths in em for the figure serif with tabular figures.
 * Rounded up, so a box sized from them is never narrower than its text.
 */
const ADVANCE: Record<string, number> = {
  ".": 0.26,
  ",": 0.26,
  " ": 0.26,
  " ": 0.26,
  "-": 0.34,
  "−": 0.58,
  "+": 0.58,
  "–": 0.52,
  "(": 0.34,
  ")": 0.34,
  "%": 0.84,
  $: 0.52,
  "€": 0.52,
  "£": 0.52,
  "¢": 0.52,
};

/** Estimated width of a number's text in em (digits are 0.5em with tabular figures). */
export function textWidthEm(text: string): number {
  let w = 0;
  for (const ch of text) w += /\d/.test(ch) ? 0.52 : (ADVANCE[ch] ?? 0.62);
  return Math.round(w * 100) / 100;
}

function classify(source: string): TableCell {
  const text = tightenUnits(source);
  const number = isNumericCell(text) ? text.trim() : unwrapMathNumber(text.trim());
  if (number !== null) return { text: number, align: "decimal", ...splitDecimal(number) };
  if (isWholeMath(text.trim())) return { text, align: "center" };
  return { text, align: "left" };
}

function decimalColumns(rows: TableCell[][], columnCount: number): (DecimalColumn | null)[] {
  return Array.from({ length: columnCount }, (_, c) => {
    const numbers = rows.map((r) => r[c]).filter((cell) => cell?.align === "decimal");
    if (!numbers.length) return null;
    return {
      intEm: Math.max(...numbers.map((n) => textWidthEm(n.int ?? ""))),
      fracEm: Math.max(...numbers.map((n) => textWidthEm(n.frac ?? ""))),
    };
  });
}

/** The table part of a `type: table` spec, laid out by the house rules. */
export function layoutTable(spec: FigureSpec): TableModel {
  const part = spec.parts.find((p): p is TablePart => p.kind === "table");
  if (!part) throw new Error("a table figure needs a table part");
  const header = part.header?.length
    ? part.header.map((h) => ({ text: tightenUnits(h), align: "center" as const }))
    : null;
  const rows = part.rows.map((row) => row.map(classify));
  const groups = part.groups?.length ? part.groups : null;
  const columnCount = Math.max(
    header?.length ?? 0,
    groups ? groups.reduce((n, g) => n + g.span, 0) : 0,
    ...rows.map((r) => r.length),
    1
  );
  return {
    title: spec.title || undefined,
    note: part.note || undefined,
    groups,
    header,
    blankCorner: Boolean(header && (part.blankCorner || header[0].text.trim() === "")),
    rows,
    columnCount,
    rowHeaders: Boolean(header && header.length > 1),
    decimal: decimalColumns(rows, columnCount),
  };
}
