// The expression list panel (01-interfaces-integration.md section 11 and 09's Row DOM): a region
// named "Expression list" whose list body holds the "List tools" toolbar (L-1, L-2: Add item, the
// stacked Keypad toggle, Undo, Redo, Edit list, Collapse list), the Edit list bar (KB-5: Clear all
// expressions, Done) and the "Expressions" list, one numbered row per engine row. Undo and Redo
// stay in the Tab order at the ends of the stack, aria-disabled (KB-2, KB-13). While mounted it
// announces row values and errors through createRowAnnouncements (A11Y-2). Rows enter and exit
// through useRowPresence and only rows that are not exiting are numbered (AN-5). Collapse list and
// Expand list run AN-3's lifecycle in data-list-state and flip settings.expressionsCollapsed only
// when the transition ends, so the layout resizes the graph once (09 consumer note 4).

import {
  ChevronsLeft,
  ChevronsRight,
  Keyboard,
  Pencil,
  Redo2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type Ref,
} from "react";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import { useAnnouncer } from "../a11y/announcer";
import { FocusContext } from "../focus/focus-controller";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { AddItemMenu } from "./AddItemMenu";
import { createRowAnnouncements } from "./announcements";
import { ExpressionRow } from "./ExpressionRow";
import { MotionContext } from "./motion";
import { clearAllRows, performRedo, performUndo } from "./row-actions";
import { useRowPresence } from "./row-presence";

type ListState = "expanded" | "collapsing" | "collapsed" | "expanding";

/** The list body's in-flow size at the last collapse; the Expand list overlay takes it (AN-3). */
interface BodySize {
  width: number;
  height: number;
}

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

/**
 * AN-3's Collapse list and Expand list lifecycle. Each transition lasts the list body's own
 * transition-duration, read in a layout effect once its state is committed (0 finishes in that
 * layout effect, any other value sets one timeout), and only then flips expressionsCollapsed, so
 * the layout resizes the graph once per transition. A flip from elsewhere (the API, setBlank)
 * sets collapsed or expanded at once.
 */
function useListLifecycle(engine: CalculatorEngine, collapsedSetting: boolean) {
  const readDuration = useContext(MotionContext);
  const [listState, setListState] = useState<ListState>(
    collapsedSetting ? "collapsed" : "expanded"
  );
  const [seenSetting, setSeenSetting] = useState(collapsedSetting);
  if (collapsedSetting !== seenSetting) {
    // The panel's own flip at the end of a transition lands here too, already in that state.
    setSeenSetting(collapsedSetting);
    setListState(collapsedSetting ? "collapsed" : "expanded");
  }
  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const sizeRef = useRef<BodySize | null>(null);
  /** The button that takes focus once the transition that set this has committed. */
  const focusAfter = useRef<"expand" | "collapse" | null>(null);

  // Collapsing: the list body stays in flow, so the column keeps its width until the flip.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (listState !== "collapsing" || body === null) return;
    sizeRef.current = { width: body.offsetWidth, height: body.offsetHeight };
    const finish = () => {
      const panel = panelRef.current;
      if (panel !== null && panel.contains(panel.ownerDocument.activeElement)) {
        focusAfter.current = "expand";
      }
      engine.updateSettings({ expressionsCollapsed: true });
      setListState("collapsed");
    };
    const ms = readDuration(body);
    if (ms <= 0) {
      finish();
      return;
    }
    const timer = setTimeout(finish, ms);
    return () => clearTimeout(timer);
  }, [listState, engine, readDuration]);

  // Expanding: the overlay was committed with data-enter (the collapsed transform); a style flush
  // and its removal start the transform transition while the Expand list button keeps the column.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (listState !== "expanding" || body === null) return;
    void body.offsetHeight;
    body.removeAttribute("data-enter");
    const finish = () => {
      focusAfter.current = "collapse";
      engine.updateSettings({ expressionsCollapsed: false });
      setListState("expanded");
    };
    const ms = readDuration(body);
    if (ms <= 0) {
      finish();
      return;
    }
    const timer = setTimeout(finish, ms);
    return () => clearTimeout(timer);
  }, [listState, engine, readDuration]);

  useLayoutEffect(() => {
    if (focusAfter.current === "expand" && listState === "collapsed") {
      focusAfter.current = null;
      expandRef.current?.focus();
    } else if (focusAfter.current === "collapse" && listState === "expanded") {
      focusAfter.current = null;
      collapseRef.current?.focus();
    }
  }, [listState]);

  const size = sizeRef.current;
  return {
    listState,
    panelRef,
    bodyRef,
    expandRef,
    collapseRef,
    collapse: () => {
      if (listState === "expanded") setListState("collapsing");
    },
    expand: () => {
      if (listState === "collapsed") setListState("expanding");
    },
    // Over the graph, at the size of the last in-flow list body, until the flip.
    overlayStyle:
      listState === "expanding"
        ? ({
            position: "absolute",
            zIndex: 1,
            background: "var(--kc-list)",
            ...(size === null ? {} : { width: size.width, height: size.height }),
          } satisfies CSSProperties)
        : undefined,
  };
}

