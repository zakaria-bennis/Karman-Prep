// One expression row: the gutter number
// and the focused or active row marks (L-3), the gutter tab that hides or shows the row's graph
// (R-1), the MathField textbox named "Expression n" through a hidden label the row keeps current
// (A11Y-3) and described by the row's T-5
// speech text (A11Y-4), its value in a box (R-5, RowValue), its error as a warning marker that
// replaces the tab, with the message in its tooltip and aria-invalid on the textbox (R-2,
// ErrorMarker) and the complex-mode hint (FN-16, OI-4), and the Delete control. The
// field's inputmode follows the on-screen keypad (T-11). Enter, the arrow edges, Backspace or
// Delete in an empty row and the Delete control go through row-actions (R-3, R-9); a typed edit
// past the T-13 limit is refused, restored and announced. AN-5: the row carries its presence
// motion; an exiting row leaves the focus controller, is aria-hidden and inert with no number, and
// reports onExitDone once its own exit transition-duration has passed.

import { X } from "lucide-react";
import {
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type MouseEvent,
  type PointerEvent,
  type TransitionEvent,
} from "react";
import { COMPLEX_HINT } from "@/lib/calculator/core/analysis";
import type { RowView } from "@/lib/calculator/core/api/engine";
import { MAX_ROW_CHARACTERS } from "@/lib/calculator/core/latex/limits";
import { resolveRowColor } from "@/lib/calculator/theme/roles";
import { LineStyleGlyph, PointStyleGlyph } from "../../icons";
import type { MathField } from "../../math-field/MathField";
import { latexToSpeech } from "../../math-field/speech";
import { useAnnouncer } from "../a11y/announcer";
import { FocusContext, type FocusController } from "../focus/focus-controller";
import { useSkin } from "../hooks/skin";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { MathFieldFactoryContext } from "./math-field-factory";
import { ErrorMarker } from "./ErrorMarker";
import { EDITOR_MESSAGES } from "./messages";
import { useMenuTrigger } from "./menu-trigger";
import { MotionContext } from "./motion";
import {
  deleteFromEmptyRow,
  convertToTable,
  deleteRowByControl,
  insertRowBelow,
  isKeypadBatch,
  leaveRow,
} from "./row-actions";
import { fieldTextbox, rowDomIds, rowTab } from "./row-model";
import { RegressionPanel, STATISTICS_HINT } from "./RegressionPanel";
import { offersCreateTable, RowMenu } from "./RowMenu";
import { RowValue } from "./RowValue";
import type { RowMotion } from "./row-presence";

export interface ExpressionRowProps {
  row: RowView;
  number: number; // 1-based; an exiting row shows none
  keypadOpen: boolean;
  onTouchFocus(rowId: string): void;
  motion: RowMotion; // AN-5, from useRowPresence
  onExitDone(rowId: string): void; // after the exit transition; the panel then drops the row
}

/** Writes the snapshot's latex into the field with `syncing` set, so the row's onEdit ignores it. */
function writeLatex(field: MathField, latex: string, syncing: { current: boolean }): void {
  syncing.current = true;
  try {
    field.latex(latex);
  } finally {
    syncing.current = false;
  }
}

/** R-1: whether a press on `target` lands on the row body rather than a control or the field. */
function isRowBody(target: EventTarget): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest("button, a, input, select, textarea, .mq-editable-field") === null;
}

function useFocusController(): FocusController {
  const focus = useContext(FocusContext);
  if (focus === null) throw new Error("ExpressionRow must be used inside FocusContext");
  return focus;
}

