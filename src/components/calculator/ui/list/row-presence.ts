// Row presence for AN-5: which rows the list renders and in which motion state. A row
// that joins the list is "enter" until the rows next change, then "idle" (VIS-30 adds a row at
// once, so "enter" draws nothing of its own); a row that leaves stays at its last index as "exit"
// until its row reports the exit transition done. The first render shows every row "idle", so
// opening the calculator animates nothing. No effect flips "enter" to "idle": an update from a
// passive effect on every added row waits as Default-lane work, and under fast input (a held
// Enter) that work starves until React's update-depth guard throws (break-ui).

import { useCallback, useState } from "react";
import type { RowView } from "@/lib/calculator/core/api/engine";

export type RowMotion = "enter" | "idle" | "exit";

/**
 * Rows removed from the keyboard (Backspace or Delete in an empty row), which leave at once with
 * no exit motion, as the reference's do; the next reconcile consumes each mark.
 */
const instantRemovals = new Set<string>();

/** Marks row `rowId`'s coming removal as a keyboard one, with no exit motion. */
export function removeWithoutMotion(rowId: string): void {
  instantRemovals.add(rowId);
}

export interface PresentRow {
  row: RowView;
  motion: RowMotion;
}

interface Presence {
  rows: readonly RowView[]; // the rows the items were built from
  items: readonly PresentRow[];
}

/**
 * The items for `rows` after `previous`: each row with its latest view, "enter" when its id was
 * not in the list before (a row that returns while exiting enters again), "idle" when it was there
 * (an earlier "enter" included); then each row that left, as "exit" at its index in `previous`, in
 * index order.
 */
function reconcile(previous: readonly PresentRow[], rows: readonly RowView[]): PresentRow[] {
  const before = new Map(previous.map((item) => [item.row.id, item.motion]));
  const ids = new Set(rows.map((row) => row.id));
  const items: PresentRow[] = rows.map((row) => {
    const motion = before.get(row.id);
    return { row, motion: motion === undefined || motion === "exit" ? "enter" : "idle" };
  });
  previous.forEach((item, index) => {
    if (ids.has(item.row.id)) return;
    if (instantRemovals.delete(item.row.id)) return;
    items.splice(Math.min(index, items.length), 0, { row: item.row, motion: "exit" });
  });
  return items;
}

export function useRowPresence(rows: readonly RowView[]): {
  items: readonly PresentRow[];
  exitDone(rowId: string): void;
} {
  const [presence, setPresence] = useState<Presence>(() => ({
    rows,
    items: rows.map((row) => ({ row, motion: "idle" })),
  }));
  // A new rows list is reconciled during render, so its first commit already shows "enter" and
  // "exit" (React's pattern for state derived from the previous render).
  let current = presence;
  if (presence.rows !== rows) {
    current = { rows, items: reconcile(presence.items, rows) };
    setPresence(current);
  }
  const { items } = current;

  // Only a row that is still exiting leaves; a late call for a row that came back does nothing.
  const exitDone = useCallback((rowId: string) => {
    setPresence((p) =>
      p.items.some((item) => item.row.id === rowId && item.motion === "exit")
        ? {
            rows: p.rows,
            items: p.items.filter((item) => item.row.id !== rowId || item.motion !== "exit"),
          }
        : p
    );
  }, []);

  return { items, exitDone };
}
