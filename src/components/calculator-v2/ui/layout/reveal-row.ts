// L-14 (10 Decision 2): keeps the focused or active row in view. The keypad region sits in flow
// under the list, so the list's scroll box ends at the keypad's top edge; whenever that box
// changes size (keypad open or close, layout or host size change), CalculatorLayout calls
// revealRow, whichever order focus and keypad arrive in.

/** Scrolls `region`'s row `rowId` into view (nearest edge); does nothing for null or a missing row. */
export function revealRow(region: HTMLElement, rowId: string | null): void {
  if (rowId === null) return;
  const row = [...region.querySelectorAll<HTMLElement>("[data-row-id]")].find(
    (el) => el.dataset.rowId === rowId
  );
  row?.scrollIntoView({ block: "nearest" });
}
