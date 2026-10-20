// A slider row's track line (SLIDERS-12 to SLIDERS-14, SLIDERS-24 to SLIDERS-26, VIS-37): the min
// label, the track with its ticks and zero marker, the thumb and the max label. Pressing anywhere
// on the track starts a drag from there (a press on the thumb keeps its offset); the value follows
// the pointer once per frame, as a short number or snapped to the step, and the first write of a
// drag is its undo step. The thumb is a role="slider" with the arrow, Page and Home/End keys; Up
// and Down leave for the neighbouring rows, Enter adds a row below, Escape blurs, Tab goes to the
// row's Play button and Shift+Tab opens the limits editor at Step. A click on either label opens
// the limits editor at that field; the labels are not tab stops (the row's math opens the editor).

import { useEffect, useRef, type JSX, type KeyboardEvent, type PointerEvent } from "react";
import { dragSlider, keySlider } from "@/lib/calculator/core/api/sliders";
import { formatNumber } from "@/lib/calculator/core/eval/format";
import {
  pixelOfValue,
  thumbPercent,
  tickPercents,
  valueAtPixel,
  zeroPercent,
  type KeyMove,
} from "@/lib/calculator/sliders/range";
import type { SliderView } from "@/lib/calculator/sliders/slider";
import { useEngine } from "../hooks/use-engine";

const KEYS: Record<string, KeyMove> = {
  ArrowRight: "up",
  ArrowLeft: "down",
  PageUp: "bigup",
  PageDown: "bigdown",
  Home: "min",
  End: "max",
};

/** A limit as the label shows it: a plain number with a true minus sign. */
export function limitText(n: number): string {
  return formatNumber(n).replace(/^-/, "−");
}

export interface SliderTrackProps {
  rowId: string;
  name: string; // spoken name; the thumb's accessible name is it in quotes, `"a"` (SLIDERS-25)
  slider: SliderView;
  focusThumb: boolean; // focus the thumb once mounted (Enter or Escape from the limits editor)
  onThumbFocused(): void;
  onEditLimits(field: "min" | "max"): void;
  onKey(key: "up" | "down" | "enter" | "tab" | "back"): void; // back: Shift+Tab
}

export function SliderTrack(props: SliderTrackProps): JSX.Element {
  const { rowId, slider } = props;
  const engine = useEngine();
  const { range, value } = slider;
  const interior = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const drag = useRef<{ offset: number; first: boolean; frame: number | null; x: number } | null>(
    null
  );
  const latest = useRef(slider);
  latest.current = slider;

  useEffect(() => {
    if (props.focusThumb && thumb.current !== null) {
      thumb.current.focus();
      props.onThumbFocused();
    }
  });
  useEffect(
    () => () => {
      if (drag.current?.frame != null) cancelAnimationFrame(drag.current.frame);
    },
    []
  );

  const write = () => {
    const d = drag.current,
      box = interior.current;
    if (d === null || box === null) return;
    d.frame = null;
    const s = latest.current;
    const v = valueAtPixel(s.range, d.x - d.offset, box.getBoundingClientRect().width);
    dragSlider(engine, rowId, v, d.first);
    d.first = false;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const box = interior.current;
    if (box === null || e.button !== 0 || slider.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = box.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const onThumb = thumb.current?.contains(e.target as Node) === true;
    // SLIDERS-24: a press on the thumb keeps its offset from the thumb's centre.
    const offset = onThumb ? x - pixelOfValue(range, value, rect.width) : 0;
    drag.current = { offset, first: true, frame: null, x };
    box.setPointerCapture?.(e.pointerId);
    thumb.current?.focus();
    if (!onThumb) write();
    box.dataset.dragging = "true";
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current,
      box = interior.current;
    if (d === null || box === null) return;
    d.x = e.clientX - box.getBoundingClientRect().left;
    d.frame ??= requestAnimationFrame(write);
  };
  const onPointerUp = () => {
    const d = drag.current;
    if (d === null) return;
    if (d.frame !== null) {
      cancelAnimationFrame(d.frame);
      write();
    }
    drag.current = null;
    if (interior.current !== null) delete interior.current.dataset.dragging;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const move = KEYS[e.key];
    if (move !== undefined) {
      e.preventDefault();
      keySlider(engine, rowId, move);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      props.onKey(e.key === "ArrowUp" ? "up" : "down");
    } else if (e.key === "Enter") {
      e.preventDefault();
      props.onKey("enter");
    } else if (e.key === "Escape") {
      e.stopPropagation();
      thumb.current?.blur();
    } else if (e.key === "Tab") {
      e.preventDefault();
      props.onKey(e.shiftKey ? "back" : "tab");
    }
  };

  const percent = thumbPercent(range, value);
  const zero = zeroPercent(range);
  return (
    <div className="kc-slider" data-disabled={slider.disabled ? "true" : undefined}>
      <button
        type="button"
        className="kc-slider-label kc-slider-min"
        tabIndex={-1}
        aria-label={`Edit "${props.name}" Limits`}
        onClick={() => props.onEditLimits("min")}
      >
        {limitText(range.min)}
      </button>
      <div
        ref={interior}
        className="kc-slider-interior"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="kc-slider-track">
          {tickPercents(range).map((p) => (
            <span key={p} className="kc-slider-tick" style={{ left: `${p}%` }} />
          ))}
        </div>
        {zero !== null && <span className="kc-slider-zero" style={{ left: `${zero}%` }} />}
        <div
          ref={thumb}
          className="kc-slider-thumb"
          role="slider"
          tabIndex={0}
          aria-label={`"${props.name}"`}
          aria-valuemin={range.min}
          aria-valuemax={range.max}
          aria-valuenow={value}
          aria-disabled={slider.disabled || undefined}
          style={{ left: Number.isFinite(percent) ? `${percent}%` : undefined }}
          onKeyDown={onKeyDown}
        >
          <span className="kc-slider-disc" />
          <span className="kc-slider-dot" />
        </div>
      </div>
      <button
        type="button"
        className="kc-slider-label kc-slider-max"
        tabIndex={-1}
        aria-label={`Slider Maximum: ${formatNumber(range.max)}`}
        onClick={() => props.onEditLimits("max")}
      >
        {limitText(range.max)}
      </button>
    </div>
  );
}
