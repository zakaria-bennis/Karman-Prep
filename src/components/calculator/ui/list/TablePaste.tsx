// Tabular paste in the expression list (RT-8, TABLES-49, -51, -52): text pasted anywhere in the list
// (an expression row or a table cell) that parses as a numeric grid becomes a new table, in place
// of an empty row or below the row pasted into, focused at row 1 of its first column. When the view
// zooms to fit the pasted points, a toast says "We zoomed to fit your data." with Undo, which puts
// the view back. Other text is left to the field. Rendered inside ToastHost; it listens on its
// parent element, so it adds no box to the list.

import { useContext, useEffect, useRef, type JSX } from "react";
import { parsePastedGrid } from "@/lib/calculator/core/data/paste-grid";
import { pasteTable } from "@/lib/calculator/core/api/table-paste";
import { cellKey, FocusContext } from "../focus/focus-controller";
import { useEngine } from "../hooks/use-engine";
import { ToastContext } from "./Toast";

export function TablePaste(): JSX.Element {
  const engine = useEngine();
  const focus = useContext(FocusContext);
  const toaster = useContext(ToastContext);
  const ref = useRef<HTMLSpanElement>(null);
  const latest = useRef({ engine, focus, toaster });
  useEffect(() => {
    latest.current = { engine, focus, toaster };
  });
  useEffect(() => {
    const host = ref.current?.parentElement;
    if (host === null || host === undefined) return;
    const onPaste = (event: ClipboardEvent) => {
      const grid = parsePastedGrid(event.clipboardData?.getData("text/plain") ?? "");
      if (grid === null) return;
      event.preventDefault();
      event.stopPropagation();
      const { engine: e, focus: f, toaster: t } = latest.current;
      const snapshot = e.getSnapshot();
      const before = snapshot.viewport;
      const made = pasteTable(e, snapshot.focusedRowId ?? snapshot.activeRowId, grid);
      if (made === null) return;
      requestAnimationFrame(() => f?.focusRow(cellKey(made.id, 0, 0), "end"));
      if (made.zoomed) {
        t?.show({
          text: "We zoomed to fit your data.",
          action: { label: "Undo", run: () => e.setMathBounds(before) },
        });
      }
    };
    host.addEventListener("paste", onPaste, { capture: true });
    return () => host.removeEventListener("paste", onPaste, { capture: true });
  }, []);
  return <span ref={ref} hidden />;
}
