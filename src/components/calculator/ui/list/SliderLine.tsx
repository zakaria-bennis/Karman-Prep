// The slider line under a slider row's math (SLIDERS-12, SLIDERS-15): the track, or the limits
// editor while the row's math or a limit field has focus, while a limit is invalid, and always in
// Play indefinitely mode (Step only). Focus moving between the row's math, its delete button and
// the limit fields keeps the editor open: a press inside it or a Tab out of the math holds it
// before the math blurs, and once focus settles anywhere else the hold is let go.
//
// SLIDERS-25 Tab order, as the reference walks a slider row: math, delete, min, max, step, thumb,
// Play, then the next row's math; Shift+Tab walks it back (the thumb opens the editor at Step).

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type MutableRefObject,
  type RefObject,
} from "react";
import type { LimitField } from "@/lib/calculator/core/api/sliders";
import type { SliderView } from "@/lib/calculator/sliders/slider";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { SliderLimits } from "./SliderLimits";
import { SliderTrack } from "./SliderTrack";

export interface SliderLineHandle {
  hold(): void; // the row's math is about to hand focus out of the field (Tab)
  focusField(field: "first" | "last"): void; // Tab from delete, Shift+Tab from the thumb
  focusThumb(): void; // Shift+Tab from Play: the thumb, or Step while the editor shows
}

/** Where focus may sit while the editor stays open: the editor, the row's math and its delete. */
const KEEPS_EDITOR = ".kc-slider-line, .kc-row-field, .kc-row-delete";

export function SliderLine(props: {
  engine: CalculatorEngine;
  rowId: string;
  name: string; // spoken name, for the controls' labels (SLIDERS-25)
  glyph: string; // the slider's raw name (`\alpha`, `a_{1}`), typeset between the limits editor's two ≤
  slider: SliderView;
  rowFocused: boolean; // the row's math field has focus
  handle: MutableRefObject<SliderLineHandle | null>;
  playRef: RefObject<HTMLButtonElement>;
  onFocusRow(): void; // Up from a limit field
  onFocusDelete(): void; // Shift+Tab from the first limit field
  onLeave(direction: "up" | "down"): void; // thumb Up/Down, limit Down
  onEnter(): void; // thumb Enter: a new row below
}): JSX.Element {
  const { engine, rowId, slider } = props;
  const { settings } = slider;
  const [hold, setHold] = useState(false);
  // The field to focus once the editor shows; `n` refocuses the same field on a later request.
  const [autoFocus, setFocusRequest] = useState<{ field: LimitField; n: number } | null>(null);
  const setAutoFocus = (field: LimitField | null) =>
    setFocusRequest((last) => (field === null ? null : { field, n: (last?.n ?? 0) + 1 }));
  const [focusThumb, setFocusThumb] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const stepOnly = settings.loopMode === "PLAY_INDEFINITELY";
  const editing = props.rowFocused || hold || slider.error !== null || stepOnly;
  const first: LimitField = stepOnly ? "step" : "min";
  const api: SliderLineHandle = {
    hold: () => setHold(true),
    focusField: (which) => {
      setHold(true);
      setAutoFocus(which === "first" ? first : "step");
    },
    focusThumb: () => {
      // Only a limit error or Play indefinitely keeps the editor up once focus is on Play; a hold
      // left from the math or limits (its focusout not settled yet) gives way to the thumb.
      if (slider.error !== null || stepOnly) {
        setHold(true);
        setAutoFocus("step");
        return;
      }
      setHold(false);
      setFocusRequest(null);
      setFocusThumb(true);
    },
  };
  const { handle } = props;
  useEffect(() => {
    handle.current = api;
    return () => {
      handle.current = null; // unmounted: the row is no longer a slider
    };
  });

  // Once focus settles after leaving any part of the row: anywhere but the editor, the row's
  // math or its delete button lets go of the hold; outside the row, the row is no longer focused.
  const settle = useCallback(() => {
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(() => {
      const row = box.current?.closest(".kc-row");
      const root = box.current?.getRootNode() as Document | ShadowRoot | undefined;
      const active = root?.activeElement ?? null;
      if (row == null) return;
      const inRow = active !== null && row.contains(active);
      const keep = inRow && active.closest(KEEPS_EDITOR)?.closest(".kc-row") === row;
      if (!keep) {
        setHold(false);
        setFocusRequest(null);
      }
      if (!inRow && engine.getSnapshot().focusedRowId === rowId) engine.setFocusedRow(null);
    }, 0);
  }, [engine, rowId]);
  useEffect(() => {
    const row = box.current?.closest(".kc-row");
    row?.addEventListener("focusout", settle);
    return () => row?.removeEventListener("focusout", settle);
  }, [settle]);

  const onFocusChange = useCallback(
    (focused: boolean) => {
      if (!focused) return; // the row's focusout settles it
      clearTimeout(timer.current ?? undefined);
      setHold(true);
      engine.setFocusedRow(rowId);
    },
    [engine, rowId]
  );

  const closeOntoThumb = () => {
    clearTimeout(timer.current ?? undefined);
    setAutoFocus(null);
    setHold(false);
    setFocusThumb(true);
    engine.setFocusedRow(null);
  };

  const latex = {
    min: settings.hardMin ? settings.min : "",
    max: settings.hardMax ? settings.max : "",
    step: settings.step,
  };

  return (
    <div
      ref={box}
      className="kc-slider-line"
      data-editing={editing ? "true" : undefined}
      onPointerDownCapture={(e) => {
        if ((e.target as Element).closest(".kc-slider-limits") !== null) setHold(true);
      }}
    >
      {editing ? (
        <SliderLimits
          rowId={rowId}
          name={props.glyph}
          stepOnly={stepOnly}
          latex={latex}
          invalid={slider.invalid}
          valid={slider.error === null && !stepOnly}
          autoFocus={autoFocus?.field ?? null}
          autoFocusKey={autoFocus?.n ?? 0}
          onFocusChange={onFocusChange}
          onDone={closeOntoThumb}
          onLeave={(direction) => (direction === "up" ? props.onFocusRow() : props.onLeave("down"))}
          onTabOut={(direction) => {
            if (direction === "back") props.onFocusDelete();
            else if (slider.error === null && !stepOnly) closeOntoThumb();
            else props.playRef.current?.focus(); // no thumb while the editor must stay
          }}
        />
      ) : (
        <SliderTrack
          rowId={rowId}
          name={props.name}
          slider={slider}
          focusThumb={focusThumb}
          onThumbFocused={() => setFocusThumb(false)}
          onEditLimits={(field) => {
            setAutoFocus(field);
            setHold(true);
          }}
          onKey={(key) => {
            if (key === "tab") props.playRef.current?.focus();
            else if (key === "back") api.focusField("last");
            else if (key === "enter") props.onEnter();
            else props.onLeave(key);
          }}
        />
      )}
    </div>
  );
}
