// The slider line under a slider row's math (SLIDERS-12, SLIDERS-15): the track, or the limits
// editor while the row's math or a limit field has focus, while a limit is invalid, and always in
// Play indefinitely mode (Step only). Focus moving between the row's math and the limit fields
// keeps the editor open: a press inside it or a Tab out of the math holds it before the math
// blurs, and a limit field's blur only closes it once focus has settled outside.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type MutableRefObject,
  type RefObject,
} from "react";
import type { SliderView } from "@/lib/calculator/sliders/slider";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { SliderLimits } from "./SliderLimits";
import { SliderTrack } from "./SliderTrack";

export interface SliderLineHandle {
  hold(): void; // the row's math is about to hand focus to the editor (Tab)
}

export function SliderLine(props: {
  engine: CalculatorEngine;
  rowId: string;
  name: string;
  slider: SliderView;
  rowFocused: boolean; // the row's math field has focus
  handle: MutableRefObject<SliderLineHandle | null>;
  playRef: RefObject<HTMLButtonElement>;
  onFocusRow(): void; // Up from a limit field
  onLeave(direction: "up" | "down"): void; // thumb Up/Down, limit Down
  onEnter(): void; // thumb Enter: a new row below
}): JSX.Element {
  const { engine, rowId, slider } = props;
  const { settings } = slider;
  const [hold, setHold] = useState(false);
  const [autoFocus, setAutoFocus] = useState<"min" | "max" | null>(null);
  const [focusThumb, setFocusThumb] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  props.handle.current = { hold: () => setHold(true) };
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const stepOnly = settings.loopMode === "PLAY_INDEFINITELY";
  const editing = props.rowFocused || hold || slider.error !== null || stepOnly;

  const onFocusChange = useCallback(
    (focused: boolean) => {
      clearTimeout(timer.current ?? undefined);
      if (focused) {
        setHold(true);
        engine.setFocusedRow(rowId);
        return;
      }
      // Settle first: focus may be moving to another limit field or to the row's math.
      timer.current = setTimeout(() => {
        const root = box.current?.getRootNode() as Document | ShadowRoot | undefined;
        const active = root?.activeElement ?? null;
        if (active !== null && box.current?.closest(".kc-row")?.contains(active)) {
          if (!box.current.contains(active)) {
            setHold(false);
            setAutoFocus(null);
          }
          return;
        }
        setHold(false);
        setAutoFocus(null);
        if (engine.getSnapshot().focusedRowId === rowId) engine.setFocusedRow(null);
      }, 0);
    },
    [engine, rowId]
  );

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
          name={props.name}
          stepOnly={stepOnly}
          latex={latex}
          invalid={slider.invalid}
          valid={slider.error === null && !stepOnly}
          autoFocus={autoFocus}
          onFocusChange={onFocusChange}
          onDone={() => {
            clearTimeout(timer.current ?? undefined);
            setAutoFocus(null);
            setHold(false);
            setFocusThumb(true);
            engine.setFocusedRow(null);
          }}
          onLeave={(direction) => (direction === "up" ? props.onFocusRow() : props.onLeave("down"))}
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
            else if (key === "enter") props.onEnter();
            else props.onLeave(key);
          }}
        />
      )}
    </div>
  );
}
