// One expression row (01-interfaces-integration.md section 11 and 09's Row DOM): the gutter number
// and the focused or active row marks (L-3), the gutter tab that hides or shows the row's graph
// (R-1), the MathField textbox named "Expression n" through a hidden label the row keeps current
// (A11Y-3, 09 Decisions "Textbox naming survives renumbering") and described by the row's T-5
// speech text (A11Y-4), the TH-11 colour note, and the Delete control. The field's inputmode
// follows the on-screen keypad (T-11).

import { X } from "lucide-react";
import {
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type JSX,
  type PointerEvent,
} from "react";
import type { RowView } from "@/lib/calculator-v2/core/api/engine";
import { MAX_ROW_CHARACTERS } from "@/lib/calculator-v2/core/latex/limits";
import { EXPLICIT_COLOUR_NOTE, resolveRowColor } from "@/lib/calculator-v2/theme/roles";
import { LineStyleGlyph, PointStyleGlyph } from "../../icons";
import type { MathField } from "../../math-field/MathField";
import { latexToSpeech } from "../../math-field/speech";
import { FocusContext, type FocusController } from "../focus/focus-controller";
import { useSkin } from "../hooks/skin";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { MathFieldFactoryContext } from "./math-field-factory";
import { fieldTextbox, rowDomIds, rowTab } from "./row-model";

export interface ExpressionRowProps {
  row: RowView;
  number: number; // 1-based
  keypadOpen: boolean;
  onTouchFocus(rowId: string): void;
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

function useFocusController(): FocusController {
  const focus = useContext(FocusContext);
  if (focus === null) throw new Error("ExpressionRow must be used inside FocusContext");
  return focus;
}

export function ExpressionRow(props: ExpressionRowProps): JSX.Element {
  const { row, number, keypadOpen } = props;
  const engine = useEngine();
  const { focusedRowId, activeRowId } = useEngineSnapshot(engine);
  const focus = useFocusController();
  const createField = useContext(MathFieldFactoryContext);
  const color = resolveRowColor(row.color, useSkin());
  const ids = useMemo(() => rowDomIds(row.id), [row.id]);
  const speech = useMemo(() => latexToSpeech(row.latex), [row.latex]);
  const tab = rowTab(row);

  const hostRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<MathField | null>(null);
  /** True while the row writes the snapshot's latex into the field, so onEdit ignores it. */
  const syncingRef = useRef(false);
  /** Whether the last pointerdown on the field was a touch; a focus consumes it (K-2). */
  const touchRef = useRef(false);
  const latest = useRef({ latex: row.latex, number, onTouchFocus: props.onTouchFocus });
  useLayoutEffect(() => {
    latest.current = { latex: row.latex, number, onTouchFocus: props.onTouchFocus };
  });

  // The field is created once, filled with the row's latex, then registered for focus requests.
  useLayoutEffect(() => {
    const rowId = row.id;
    const field = createField(hostRef.current!, {
      ariaLabel: `Expression ${latest.current.number}`,
      maxLength: MAX_ROW_CHARACTERS,
      onEdit(latex) {
        if (!syncingRef.current) engine.editRow(rowId, latex, "typing");
      },
      onEnter: () => undefined,
      onArrowOut: () => undefined,
      onDeleteOutOf: () => undefined,
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
      onRefused: () => undefined,
    });
    fieldRef.current = field;
    writeLatex(field, latest.current.latex, syncingRef);
    const unregister = focus.registerField(rowId, field);
    return () => {
      unregister();
      fieldRef.current = null;
      field.destroy();
    };
  }, [createField, engine, focus, row.id]);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field !== null && field.latex() !== row.latex) writeLatex(field, row.latex, syncingRef);
  }, [row.latex]);

  // T-11: no phone keyboard over the open keypad. The field's own deps rerun this for a new field.
  useLayoutEffect(() => {
    fieldRef.current?.setInputMode(keypadOpen ? "none" : "text");
  }, [keypadOpen, createField, engine, focus, row.id]);

  // After every render, so the name and description follow renumbering and edits (A11Y-3, A11Y-4).
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (field === null) return;
    const textbox = fieldTextbox(field);
    textbox.setAttribute("aria-labelledby", ids.label);
    textbox.setAttribute("aria-describedby", ids.speech);
  });

  const onFieldPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    touchRef.current = event.pointerType === "touch";
  };

  return (
    <li
      className="kc-row"
      data-row-id={row.id}
      data-focused={focusedRowId === row.id ? "true" : undefined}
      data-active={activeRowId === row.id ? "true" : undefined}
    >
      <div className="kc-row-inner">
        <div className="kc-row-gutter">
          <span className="kc-row-number">{number}</span>
          {tab !== null && (
            <button
              type="button"
              className="kc-row-tab"
              aria-label={`${row.hidden ? "Show" : "Hide"} expression ${number}`}
              aria-pressed={!row.hidden}
              data-style={tab === "point" ? "filled" : "solid"}
              style={{ "--kc-row-color": color.hex } as CSSProperties}
              onClick={() => engine.setRowHidden(row.id, !row.hidden)}
            >
              {tab === "point" ? (
                <PointStyleGlyph style="filled" />
              ) : (
                <LineStyleGlyph style="solid" />
              )}
            </button>
          )}
        </div>
        <div className="kc-row-main">
          <div className="kc-row-field" ref={hostRef} onPointerDown={onFieldPointerDown} />
          <span id={ids.label} hidden>{`Expression ${number}`}</span>
          <span id={ids.speech} hidden>
            {speech}
          </span>
          {color.adjusted && <p className="kc-row-note">{EXPLICIT_COLOUR_NOTE}</p>}
        </div>
        <button type="button" className="kc-row-delete" aria-label={`Delete expression ${number}`}>
          <X aria-hidden="true" focusable="false" size={16} />
        </button>
      </div>
    </li>
  );
}
