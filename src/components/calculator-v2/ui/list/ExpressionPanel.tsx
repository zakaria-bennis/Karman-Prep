// The expression list panel (01-interfaces-integration.md section 11 and 09's Row DOM): a region
// named "Expression list" whose list body holds the "List tools" toolbar (L-1, L-2: Add item, the
// stacked Keypad toggle, Undo, Redo, Edit list, Collapse list), the Edit list bar (KB-5: Clear all
// expressions, Done) and the "Expressions" list, one numbered row per engine row. Undo and Redo
// stay in the Tab order at the ends of the stack, aria-disabled (KB-2, KB-13). Motion and
// Collapse list's action come in Task 6.

import { ChevronsLeft, Keyboard, Pencil, Plus, Redo2, Undo2, type LucideIcon } from "lucide-react";
import { useContext, useRef, useState, type JSX, type Ref } from "react";
import { useAnnouncer } from "../a11y/announcer";
import { FocusContext } from "../focus/focus-controller";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { ExpressionRow } from "./ExpressionRow";
import { clearAllRows, insertRowBelow, performRedo, performUndo } from "./row-actions";

export interface ExpressionPanelProps {
  layout: "desktop" | "stacked";
  pointer: "fine" | "coarse";
  keypadOpen: boolean;
  onToggleKeypad(): void; // L-2 toolbar Keypad toggle
  onTouchFocusRow(rowId: string): void; // K-2: the shell decides whether the keypad opens
}

interface ToolButtonProps {
  label: string;
  icon: LucideIcon;
  pressed?: boolean; // a toggle: aria-pressed
  disabled?: boolean; // aria-disabled; the button stays focusable (KB-13)
  onClick?(): void;
  buttonRef?: Ref<HTMLButtonElement>;
}

/** One toolbar button, named by its aria-label and drawn with a lucide icon. */
function ToolButton(props: ToolButtonProps): JSX.Element {
  const Icon = props.icon;
  return (
    <button
      type="button"
      className="kc-list-tool"
      ref={props.buttonRef}
      aria-label={props.label}
      aria-pressed={props.pressed}
      aria-disabled={props.disabled}
      onClick={props.onClick}
    >
      <Icon aria-hidden="true" focusable="false" size={20} />
    </button>
  );
}

export function ExpressionPanel(props: ExpressionPanelProps): JSX.Element {
  const engine = useEngine();
  const { rows, canUndo, canRedo } = useEngineSnapshot(engine);
  const focus = useContext(FocusContext);
  const announcer = useAnnouncer();
  const [editing, setEditing] = useState(false);
  const editListRef = useRef<HTMLButtonElement>(null);
  if (focus === null) throw new Error("ExpressionPanel must be used inside FocusContext");

  // Done leaves Edit list mode and returns focus to the Edit list toggle it came from.
  const finishEditing = () => {
    editListRef.current?.focus();
    setEditing(false);
  };

  return (
    <section
      className="kc-list-panel"
      aria-label="Expression list"
      data-layout={props.layout}
      data-pointer={props.pointer}
    >
      <div className="kc-list-body">
        <div className="kc-list-toolbar" role="toolbar" aria-label="List tools">
          <ToolButton
            label="Add item"
            icon={Plus}
            onClick={() => insertRowBelow(engine, focus, announcer, null, "focus")}
          />
          {props.layout === "stacked" && (
            <ToolButton
              label="Keypad"
              icon={Keyboard}
              pressed={props.keypadOpen}
              onClick={props.onToggleKeypad}
            />
          )}
          {/* performUndo and performRedo do nothing at the ends of the stack, so an
              aria-disabled button ignores activation. */}
          <ToolButton
            label="Undo"
            icon={Undo2}
            disabled={!canUndo}
            onClick={() => performUndo(engine, announcer)}
          />
          <ToolButton
            label="Redo"
            icon={Redo2}
            disabled={!canRedo}
            onClick={() => performRedo(engine, announcer)}
          />
          <ToolButton
            label="Edit list"
            icon={Pencil}
            pressed={editing}
            buttonRef={editListRef}
            onClick={() => setEditing((on) => !on)}
          />
          <ToolButton label="Collapse list" icon={ChevronsLeft} />
        </div>
        {editing && (
          <div className="kc-edit-bar">
            <button
              type="button"
              className="kc-edit-action"
              onClick={() => clearAllRows(engine, focus, announcer)}
            >
              Clear all expressions
            </button>
            <button type="button" className="kc-edit-action" onClick={finishEditing}>
              Done
            </button>
          </div>
        )}
        {/* role="list" keeps list semantics in WebKit, which drops them under list-style: none */}
        <ol className="kc-list" role="list" aria-label="Expressions">
          {rows.map((row, i) => (
            <ExpressionRow
              key={row.id}
              row={row}
              number={i + 1}
              keypadOpen={props.keypadOpen}
              onTouchFocus={props.onTouchFocusRow}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}
