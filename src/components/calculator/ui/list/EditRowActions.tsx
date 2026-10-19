// EL-45: an expression row's actions in Edit list mode, 44 by 44 buttons at the row's right in
// place of its delete cross: Create Table (rows Create table can tabulate), Duplicate and Delete.
// Each rests at 0.6, gains a 10% fill on hover and goes to 1 pressed.

import type { JSX } from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { DuplicateGlyph, RemoveGlyph, TableItemGlyph } from "../../icons/list";
import type { Announcer } from "../a11y/announcer";
import type { FocusController } from "../focus/focus-controller";
import { deleteRowByControl, duplicateRow } from "./row-actions";

export function EditRowActions(props: {
  engine: CalculatorEngine;
  focus: FocusController;
  announcer: Announcer | null;
  rowId: string;
  number: number;
  canTabulate: boolean;
  onCreateTable(): void;
}): JSX.Element {
  const { engine, focus, announcer, rowId, number } = props;
  return (
    <div className="kc-edit-row-actions">
      {props.canTabulate && (
        <button
          type="button"
          className="kc-edit-row-action"
          aria-label={`Create Table: Expression ${number}`}
          onClick={props.onCreateTable}
        >
          <TableItemGlyph />
        </button>
      )}
      <button
        type="button"
        className="kc-edit-row-action"
        aria-label={`Duplicate: Expression ${number}`}
        onClick={() => duplicateRow(engine, announcer, rowId)}
      >
        <DuplicateGlyph />
      </button>
      <button
        type="button"
        className="kc-edit-row-action"
        aria-label={`Delete: Expression ${number}`}
        onClick={() => deleteRowByControl(engine, focus, rowId)}
      >
        <RemoveGlyph size={18} />
      </button>
    </div>
  );
}
