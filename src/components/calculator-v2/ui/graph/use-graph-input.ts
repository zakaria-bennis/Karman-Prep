// Graph input (G-5, KB-8; 08 Decision "The engine holds the viewport"): drag, pinch and wheel on
// the panel, and the graph keys on the surface. Pointer and wheel changes apply once per animation
// frame; until that frame runs, the pending viewport is the base every change builds on, so wheel
// events in one frame accumulate. Buttons, Home and keys apply synchronously through applyNow,
// which cancels the pending frame and builds on it. While the size is unknown nothing acts.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import type { Viewport, ViewSpec } from "@/lib/calculator-v2/plot/viewport";
import {
  dragViewport,
  pinchViewport,
  viewportForKey,
  wheelViewport,
  type PinchState,
  type Point,
} from "@/lib/calculator-v2/render/view-input";
import type { GraphSize } from "./use-graph-size";

type Ref = RefObject<HTMLElement | null>;
export type GraphInputOptions = {
  panel: Ref;
  surface: Ref;
  engine: CalculatorEngine;
  size: GraphSize | null;
};
/** Applies `next(current view)` at once; false (and nothing done) when the size is unknown or it is null. */
export type ApplyNow = (next: (view: ViewSpec) => Viewport | null) => boolean;
export type GraphInput = { onKeyDown(e: KeyboardEvent): void; applyNow: ApplyNow };

/** The gesture in progress: a drag from one pointer, or a pinch of two, from the view at its start. */
type Gesture =
  | { kind: "drag"; id: number; start: ViewSpec; at: Point }
  | { kind: "pinch"; ids: [number, number]; start: ViewSpec; from: PinchState };

type InputState = {
  pending: Viewport | null;
  frame: number | null;
  pointers: Map<number, Point>;
  gesture: Gesture | null;
};

const pinchOf = (a: Point, b: Point): PinchState => ({
  mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
  distance: Math.hypot(b[0] - a[0], b[1] - a[1]),
});

export function useGraphInput(o: GraphInputOptions): GraphInput {
  const { panel, surface, engine, size } = o;
  const state = useRef<InputState>({
    pending: null,
    frame: null,
    pointers: new Map(),
    gesture: null,
  });
  const latest = useRef({ engine, size });
  useLayoutEffect(() => {
    latest.current = { engine, size };
  });

  /** The view every change builds on: the pending viewport, else the engine's; null while unsized. */
  const currentView = useCallback((): ViewSpec | null => {
    const { engine: e, size: g } = latest.current;
    if (g === null) return null;
    return { viewport: state.current.pending ?? e.getSnapshot().viewport, ...g };
  }, []);

  const cancelPending = useCallback((): void => {
    const s = state.current;
    if (s.frame !== null) cancelAnimationFrame(s.frame);
    s.frame = null;
    s.pending = null;
  }, []);

  /** Restarts the active gesture from `view` at the pointers' last positions. */
  const anchor = useCallback((view: ViewSpec): void => {
    const s = state.current;
    const ids = [...s.pointers.keys()];
    if (ids.length >= 2) {
      const pair: [number, number] = [ids[0], ids[1]];
      s.gesture = {
        kind: "pinch",
        ids: pair,
        start: view,
        from: pinchOf(s.pointers.get(pair[0])!, s.pointers.get(pair[1])!),
      };
    } else if (ids.length === 1) {
      s.gesture = { kind: "drag", id: ids[0], start: view, at: s.pointers.get(ids[0])! };
    } else {
      s.gesture = null;
    }
  }, []);

  const applyNow = useCallback<ApplyNow>(
    (next) => {
      const view = currentView();
      if (view === null) return false;
      const viewport = next(view);
      if (viewport === null) return false;
      cancelPending();
      latest.current.engine.setMathBounds(viewport);
      if (state.current.gesture !== null) anchor({ ...view, viewport });
      return true;
    },
    [anchor, cancelPending, currentView]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (applyNow((v) => viewportForKey(e.nativeEvent, v))) e.preventDefault();
    },
    [applyNow]
  );

  useEffect(() => {
    const element = panel.current;
    if (element === null) return;
    const s = state.current;

    const schedule = (v: Viewport): void => {
      s.pending = v;
      if (s.frame !== null) return;
      s.frame = requestAnimationFrame(() => {
        const pending = s.pending;
        s.frame = null;
        s.pending = null;
        if (pending !== null) latest.current.engine.setMathBounds(pending);
      });
    };
    const position = (e: { clientX: number; clientY: number }): Point => {
      const rect = element.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const onPointerDown = (e: PointerEvent): void => {
      const view = currentView();
      if (view === null) return;
      if (e.target instanceof Element && e.target.closest(".kc-graph-controls") !== null) return;
      if (e.button !== 0) return;
      surface.current?.focus({ preventScroll: true });
      try {
        element.setPointerCapture(e.pointerId);
      } catch {
        // synthetic pointers have no capture
      }
      if (surface.current !== null) surface.current.dataset.dragging = "";
      s.pointers.set(e.pointerId, position(e));
      anchor(view);
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (latest.current.size === null || !s.pointers.has(e.pointerId)) return;
      s.pointers.set(e.pointerId, position(e));
      const g = s.gesture;
      if (g?.kind === "drag" && g.id === e.pointerId) {
        const at = s.pointers.get(g.id)!;
        schedule(dragViewport(g.start, at[0] - g.at[0], at[1] - g.at[1]));
      } else if (g?.kind === "pinch" && g.ids.includes(e.pointerId)) {
        const now = pinchOf(s.pointers.get(g.ids[0])!, s.pointers.get(g.ids[1])!);
        schedule(pinchViewport(g.start, g.from, now));
      }
    };
    const onPointerEnd = (e: PointerEvent): void => {
      if (latest.current.size === null || !s.pointers.delete(e.pointerId)) return;
      const view = currentView();
      if (view !== null) anchor(view);
      if (s.pointers.size === 0 && surface.current !== null)
        delete surface.current.dataset.dragging;
    };
    const onWheel = (e: WheelEvent): void => {
      const view = currentView();
      if (view === null) return;
      e.preventDefault();
      schedule(wheelViewport(view, e.deltaY, e.deltaMode, position(e)));
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerEnd);
    element.addEventListener("pointercancel", onPointerEnd);
    element.addEventListener("lostpointercapture", onPointerEnd);
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerEnd);
      element.removeEventListener("pointercancel", onPointerEnd);
      element.removeEventListener("lostpointercapture", onPointerEnd);
      element.removeEventListener("wheel", onWheel);
      cancelPending();
      s.pointers.clear();
      s.gesture = null;
    };
  }, [panel, surface, anchor, cancelPending, currentView]);

  return { onKeyDown, applyNow };
}
