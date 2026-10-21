// Paste in the expression list, for what one field cannot do alone (the MathField adapter writes a
// single pasted line itself, and owns copy and cut). Rendered inside ToastHost; it listens on its
// parent element in the capture phase, so it adds no box to the list and runs before the field.
// - Tabular text (RT-8, TABLES-49, -51, -52) pasted into an expression row or a table cell that
//   parses as a numeric grid becomes a new table, in place of an empty row or below the row pasted
//   into, focused at row 1 of its first column. When the view zooms to fit the pasted points, a
//   toast says "We zoomed to fit your data." with Undo, which puts the view back.
// - Several lines of other text are math, as on the reference (break-ui): the first fills the row
//   pasted into and each other line becomes a new row below it, with focus at the end of the last
//   one; pasted into a table cell, every line becomes a row below the table. NM-42's 100-row and
//   T-13's 2,048-character limits stop it with their messages.

import { useContext, useEffect, useRef, type JSX } from "react";
import { parsePastedGrid } from "@/lib/calculator/core/data/paste-grid";
import { pasteTable } from "@/lib/calculator/core/api/table-paste";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { MathField } from "../../math-field/MathField";
import { useAnnouncer, type Announcer } from "../a11y/announcer";
import { cellKey, FocusContext, type FocusController } from "../focus/focus-controller";
import { useEngine } from "../hooks/use-engine";
import { EDITOR_MESSAGES } from "./messages";
import { overRowLimit, pastedLatex, pastedLines } from "../../math-field/paste-text";
import { ToastContext } from "./Toast";

interface Kit {
  engine: CalculatorEngine;
  focus: FocusController | null;
  announcer: Announcer | null;
}

/** The mounted math field the paste event came from, or null (a native input, a button). */
function targetField(event: Event, focus: FocusController | null): MathField | null {
  if (focus === null) return null;
  const path = event.composedPath();
  return focus.fields().find((field) => path.includes(field.element)) ?? null;
}

/** The expression row that owns `field`, or null for a table cell or header. */
function ownRow(field: MathField, engine: CalculatorEngine): string | null {
  const host = field.element.closest<HTMLElement>("[data-row-id]");
  if (host === null || field.element.closest(".kc-table-field") !== null) return null;
  const id = host.dataset.rowId ?? null;
  return engine.getSnapshot().rows.some((r) => r.id === id && r.type !== "table") ? id : null;
}

/** Inserts each of `lines` as a new row after `after`; the id of the last one, or `after`. */
function insertLines(kit: Kit, after: string, lines: string[]): string {
  const { engine, announcer } = kit;
  let last = after;
  let tooLong = false;
  for (const line of lines) {
    if (overRowLimit(line)) {
      tooLong = true;
      continue;
    }
    const inserted = engine.insertRowAfter(last);
    if (typeof inserted === "string") {
      announcer?.announce(EDITOR_MESSAGES.rowLimit);
      break;
    }
    last = inserted.id;
    if (engine.editRow(last, line, "paste") !== null) tooLong = true;
  }
  if (tooLong) announcer?.announce(EDITOR_MESSAGES.charLimit);
  return last;
}

/** Writes two or more pasted math lines; see the file comment. */
function pasteMath(kit: Kit, field: MathField, lines: string[]): void {
  const { engine, focus, announcer } = kit;
  const latex = lines.map(pastedLatex);
  const rowId = ownRow(field, engine);
  const owner = field.element.closest<HTMLElement>("[data-row-id]")?.dataset.rowId ?? null;
  if (rowId === null && latex.length > 1 && owner !== null) {
    // Several lines pasted into a table cell become rows below the table, as on the reference.
    const last = insertLines(kit, owner, latex);
    if (last !== owner) focus?.focusRow(last, "end");
    return;
  }
  const [first, ...rest] = latex;
  engine.endEditGroup(); // a paste is its own undo step, apart from the typing before it
  if (overRowLimit(first)) announcer?.announce(EDITOR_MESSAGES.charLimit);
  else field.write(first);
  engine.endEditGroup();
  if (rowId === null || rest.length === 0) return;
  const last = insertLines(kit, rowId, rest);
  if (last !== rowId) focus?.focusRow(last, "end");
}

export function ListClipboard(): JSX.Element {
  const engine = useEngine();
  const focus = useContext(FocusContext);
  const toaster = useContext(ToastContext);
  const announcer = useAnnouncer();
  const ref = useRef<HTMLSpanElement>(null);
  const latest = useRef({ engine, focus, toaster, announcer });
  useEffect(() => {
    latest.current = { engine, focus, toaster, announcer };
  });
  useEffect(() => {
    const host = ref.current?.parentElement;
    if (host === null || host === undefined) return;
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text/plain") ?? "";
      const { engine: e, focus: f, toaster: t, announcer: a } = latest.current;
      const grid = parsePastedGrid(text);
      if (grid === null) {
        const lines = pastedLines(text);
        const field = targetField(event, f);
        // One line, or a field that is not a row's or a cell's (slider limits), pastes for itself.
        if (field === null || lines.length < 2) return;
        event.preventDefault();
        event.stopPropagation();
        pasteMath({ engine: e, focus: f, announcer: a }, field, lines);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
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
