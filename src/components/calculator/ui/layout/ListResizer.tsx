// EL-4, RS-2: the list's resize divider in the side-by-side layout. An invisible 15 px strip from
// 3 px inside the panel's right edge to 12 px past it, with the ew-resize cursor. Dragging it sets
// the list width live (pointer x minus 2 px, no transition), clamped to 320 px and the container
// width minus 200 px; the dragged width is kept when the container later resizes (re-clamped, never
// replaced by the clamp() default). Karman addition: the strip is a focusable separator that the
// arrow keys (10 px, 50 px with Shift), Home and End move.

import {
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

export const MIN_LIST_WIDTH = 320;
const GRAPH_ROOM = 200;
const STEP = 10;
const BIG_STEP = 50;

export function clampListWidth(width: number, containerWidth: number): number {
  const max = Math.max(MIN_LIST_WIDTH, containerWidth - GRAPH_ROOM);
  return Math.round(Math.min(max, Math.max(MIN_LIST_WIDTH, width)));
}

/** EL-1: the default width, tokens.css's clamp(320px, 160px + 20%, 500px). */
export function defaultListWidth(containerWidth: number): number {
  return Math.min(500, Math.max(MIN_LIST_WIDTH, 160 + 0.2 * containerWidth));
}

/** The dragged width (null until the first drag) and the style that applies it to .kc-app. */
export function useListWidth(containerWidth: number) {
  const [dragged, setDragged] = useState<number | null>(null);
  const width = dragged === null ? null : clampListWidth(dragged, containerWidth);
  const style = width === null ? undefined : ({ "--kc-list-width": `${width}px` } as CSSProperties);
  return { width: width ?? defaultListWidth(containerWidth), setWidth: setDragged, style };
}

export function ListResizer(props: {
  width: number; // the list's current width
  containerWidth: number;
  onResize(width: number): void;
}): JSX.Element {
  const { containerWidth, onResize } = props;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el.hasPointerCapture(e.pointerId)) return;
    const left = el.parentElement!.getBoundingClientRect().left;
    onResize(clampListWidth(e.clientX - left - 2, containerWidth));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const now = props.width;
    const step = e.shiftKey ? BIG_STEP : STEP;
    const next =
      e.key === "ArrowLeft"
        ? now - step
        : e.key === "ArrowRight"
          ? now + step
          : e.key === "Home"
            ? MIN_LIST_WIDTH
            : e.key === "End"
              ? containerWidth - GRAPH_ROOM
              : null;
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    onResize(clampListWidth(next, containerWidth));
  };

  return (
    <div
      className="kc-list-resizer"
      role="separator"
      tabIndex={0}
      aria-label="Resize expression list"
      aria-orientation="vertical"
      aria-valuemin={MIN_LIST_WIDTH}
      aria-valuemax={Math.max(MIN_LIST_WIDTH, containerWidth - GRAPH_ROOM)}
      aria-valuenow={Math.round(props.width)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
    />
  );
}