export function ExpressionPanel(props: ExpressionPanelProps): JSX.Element {
  const engine = useEngine();
  const { rows, canUndo, canRedo, settings } = useEngineSnapshot(engine);
  const focus = useContext(FocusContext);
  const announcer = useAnnouncer();
  const [editing, setEditing] = useState(false);
  const editListRef = useRef<HTMLButtonElement>(null);
  const presence = useRowPresence(rows);
  const list = useListLifecycle(engine, settings.expressionsCollapsed);
  const { items, exitDone } = presence;
  // While collapsed no row is mounted to report its exit, so a row that leaves then is done.
  useEffect(() => {
    if (list.listState !== "collapsed") return;
    for (const item of items) if (item.motion === "exit") exitDone(item.row.id);
  }, [list.listState, items, exitDone]);
  // A11Y-2: values 750 ms after the last edit and errors once, for user edits only.
  useEffect(() => {
    const announcements = createRowAnnouncements(engine, announcer);
    return () => announcements.destroy();
  }, [engine, announcer]);
  if (focus === null) throw new Error("ExpressionPanel must be used inside FocusContext");

  // Done leaves Edit list mode and returns focus to the Edit list toggle it came from.
  const finishEditing = () => {
    editListRef.current?.focus();
    setEditing(false);
  };

  // AN-5: only rows that are not exiting are numbered; an exiting row keeps the number of its
  // place for its hidden labels and shows none.
  let shown = 0;
  const numbered = items.map((item) => {
    const exiting = item.motion === "exit";
    if (!exiting) shown += 1;
    return { ...item, number: exiting ? shown + 1 : shown };
  });

  const { listState } = list;
  return (
    <section
      ref={list.panelRef}
      className="kc-list-panel"
      aria-label="Expression list"
      data-layout={props.layout}
      data-pointer={props.pointer}
      data-list-state={listState}
    >
      {(listState === "collapsed" || listState === "expanding") && (
        <ToolButton
          label="Expand list"
          icon={ChevronsRight}
          buttonRef={list.expandRef}
          onClick={list.expand}
        />
      )}
      {listState !== "collapsed" && (
        <div
          className="kc-list-body"
          ref={list.bodyRef}
          data-enter={listState === "expanding" ? "true" : undefined}
          style={list.overlayStyle}
        >
          <div className="kc-list-toolbar" role="toolbar" aria-label="List tools">
            <AddItemMenu layout={props.layout} />
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
            <ToolButton
              label="Collapse list"
              icon={ChevronsLeft}
              buttonRef={list.collapseRef}
              onClick={list.collapse}
            />
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
            {numbered.map(({ row, motion, number }) => (
              <ExpressionRow
                key={row.id}
                row={row}
                number={number}
                keypadOpen={props.keypadOpen}
                onTouchFocus={props.onTouchFocusRow}
                motion={motion}
                onExitDone={exitDone}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
