// One expression row: the gutter number
// and the focused or active row marks (L-3), the gutter tab that hides or shows the row's graph
// (R-1), the MathField textbox named "Expression n" through a hidden label the row keeps current
// (A11Y-3) and described by the row's T-5
// speech text (A11Y-4), its value in a box (R-5, RowValue), its error as a warning marker that
// replaces the tab, with the message in its tooltip and aria-invalid on the textbox (R-2,
// ErrorMarker) and the complex-mode hint (FN-16, OI-4), and the Delete control. The
// field's inputmode follows the on-screen keypad (T-11). Enter, the arrow edges, Backspace or
// Delete in an empty row and the Delete control go through row-actions (R-3, R-9); a typed edit
// past the T-13 limit is refused, restored and announced. Under the math it shows the add-slider
// line of a row with undefined names (R-6) and a point row's Label line (EL-15); in Edit list mode
// its actions replace the delete cross (EL-45). AN-5: the row carries its presence
// motion; an exiting row leaves the focus controller, is aria-hidden and inert with no number, and
// reports onExitDone once its own exit transition-duration has passed.

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
import { COMPLEX_HINT, displayName } from "@/lib/calculator/core/analysis";
import { pauseSlider } from "@/lib/calculator/core/api/sliders";
import { spokenName, withSliderValue } from "@/lib/calculator/sliders/slider";
import type { RowView } from "@/lib/calculator/core/api/engine";
import { MAX_ROW_CHARACTERS } from "@/lib/calculator/core/latex/limits";
import { rowIconHex } from "@/lib/calculator/theme/roles";
import { ColourKindGlyph, RemoveGlyph, type KindGlyph } from "../../icons/list";
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
import { convertsInPlace, createTableBelow, offersCreateTable, RowMenu } from "./RowMenu";
import { EditRowActions } from "./EditRowActions";
import { ToastContext } from "./Toast";
import { RowValue } from "./RowValue";
import { AddSliderLine, addSliders, PointLabelLine } from "./RowUnderMath";
import { SliderGutter } from "./SliderGutter";
import { SliderLine, type SliderLineHandle } from "./SliderLine";
import { tabPastRow } from "./slider-focus";
import { StylePopover } from "../style-popover/StylePopover";
import type { RowMotion } from "./row-presence";

export interface ExpressionRowProps {
  row: RowView;
  number: number; // 1-based; an exiting row shows none
  keypadOpen: boolean;
  editing?: boolean; // EL-45: Edit list mode's row actions in place of the delete cross
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
  return (
    target.closest("button, a, input, select, textarea, .mq-editable-field, .kc-slider-line") ===
    null
  );
}

