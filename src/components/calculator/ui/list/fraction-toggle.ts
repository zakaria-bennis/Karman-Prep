// R-5: the decimal/fraction toggle's words, as the reference has them (captured
// 2026-10-21). The toggle's name says what the row shows now and what Enter does; the Alt+Shift+A
// (Cmd+Shift+A on a Mac) shortcut announces the form the row switched to. A row's spoken value
// follows the form it shows. No React or MathQuill here, so node tests can load it.

import type { RowView } from "@/lib/calculator/core/api/engine";
import { fractionLatex } from "@/lib/calculator/core/eval/fraction";
import { latexToSpeech } from "../../math-field/speech";

export const FRACTION_LABELS = {
  decimal: "Displaying as decimal. Press Enter to display as Fraction",
  fraction: "Displaying as fraction. Press Enter to display as Decimal",
} as const;

/** R-5: the shortcut's announcement of the form a row now shows. */
export function fractionAnnouncement(asFraction: boolean): string {
  return asFraction ? "Show as Fraction" : "Show as Decimal";
}

/** The spoken form of a row's value: its fraction while it shows one, else its value text. */
export function spokenValue(row: Pick<RowView, "valueText" | "fraction" | "asFraction">): string {
  if (row.asFraction && row.fraction !== null) return latexToSpeech(fractionLatex(row.fraction));
  return row.valueText ?? "";
}
