// The expression list panel: a region
// named "Expression list" whose list body holds the "List tools" toolbar (L-1, L-2: Add item, the
// stacked Keypad toggle, Undo, Redo, Edit list, Collapse list; in Edit list mode, KB-5 and EL-44's
// Delete All, Undo, Redo and Done) and the "Expressions" list, one numbered row per engine row. Undo and Redo
// stay in the Tab order at the ends of the stack, aria-disabled (KB-2, KB-13). While mounted it
// announces row values and errors through createRowAnnouncements (A11Y-2). Rows enter and exit
// through useRowPresence and only rows that are not exiting are numbered (AN-5). Collapse list and
// Expand list run AN-3's lifecycle in data-list-state and flip settings.expressionsCollapsed on the
// first frame, so the layout resizes the graph once and the panel slides over it (EL-49).

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { DoubleChevronGlyph, EditListGlyph, KeyboardGlyph, UndoGlyph } from "../../icons/list";
import { useAnnouncer } from "../a11y/announcer";
import { FocusContext } from "../focus/focus-controller";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { AddItemMenu } from "./AddItemMenu";
import { createRowAnnouncements } from "./announcements";
import { ExpressionRow } from "./ExpressionRow";
import { MotionContext } from "./motion";
import { clearAllRows, insertRowBelow, performRedo, performUndo } from "./row-actions";
import { useRowPresence } from "./row-presence";
import { TableItem } from "./TableItem";
import { ToastHost } from "./Toast";
import { Tooltip, useTooltip } from "./Tooltip";

/** L-3: the keys that move focus between rows and controls; editing keys in a field do not. */
const NAVIGATION_KEYS = new Set(["Tab", "ArrowUp", "ArrowDown"]);

/**
 * L-3: marks keyboard navigation on the panel, so only a row reached from the keyboard draws its
 * outline. A navigation key arms the mark and the focus move it causes sets it; a Tab into the list
 * arrives as its keyup. Typing, End or Backspace in a clicked row keeps the pointer look.
 */
function useInputMark() {
  const armed = useRef(false);
  return {
    onKeyDownCapture: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Shift") armed.current = NAVIGATION_KEYS.has(e.key);
    },
    onKeyUpCapture: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Tab") e.currentTarget.dataset.input = "keyboard";
    },
    onFocusCapture: (e: FocusEvent<HTMLElement>) => {
      if (armed.current) e.currentTarget.dataset.input = "keyboard";
    },
    onPointerDownCapture: (e: PointerEvent<HTMLElement>) => {
      armed.current = false;
      e.currentTarget.dataset.input = "pointer";
    },
  };
}

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
  tooltip: string; // PM-29: the reference's hover text
  icon: ReactNode;
  pressed?: boolean; // a toggle: aria-pressed
  disabled?: boolean; // aria-disabled; the button stays focusable (KB-13)
  tool?: string; // data-tool, for the stylesheet and the keypad's focus return
  onClick?(): void;
  buttonRef?: Ref<HTMLButtonElement>;
}

/** One toolbar button, named by its aria-label and drawn with one of our list glyphs. */
function ToolButton(props: ToolButtonProps): JSX.Element {
  const tip = useTooltip(props.disabled === true);
  return (
    <button
      type="button"
      className="kc-list-tool"
      ref={props.buttonRef}
      aria-label={props.label}
      aria-pressed={props.pressed}
      aria-disabled={props.disabled}
      data-tool={props.tool}
      // The reference's toolbar buttons never take focus on press, so a click keeps the row being
      // edited focused; Tab and Enter still reach and activate them.
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
      {...tip.handlers}
    >
      {props.icon}
      {tip.open && <Tooltip text={props.tooltip} />}
    </button>
  );
}

/**
 * AN-3's Collapse list and Expand list lifecycle, as the reference times it (EL-49): the setting
 * flips on the first frame, so the graph resizes once, at the start; the panel then slides over
 * the graph for the list body's own transition-duration (read in a layout effect once the state is
 * committed; 0 finishes at once). While collapsing, the slide is an absolute overlay at the size of
 * the last in-flow list body. A flip from elsewhere (the API, setBlank) sets collapsed or expanded
 * at once. Focus moves from Collapse list to Expand list after a collapse, and back after an
 * expand, as the reference's does.
 */