export function ExpressionRow(props: ExpressionRowProps): JSX.Element {
  const { row, number, keypadOpen, motion } = props;
  const exiting = motion === "exit";
  const engine = useEngine();
  const { focusedRowId, activeRowId } = useEngineSnapshot(engine);
  const focus = useFocusController();
  const announcer = useAnnouncer();
  const createField = useContext(MathFieldFactoryContext);
  const readDuration = useContext(MotionContext);
  const color = resolveRowColor(row.color, useSkin());
  const ids = useMemo(() => rowDomIds(row.id), [row.id]);
  const speech = useMemo(() => latexToSpeech(row.latex), [row.latex]);
  const error = row.error;
  const tab = error === null ? rowTab(row) : null; // R-2: the warning marker takes the tab's place
  const valueText = error === null ? row.valueText : null; // R-5: an error row shows no value
  // A11Y-3: the textbox's description lists the parts that render, in this order.
  const describedBy = [
    ids.speech,
    valueText !== null ? ids.value : null,
    error !== null ? ids.error : null,
    row.complexHint ? ids.hint : null,
  ]
    .filter((id) => id !== null)
    .join(" ");

  const itemRef = useRef<HTMLLIElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  // D-13: the row menu, from a long-press on the gutter tab or a right-click or Shift+F10 anywhere
  // on the row (f(x)=E rows have no tab), only while the row has something to offer.
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useMenuTrigger(() => {
    const offered = offersCreateTable(engine, row.id);
    if (offered) setMenuOpen(true);
    return offered;
  });
  const hostRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<MathField | null>(null);
  /** True while the row writes the snapshot's latex into the field, so onEdit ignores it. */
  const syncingRef = useRef(false);
  /** Whether the last pointerdown on the field was a touch; a focus consumes it (K-2). */
  const touchRef = useRef(false);
  const latest = useRef({
    latex: row.latex,
    number,
    onTouchFocus: props.onTouchFocus,
    onExitDone: props.onExitDone,
  });
  useLayoutEffect(() => {
    latest.current = {
      latex: row.latex,
      number,
      onTouchFocus: props.onTouchFocus,
      onExitDone: props.onExitDone,
    };
  });

  // The field is created once and filled with the row's latex; the next effect registers it.
  useLayoutEffect(() => {
    const rowId = row.id;
    const field = createField(hostRef.current!, {
      ariaLabel: `Expression ${latest.current.number}`,
      maxLength: MAX_ROW_CHARACTERS,
      onEdit(latex) {
        const current = fieldRef.current;
        // Snapshot writes are not edits; editThroughKeypad makes a keypad batch's one editRow.
        if (syncingRef.current || current === null || isKeypadBatch(current)) return;
        if (latex === "table") {
          convertToTable(engine, focus, rowId); // D-5: typing table in an empty row
          return;
        }
        if (engine.editRow(rowId, latex, "typing") === "char-limit") {
          writeLatex(current, latest.current.latex, syncingRef); // T-13: the row stays unchanged
          announcer.announce(EDITOR_MESSAGES.charLimit);
        }
      },
      onEnter: () => insertRowBelow(engine, focus, announcer, rowId, "focus"),
      onArrowOut: (direction) => leaveRow(engine, focus, rowId, direction),
      onDeleteOutOf(direction) {
        if (fieldRef.current?.latex() === "") deleteFromEmptyRow(engine, focus, rowId, direction);
      },
      onFocus() {
        const touch = touchRef.current;
        touchRef.current = false;
        engine.setFocusedRow(rowId);
        engine.activateExpression(rowId);
        if (touch) latest.current.onTouchFocus(rowId);
      },
      onBlur() {
        touchRef.current = false;
        engine.setFocusedRow(null);
        engine.endEditGroup(); // KB-2: a focus change ends the typing group
      },
      onRefused(reason) {
        if (reason === "char-limit") announcer.announce(EDITOR_MESSAGES.charLimit); // T-13
      },
    });
    fieldRef.current = field;
    writeLatex(field, latest.current.latex, syncingRef);
    return () => {
      fieldRef.current = null;
      field.destroy();
    };
  }, [announcer, createField, engine, focus, row.id]);

  // Focus requests reach the field while the row is in the list; an exiting row has left it
  // (AN-5). The field's own deps rerun this for a new field.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field === null || exiting) return;
    return focus.registerField(row.id, field);
  }, [exiting, announcer, createField, engine, focus, row.id]);

  // AN-5: the entering row's collapsed height is computed before it turns idle, so it grows.
  useLayoutEffect(() => {
    if (motion === "enter") void itemRef.current?.offsetHeight;
  }, [motion]);

  // AN-5: an exiting row takes no input and leaves after its own exit transition-duration, read
  // once data-motion="exit" is committed; 0 (reduced motion, jsdom) leaves here, before paint.
  useLayoutEffect(() => {
    const li = itemRef.current;
    if (li === null || !exiting) return;
    li.setAttribute("inert", "");
    const rowId = row.id;
    const done = () => latest.current.onExitDone(rowId);
    const ms = readDuration(li);
    if (ms <= 0) {
      done();
      return () => li.removeAttribute("inert");
    }
    const timer = setTimeout(done, ms);
    return () => {
      clearTimeout(timer);
      li.removeAttribute("inert");
    };
  }, [exiting, readDuration, row.id]);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field !== null && field.latex() !== row.latex) writeLatex(field, row.latex, syncingRef);
  }, [row.latex]);

  // T-11: no phone keyboard over the open keypad. The field's own deps rerun this for a new field.
  useLayoutEffect(() => {
    fieldRef.current?.setInputMode(keypadOpen ? "none" : "text");
  }, [keypadOpen, announcer, createField, engine, focus, row.id]);

  // After every render, so the name, description and error state follow renumbering, edits and
  // results (A11Y-3, A11Y-4, R-2). Rows without an error carry no aria-invalid attribute.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field === null) return;
    const textbox = fieldTextbox(field);
    textbox.setAttribute("aria-labelledby", ids.label);
    textbox.setAttribute("aria-describedby", describedBy);
    if (error !== null) textbox.setAttribute("aria-invalid", "true");
    else textbox.removeAttribute("aria-invalid");
  });

  const onFieldPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    touchRef.current = event.pointerType === "touch";
  };

  // L-14, L-2: a new row is focused while it still grows in (AN-5), so the focus scroll saw its
  // collapsed height; once it has grown, the focused or active row is revealed again.
  const onRowTransitionEnd = (event: TransitionEvent<HTMLLIElement>) => {
    if (event.target !== event.currentTarget || exiting) return;
    const { focusedRowId: focused, activeRowId: active } = engine.getSnapshot();
    if ((focused ?? active) === row.id) itemRef.current?.scrollIntoView({ block: "nearest" });
  };

  // R-1 (lead decision, Bluebook parity): a press anywhere on the row body that is not a row
  // control or the MathQuill field itself focuses the row's field with the caret at the end. The
  // mousedown is cancelled so focus does not leave for the frame first.
  const onBodyPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!exiting && isRowBody(event.target)) touchRef.current = event.pointerType === "touch";
  };
  const onBodyMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!exiting && isRowBody(event.target)) event.preventDefault();
  };
  const onBodyClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!exiting && isRowBody(event.target)) focus.focusRow(row.id, "end");
  };

  // FN-16 (OI-4): sets the S-5 complex checkbox and returns to the row; the hint then unmounts.
  const turnOnComplexMode = () => {
    engine.updateSettings({ complex: true });
    focus.focusRow(row.id, "end");
  };

  return (
    <li
      ref={itemRef}
      className="kc-row"
      data-row-id={row.id}
      data-focused={focusedRowId === row.id ? "true" : undefined}
      data-active={activeRowId === row.id ? "true" : undefined}
      data-motion={motion}
      aria-hidden={exiting ? "true" : undefined}
      onTransitionEnd={onRowTransitionEnd}
    >
      <div
        className="kc-row-inner"
        onPointerDown={onBodyPointerDown}
        onMouseDown={onBodyMouseDown}
        onClick={onBodyClick}
        onContextMenu={exiting ? undefined : menu.trigger.onContextMenu}
        onKeyDown={exiting ? undefined : menu.trigger.onKeyDown}
      >
        <div className="kc-row-gutter">
          <span className="kc-row-number">{exiting ? null : number}</span>
          {tab !== null && (
            <button
              type="button"
              className="kc-row-tab"
              aria-label={`${row.hidden ? "Show" : "Hide"} expression ${number}`}
              aria-pressed={!row.hidden}
              data-style={tab === "point" ? "filled" : "solid"}
              style={{ "--kc-row-color": color.hex } as CSSProperties}
              ref={tabRef}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => {
                if (!menu.consumeClick()) engine.setRowHidden(row.id, !row.hidden);
              }}
              onPointerDown={menu.trigger.onPointerDown}
              onPointerUp={menu.trigger.onPointerUp}
              onPointerLeave={menu.trigger.onPointerLeave}
            >
              {tab === "point" ? (
                <PointStyleGlyph style="filled" />
              ) : (
                <LineStyleGlyph style="solid" />
              )}
            </button>
          )}
          {menuOpen && (
            <RowMenu
              rowId={row.id}
              number={number}
              trigger={tabRef}
              onClose={(refocus) => {
                setMenuOpen(false);
                if (!refocus) return;
                if (tabRef.current !== null) tabRef.current.focus();
                else focus.focusRow(row.id, "end");
              }}
            />
          )}
          {error !== null && <ErrorMarker id={ids.error} message={error.message} variant="row" />}
        </div>
        <div className="kc-row-main">
          <div className="kc-row-field" ref={hostRef} onPointerDown={onFieldPointerDown} />
          <span id={ids.label} hidden>
            {row.regression?.result?.ok === true
              ? `Expression ${number}. ${STATISTICS_HINT}` // D-37
              : `Expression ${number}`}
          </span>
          <span id={ids.speech} hidden>
            {speech}
          </span>
          {valueText !== null && (
            <RowValue id={ids.value} value={row.value} valueText={valueText} />
          )}
          {row.complexHint && (
            <div className="kc-row-hint">
              <span id={ids.hint}>{COMPLEX_HINT.text}</span>
              <button type="button" className="kc-row-hint-action" onClick={turnOnComplexMode}>
                {COMPLEX_HINT.action}
              </button>
            </div>
          )}
          {error === null && <RegressionPanel row={row} />}
        </div>
        <button
          type="button"
          className="kc-row-delete"
          aria-label={`Delete expression ${number}`}
          onClick={() => deleteRowByControl(engine, focus, row.id)}
        >
          <X aria-hidden="true" focusable="false" size={16} />
        </button>
      </div>
    </li>
  );
}
