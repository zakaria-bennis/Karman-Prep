// What a Rewards box gives next (founder, 2026-11-16: a box holds only things to wear, one of each
// of the 100 before any repeats). One order for the page and the server: the page shows it, the
// server decides it, so a box can never be made to give a thing of the student's choosing.
// Pure: no React, no drawings (accessories.tsx stays out of the server bundle).

/** How many things to wear there are (ACCESSORIES in accessories.tsx; a test keeps them equal). */
export const ACCESSORY_COUNT = 100;

/** The id of the next thing a box gives: one not yet won, taken in an order that looks like chance
 *  and reaches all of them before it repeats. Null when every one is won. */
export function nextPrize(owned: readonly string[], count = ACCESSORY_COUNT): string | null {
  const have = new Set(owned);
  for (let n = owned.length; n < owned.length + count; n++) {
    const id = String((n * 37 + 11) % count);
    if (!have.has(id)) return id;
  }
  return null;
}
