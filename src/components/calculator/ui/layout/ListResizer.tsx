// EL-4, RS-2: the list's resize divider in the side-by-side layout. An invisible 15 px strip from
// 3 px inside the panel's right edge to 12 px past it, with the ew-resize cursor. Dragging it sets
// the list width live (no transition), keeping the distance between the pointer and the panel edge
// it had at the grab, so the edge never jumps on the first move; clamped to 320 px and the container
// width minus 200 px; the dragged width is kept when the container later resizes (re-clamped, never
// replaced by the default). The default and the dragged width both snap to the width that leaves a
// square graph when they come within 10 px of it, as the reference's do. Karman addition: the strip is a focusable separator that the
// arrow keys (10 px, 50 px with Shift), Home and End move.

import {
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

export const MIN_LIST_WIDTH = 320;
const GRAPH_ROOM = 200;
const SQUARE_SNAP = 10;
const STEP = 10;
const BIG_STEP = 50;

export function clampListWidth(width: number, containerWidth: number): number {
  const max = Math.max(MIN_LIST_WIDTH, containerWidth - GRAPH_ROOM);
  return Math.round(Math.min(max, Math.max(MIN_LIST_WIDTH, width)));
}

/** EL-1: the default width, clamp(320px, 160px + 20%, 500px) of the container. */
export function defaultListWidth(containerWidth: number): number {
  return Math.min(500, Math.max(MIN_LIST_WIDTH, 160 + 0.2 * containerWidth));
}

/** The width that leaves the graph square when `width` is within 10 px of it, else `width`. */
export function snapSquare(width: number, containerWidth: number, graphHeight: number): number {
  const square = containerWidth - graphHeight;
  return Math.abs(square - width) <= SQUARE_SNAP ? square : width;
}

/**
 * The list width (the dragged one, null until the first drag, or the default, either snapped to a
 * square graph) and the style that applies it to .kc-app. The graph keeps the calculator's full
 * height in the side-by-side layout (the keypad covers it), so its height is the container's.
 */
export function useListWidth(containerWidth: number, graphHeight: number) {
  const [dragged, setDragged] = useState<number | null>(null);
  const base =
    dragged === null ? defaultListWidth(containerWidth) : clampListWidth(dragged, containerWidth);
  const width = snapSquare(base, containerWidth, graphHeight);
  const style = { "--kc-list-width": `${width}px` } as CSSProperties;
  return { width, setWidth: setDragged, style };
}

export function ListResizer(props: {
  width: number; // the list's current width
  containerWidth: number;
  onResize(width: number): void;
}): JSX.Element {
  const { containerWidth, onResize } = props;
  /** The pointer's distance past the panel edge at the grab. */
  const grab = useRef(0);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const left = e.currentTarget.parentElement!.getBoundingClientRect().left;
    grab.current = e.clientX - (left + props.width);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el.hasPointerCapture(e.pointerId)) return;
    const left = el.parentElement!.getBoundingClientRect().left;
    onResize(clampListWidth(e.clientX - left - grab.current, containerWidth));
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