function useListLifecycle(engine: CalculatorEngine, collapsedSetting: boolean) {
  const readDuration = useContext(MotionContext);
  const [listState, setListState] = useState<ListState>(
    collapsedSetting ? "collapsed" : "expanded"
  );
  const [seenSetting, setSeenSetting] = useState(collapsedSetting);
  /** The setting value the panel's own transition flipped to, so it does not cut the slide short. */
  const ownFlip = useRef<boolean | null>(null);
  if (collapsedSetting !== seenSetting) {
    setSeenSetting(collapsedSetting);
    if (ownFlip.current === collapsedSetting) ownFlip.current = null;
    else setListState(collapsedSetting ? "collapsed" : "expanded");
  }
  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const sizeRef = useRef<BodySize | null>(null);
  /** The button that takes focus once the transition that set this has committed. */
  const focusAfter = useRef<"expand" | "collapse" | null>(null);

  // Collapsing or expanding: the slide runs for its own duration, then the state settles.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if ((listState !== "collapsing" && listState !== "expanding") || body === null) return;
    if (listState === "expanding") {
      void body.offsetHeight; // the committed data-enter transform, so removing it transitions
      body.removeAttribute("data-enter");
    }
    const finish = () => setListState(listState === "collapsing" ? "collapsed" : "expanded");
    const ms = readDuration(body);
    if (ms <= 0) {
      finish();
      return;
    }
    const timer = setTimeout(finish, ms);
    return () => clearTimeout(timer);
  }, [listState, readDuration]);

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
      if (listState !== "expanded") return;
      const body = bodyRef.current;
      sizeRef.current =
        body === null ? null : { width: body.offsetWidth, height: body.offsetHeight };
      focusAfter.current = "expand"; // the Collapse list button is going away (EL-49)
      ownFlip.current = true;
      engine.updateSettings({ expressionsCollapsed: true });
      setListState("collapsing");
    },
    expand: () => {
      if (listState !== "collapsed") return;
      focusAfter.current = "collapse";
      ownFlip.current = false;
      engine.updateSettings({ expressionsCollapsed: false });
      setListState("expanding");
    },
    // Over the graph, at the size of the last in-flow list body, while it slides away.
    overlayStyle:
      listState === "collapsing"
        ? ({
            position: "absolute",
            left: 0,
            zIndex: 1,
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
  const [scrolled, setScrolled] = useState(false); // VIS-13: the toolbar's shadow
  const editListRef = useRef<HTMLButtonElement>(null);
  const presence = useRowPresence(rows);
  const list = useListLifecycle(engine, settings.expressionsCollapsed);
  const inputMark = useInputMark();
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

  // Done leaves Edit list mode and returns focus to the Edit list toggle it came from, once the
  // normal toolbar is back.
  const refocusEditList = useRef(false);
  const finishEditing = () => {
    refocusEditList.current = true;
    setEditing(false);
  };
  useLayoutEffect(() => {
    if (editing || !refocusEditList.current) return;
    refocusEditList.current = false;
    editListRef.current?.focus();
  }, [editing]);

  // AN-5: only rows that are not exiting are numbered; an exiting row keeps the number of its
  // place for its hidden labels and shows none.
  let shown = 0;
  const numbered = items.map((item) => {
    const exiting = item.motion === "exit";
    if (!exiting) shown += 1;
    return { ...item, number: exiting ? shown + 1 : shown };
  });

  const { listState } = list;
  const stacked = props.layout === "stacked";
  // The next row's number on the ghost row below the last item; pressing it adds that row.
  const appendRow = (event: MouseEvent) => {
    event.preventDefault();
    insertRowBelow(engine, focus, announcer, null, "focus");
  };
  return (
    <section
      ref={list.panelRef}
      className="kc-list-panel"
      aria-label="Expression list"
      data-layout={props.layout}
      data-pointer={props.pointer}
      data-list-state={listState}
      data-keypad={String(props.keypadOpen)}
      data-scrolled={scrolled ? "true" : undefined}
      // L-3, TH-14: a row focused from the keyboard shows its outline and a clicked one keeps
      // the reference look.
      {...inputMark}
    >
      {/* Mounted on the collapse's first frame, so its delayed fade-in starts with the slide. */}
      {(listState === "collapsed" || listState === "collapsing") && (
        <ToolButton
          label="Expand list"
          tooltip="Show List"
          icon={<DoubleChevronGlyph direction={stacked ? "up" : "right"} />}
          buttonRef={list.expandRef}
          onClick={list.expand}
        />
      )}
      {listState !== "collapsed" && (
        <div
          className="kc-list-slide"
          ref={list.bodyRef}
          data-enter={listState === "expanding" ? "true" : undefined}
          style={list.overlayStyle}
        >
          {/* EL-44: Edit list mode swaps the toolbar's ends for Delete All and Done. */}
          <div
            className="kc-list-toolbar"
            role="toolbar"
            aria-label="List tools"
            data-editing={editing ? "true" : undefined}
          >
            <div className="kc-toolbar-zone">
              {editing ? (
                <button
                  type="button"
                  className="kc-edit-action"
                  data-tone="danger"
                  onClick={() => clearAllRows(engine, focus, announcer)}
                >
                  Delete All
                </button>
              ) : (
                <>
                  <AddItemMenu layout={props.layout} />
                  {stacked && props.pointer === "fine" && (
                    <ToolButton
                      label="Keypad"
                      tooltip="Keypad"
                      icon={<KeyboardGlyph width={22} />}
                      tool="keypad"
                      pressed={props.keypadOpen}
                      onClick={props.onToggleKeypad}
                    />
                  )}
                </>
              )}
            </div>
            {/* performUndo and performRedo do nothing at the ends of the stack, so an
              aria-disabled button ignores activation. */}
            <div className="kc-toolbar-zone" data-zone="centre">
              <ToolButton
                label="Undo"
                tooltip="Undo (CTRL+Z)"
                icon={<UndoGlyph />}
                tool="history"
                disabled={!canUndo}
                onClick={() => performUndo(engine, announcer)}
              />
              <ToolButton
                label="Redo"
                tooltip="Redo (CTRL+Y)"
                icon={<UndoGlyph redo />}
                tool="history"
                disabled={!canRedo}
                onClick={() => performRedo(engine, announcer)}
              />
            </div>
            <div className="kc-toolbar-zone">
              {editing ? (
                <button
                  type="button"
                  className="kc-edit-action"
                  data-tone="accent"
                  onClick={finishEditing}
                >
                  Done
                </button>
              ) : (
                <>
                  <ToolButton
                    label="Edit list"
                    tooltip="Edit List"
                    icon={<EditListGlyph />}
                    tool="edit"
                    buttonRef={editListRef}
                    onClick={() => setEditing(true)}
                  />
                  <ToolButton
                    label="Collapse list"
                    tooltip="Hide Expression List"
                    icon={<DoubleChevronGlyph direction={stacked ? "down" : "left"} />}
                    tool="collapse"
                    buttonRef={list.collapseRef}
                    onClick={list.collapse}
                  />
                </>
              )}
            </div>
          </div>
          <div
            className="kc-list-body"
            onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
          >
            <ToastHost>
              {/* role="list" keeps list semantics in WebKit, which drops them under list-style: none */}
              <ol className="kc-list" role="list" aria-label="Expressions" tabIndex={-1}>
                {numbered.map(({ row, motion, number }) =>
                  row.type === "table" ? (
                    <TableItem
                      key={row.id}
                      row={row}
                      number={number}
                      keypadOpen={props.keypadOpen}
                      onTouchFocus={props.onTouchFocusRow}
                      motion={motion}
                      onExitDone={exitDone}
                    />
                  ) : (
                    <ExpressionRow
                      key={row.id}
                      row={row}
                      number={number}
                      editing={editing}
                      keypadOpen={props.keypadOpen}
                      onTouchFocus={props.onTouchFocusRow}
                      motion={motion}
                      onExitDone={exitDone}
                    />
                  )
                )}
              </ol>
              {/* A pointer shortcut only: keyboard users add rows with Enter or Add item. */}
              <div className="kc-ghost-row" aria-hidden="true" onMouseDown={appendRow}>
                <span className="kc-row-number">{shown + 1}</span>
              </div>
            </ToastHost>
          </div>
        </div>
      )}
    </section>
  );
}
