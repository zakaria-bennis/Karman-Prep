// Pure helpers for one table item (D-5, D-19): the spoken name of a column header, the accessible
// names of the grid, its headers and its cells, and how many data rows a table shows. Type-only
// imports beyond the speech module, so node tests can load it.

import type { RowView } from "@/lib/calculator-v2/core/api/engine";
import { latexToSpeech } from "../../math-field/speech";

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

/** D-19: a header as it is read, with "x sub 1" written x₁; a blank header is "Column j". */
export function headerName(latex: string, column: number): string {
  const speech = latexToSpeech(latex).trim();
  if (speech === "") return `Column ${column + 1}`;
  return speech.replace(/\b([A-Za-z]) sub (\d+)\b/g, (_, letter: string, digits: string) => {
    const sub = [...digits].map((d) => SUBSCRIPT_DIGITS[Number(d)]).join("");
    return `${letter}${sub}`;
  });
}

/** D-19: the data rows a table shows, the longest stored column; one blank row follows them. */
export function dataRowCount(row: RowView): number {
  return Math.max(0, ...(row.columns ?? []).map((c) => c.values.length));
}

/** D-19: "Table n, k columns, m rows". */
export function gridName(number: number, columns: number, rows: number): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return `Table ${number}, ${plural(columns, "column")}, ${plural(rows, "row")}`;
}

/** D-19: an entered cell, "x₁, row r", with ", blank" while it is empty. */
export function cellName(header: string, row: number, latex: string): string {
  return `${header}, row ${row + 1}${latex.trim() === "" ? ", blank" : ""}`;
}

/** D-19: a computed cell, "x₁ squared, row r, computed, value", without the value while blank. */
export function computedCellName(header: string, row: number, value: string | null): string {
  return `${header}, row ${row + 1}, computed${value === null ? "" : `, ${value}`}`;
}

export const NEW_COLUMN_HEADER = "New column header";
