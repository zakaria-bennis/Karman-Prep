// Pure helpers for one expression row (01-interfaces-integration.md section 11; 09 Task 2): which
// gutter tab a row shows, the ids of the row parts its textbox names and describes (A11Y-3, A11Y-4,
// A11Y-7: every id stays inside the calculator's own tree), and the textbox inside a MathField.
// Type-only imports, so node tests that load this module never load the engine or MathQuill.

import type { RowView } from "@/lib/calculator/core/api/engine";
import type { MathField } from "../../math-field/MathField";

export type RowTab = "line" | "point" | null;

/** The row kinds that draw a curve, line set, region or relation: their tab is a line glyph. */
const LINE_KINDS: ReadonlySet<RowView["kind"]> = new Set<RowView["kind"]>([
  "curve-y",
  "curve-x",
  "implicit",
  "vertical-lines",
  "horizontal-lines",
  "region",
  "constant-relation",
]);

/**
 * R-1, A11Y-3 (09 Decisions, "Gutter tab only on rows with something to hide"): a point row shows
 * the point tab and a graphing row the line tab. An error row does not plot, so it offers no tab
 * (R-2: its warning marker takes the tab's place; a row hidden before it broke gets its tab back
 * once the error is fixed). Every other row has no graph to hide and no tab.
 */
export function rowTab(row: RowView): RowTab {
  if (row.kind === "point") return "point";
  if (LINE_KINDS.has(row.kind)) return "line";
  return null;
}

export interface RowDomIds {
  label: string;
  speech: string;
  value: string;
  error: string;
  hint: string;
}

/** The ids of a row's label, speech, value, error and hint parts: `kc-row-<id>-<part>`. */
export function rowDomIds(rowId: string): RowDomIds {
  const id = (part: keyof RowDomIds) => `kc-row-${rowId}-${part}`;
  return {
    label: id("label"),
    speech: id("speech"),
    value: id("value"),
    error: id("error"),
    hint: id("hint"),
  };
}

/** The element that takes the row's textbox role: the field's textarea, else its root element. */
export function fieldTextbox(field: MathField): HTMLElement {
  return field.element.querySelector("textarea") ?? field.element;
}
