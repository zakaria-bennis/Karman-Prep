// Row presence for AN-5 (09 Task 6): which rows the list renders and in which motion state. A row
// that joins the list is "enter" for one commit, then "idle", so its height can grow from 0; a row
// that leaves stays at its last index as "exit" until its row reports the exit transition done.
// The first render shows every row "idle", so opening the calculator animates nothing.

import { useCallback, useEffect, useState } from "react";
import type { RowView } from "@/lib/calculator/core/api/engine";

export type RowMotion = "enter" | "idle" | "exit";

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
 * not in the list before (a row that returns while exiting enters again), otherwise its previous
 * motion; then each row that left, as "exit" at its index in `previous`, in index order.
 */
function reconcile(previous: readonly PresentRow[], rows: readonly RowView[]): PresentRow[] {
  const before = new Map(previous.map((item) => [item.row.id, item.motion]));
  const ids = new Set(rows.map((row) => row.id));
  const items: PresentRow[] = rows.map((row) => {
    const motion = before.get(row.id);
    return { row, motion: motion === undefined || motion === "exit" ? "enter" : motion };
  });
  previous.forEach((item, index) => {
    if (ids.has(item.row.id)) return;
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

  // "enter" lasts one commit: the row has drawn its collapsed height, so "idle" transitions.
  useEffect(() => {
    if (!items.some((item) => item.motion === "enter")) return;
    setPresence((p) => ({
      rows: p.rows,
      items: p.items.map((item) => (item.motion === "enter" ? { ...item, motion: "idle" } : item)),
    }));
  }, [items]);

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