/** The white glyph in a row's colour icon: a wave, a dot, or a split disc for a region. */
function kindGlyph(row: RowView, tab: "line" | "point"): KindGlyph {
  if (tab === "point") return "point";
  if (row.kind !== "region") return "wave";
  return /\\(?:le|ge|leq|geq)\b|≤|≥/.test(row.latex) ? "region" : "region-strict";
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
  const toaster = useContext(ToastContext);
  const editing = props.editing === true && !exiting;
  const iconHex = rowIconHex(row.color, useSkin());
  const ids = useMemo(() => rowDomIds(row.id), [row.id]);
  const speech = useMemo(() => latexToSpeech(row.latex), [row.latex]);
  const error = row.error;
  const slider = row.slider ?? null; // SLIDERS-12: Play button and slider line in place of the tab
  const sliderName = slider === null ? "" : spokenName(slider.name); // SLIDERS-25: "alpha", "a_1"
  const tab = error === null && slider === null ? rowTab(row) : null; // R-2: the marker replaces it
  // SLIDERS-22: a slider row shows its snapped value, `a=10` for a stored `a=15` with max 10, once
  // written from outside (load, API, limits, drag, playback); a typed value shows (and is used) as
  // typed, so `shown` is the typed latex then.
  const shown =
    slider !== null && slider.error === null ? withSliderValue(row.latex, slider.value) : row.latex;
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
  const playRef = useRef<HTMLButtonElement>(null);
  const sliderLine = useRef<SliderLineHandle | null>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  // D-13: the row menu, from a right-click or Shift+F10 anywhere on the row (f(x)=E rows have no
  // tab), only while the row has something to offer.
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useMenuTrigger(() => {
    const offered = offersCreateTable(engine, row.id);
    if (offered) setMenuOpen(true);
    return offered;
  });
  // STYLES-20: the style popover, from a long-press on the tab, Shift+Enter on it, or a click in
  // Edit list mode; a click while it is open closes it without hiding the row (STYLES-21).
  const [styleOpen, setStyleOpen] = useState(false);
  const styleMenu = useMenuTrigger(() => setStyleOpen(true));
  const hostRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<MathField | null>(null);
  const [fieldFocused, setFieldFocused] = useState(false);
  /** True while the row writes the snapshot's latex into the field, so onEdit ignores it. */
  const syncingRef = useRef(false);
  /** Whether the last pointerdown on the field was a touch; a focus consumes it (K-2). */
  const touchRef = useRef(false);
  const latest = useRef({
    latex: row.latex,
    shown,
    number,
    onTouchFocus: props.onTouchFocus,
    onExitDone: props.onExitDone,
  });
  useLayoutEffect(() => {
    latest.current = {
      latex: row.latex,
      shown,
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
        // SLIDERS-35: typing into a playing slider's row pauses it first.
        const playing = engine.getSnapshot().rows.find((r) => r.id === rowId)?.slider;
        if (playing?.settings.isPlaying) pauseSlider(engine, rowId);
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
        setFieldFocused(true);
        const touch = touchRef.current;
        touchRef.current = false;
        engine.setFocusedRow(rowId);
        engine.activateExpression(rowId);
        if (touch) latest.current.onTouchFocus(rowId);
      },
      onBlur() {
        setFieldFocused(false);
        touchRef.current = false;
        engine.setFocusedRow(null);
        engine.endEditGroup(); // KB-2: a focus change ends the typing group
      },
      onRefused(reason) {
        if (reason === "char-limit") announcer.announce(EDITOR_MESSAGES.charLimit); // T-13
      },
    });
    fieldRef.current = field;
    writeLatex(field, latest.current.shown, syncingRef);
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

  // SLIDERS-22: a new stored latex goes into the field; a slider row out of focus shows `shown`,
  // and in focus keeps what it shows until the stored latex changes (typing then edits that).
  const lastLatex = useRef(row.latex);
  const sliderFocus = slider === null ? null : fieldFocused;
  useLayoutEffect(() => {
    const field = fieldRef.current;
    const changed = lastLatex.current !== row.latex;
    lastLatex.current = row.latex;
    if (field === null) return;
    const target = sliderFocus === true ? row.latex : shown;
    if ((changed || sliderFocus === false) && field.latex() !== target)
      writeLatex(field, target, syncingRef);
  }, [row.latex, shown, sliderFocus]);

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
              // STYLES-19: "{action}: Expression n", as the reference names it.
              aria-label={
                styleOpen
                  ? `Hide Options: Expression ${number}`
                  : editing
                    ? `Show Options: Expression ${number}`
                    : `${row.hidden ? "Show" : "Hide"}: Expression ${number}`
              }
              aria-pressed={!row.hidden}
              data-kind={kindGlyph(row, tab)}
              style={{ "--kc-row-color": iconHex } as CSSProperties}
              ref={tabRef}
              aria-haspopup="dialog"
              aria-expanded={styleOpen}
              onClick={() => {
                if (styleMenu.consumeClick()) return;
                if (styleOpen) setStyleOpen(false);
                else if (editing) setStyleOpen(true);
                else engine.setRowHidden(row.id, !row.hidden);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !e.shiftKey) return;
                e.preventDefault();
                setStyleOpen(true);
              }}
              onPointerDown={styleMenu.trigger.onPointerDown}
              // The reference leaves focus where it was when the circle is clicked.
              onMouseDown={(e) => e.preventDefault()}
              onPointerUp={styleMenu.trigger.onPointerUp}
              onPointerLeave={styleMenu.trigger.onPointerLeave}
            >
              {!row.hidden && <ColourKindGlyph kind={editing ? null : kindGlyph(row, tab)} />}
            </button>
          )}
          {slider !== null && error === null && (
            <SliderGutter
              rowId={row.id}
              name={sliderName}
              slider={slider}
              playRef={playRef}
              onTabOut={(direction) => {
                if (direction === "back") sliderLine.current?.focusThumb();
                else tabPastRow(engine, focus, row.id, itemRef.current);
              }}
            />
          )}
          {styleOpen && tab !== null && (
            <StylePopover
              row={row}
              kind={tab === "point" ? "point" : row.kind === "region" ? "region" : "line"}
              anchor={tabRef}
              onClose={(refocus) => {
                setStyleOpen(false);
                if (refocus) tabRef.current?.focus();
              }}
            />
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
          <div
            className="kc-row-field"
            ref={hostRef}
            onPointerDown={onFieldPointerDown}
            onKeyDownCapture={(e) => {
              // SLIDERS-25: a slider row's math tabs to its delete button, the editor held open.
              if (e.key !== "Tab" || e.shiftKey || sliderLine.current === null || editing) return;
              const remove = itemRef.current?.querySelector<HTMLElement>(".kc-row-delete");
              if (remove == null) return;
              e.preventDefault();
              e.stopPropagation();
              sliderLine.current.hold();
              remove.focus();
            }}
          />
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
          {slider !== null && (
            <SliderLine
              engine={engine}
              rowId={row.id}
              name={sliderName}
              glyph={displayName(slider.name)}
              slider={slider}
              rowFocused={focusedRowId === row.id}
              handle={sliderLine}
              playRef={playRef}
              onFocusRow={() => focus.focusRow(row.id, "end")}
              onFocusDelete={() =>
                itemRef.current?.querySelector<HTMLElement>(".kc-row-delete")?.focus()
              }
              onLeave={(direction) => leaveRow(engine, focus, row.id, direction)}
              onEnter={() => insertRowBelow(engine, focus, announcer, row.id, "focus")}
            />
          )}
          {(error?.code === "too-many-variables" || slider !== null) && row.chips.length > 0 && (
            <AddSliderLine
              names={row.chips}
              onAdd={(names, keyboard) => {
                addSliders(engine, announcer, row.id, names);
                // SLIDERS-8: a keyboard press returns to the row's math; a click leaves focus.
                if (keyboard) focus.focusRow(row.id, "end");
              }}
            />
          )}
          {tab === "point" && <PointLabelLine rowNumber={number} />}
          {error === null && <RegressionPanel row={row} />}
        </div>
        {editing ? (
          <EditRowActions
            engine={engine}
            focus={focus}
            announcer={announcer}
            rowId={row.id}
            number={number}
            canTabulate={offersCreateTable(engine, row.id)}
            convertsInPlace={convertsInPlace(engine, row.id)}
            onCreateTable={() => createTableBelow(engine, focus, announcer, toaster, row.id)}
          />
        ) : (
          <button
            type="button"
            className="kc-row-delete"
            aria-label={`Delete expression ${number}`}
            onKeyDown={(e) => {
              // SLIDERS-25: in a slider row, Tab goes on into the limits and Shift+Tab to the math.
              if (e.key !== "Tab" || sliderLine.current === null) return;
              e.preventDefault();
              if (e.shiftKey) focus.focusRow(row.id, "end");
              else sliderLine.current.focusField("first");
            }}
            onClick={(e) => {
              // A keyboard press (detail 0) moves on to the next row (R-3); a click leaves no row
              // selected, as the reference does, with focus kept on the list.
              if (e.detail === 0) {
                deleteRowByControl(engine, focus, row.id);
                return;
              }
              const list = itemRef.current?.closest<HTMLElement>(".kc-list");
              engine.deleteRow(row.id);
              list?.focus({ preventScroll: true });
            }}
          >
            <RemoveGlyph />
          </button>
        )}
      </div>
    </li>
  );
}
