// SLIDERS-25: where Tab from a slider row's Play button goes. The reference ends a row's tab stops
// with Play and goes on to the next row's math; past the last row, focus moves to the first tab
// stop after the row in the calculator.

import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { FocusController } from "../focus/focus-controller";
import { leaveRow } from "./row-actions";

const TABBABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/** The first tab stop after `item` (outside it) in its document or shadow root, or null. */
export function nextTabStop(item: Element): HTMLElement | null {
  const root = item.getRootNode() as Document | ShadowRoot;
  for (const el of root.querySelectorAll<HTMLElement>(TABBABLE)) {
    if (item.contains(el) || !(item.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))
      continue;
    if (el.tabIndex < 0 || el.matches(":disabled") || el.closest("[inert], [hidden]") !== null)
      continue;
    if (el.getClientRects().length === 0) continue;
    return el;
  }
  return null;
}

/** Tab from the Play button of row `rowId`: the next row's math, else the next tab stop. */
export function tabPastRow(
  engine: CalculatorEngine,
  focus: FocusController,
  rowId: string,
  item: Element | null
): void {
  const { rows } = engine.getSnapshot();
  const i = rows.findIndex((r) => r.id === rowId);
  if (i >= 0 && i < rows.length - 1) {
    leaveRow(engine, focus, rowId, "down");
    return;
  }
  if (item !== null) nextTabStop(item)?.focus();
}
