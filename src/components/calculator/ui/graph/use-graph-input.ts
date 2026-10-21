// Graph input (G-5, KB-8): drag, pinch and wheel on
// the panel, and the graph keys on the surface. Pointer and wheel changes apply once per animation
// frame; until that frame runs, the pending viewport is the base every change builds on. GP-48: only
// the first wheel event of a frame zooms. Buttons, Home and keys apply synchronously through applyNow,
// which cancels the pending frame and builds on it. While the size is unknown nothing acts.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { Viewport, ViewSpec } from "@/lib/calculator/plot/viewport";
import {
  dragViewport,
  pinchState,
  pinchViewport,
  viewportForKey,
  wheelViewport,
  type PinchState,
  type Point,
} from "@/lib/calculator/render/view-input";
import type { Pointer } from "../controller/media";
import type { GraphSize } from "./use-graph-size";
import { LABEL_SELECTOR } from "./use-poi-labels";

type Ref = RefObject<HTMLElement | null>;
export type GraphInputOptions = {
  panel: Ref;
  surface: Ref;
  engine: CalculatorEngine;
  size: GraphSize | null;
  interaction?: GraphInteraction;
  /** SETTINGS-20 Lock Viewport: drag, pinch, wheel, keys and applyNow leave the view alone. */
  locked?: boolean;
};
/**
 * What the panel does with presses (POI-TRACE-12 to POI-TRACE-14, POI-TRACE-21): `press` decides
 * at pointer down whether the press is on a point-of-interest dot ("dot": nothing pans), starts a
 * trace ("trace": move and release follow it, the view stays put) or pans ("pan"); the mouse
 * hovering with no button down reports `hover` (null when it leaves); anything that moves the view
 * calls viewChanged.
 */
export interface GraphInteraction {
  press(at: Point, pointer: Pointer, event: PointerEvent): "dot" | "trace" | "pan";
  move(at: Point): void;
  release(): void;
  hover(at: Point | null): void;
  viewChanged(): void;
}
/** A pan that moves less than this is not a view change yet. */
export const CLICK_SLOP_PX = 4;
/** Applies `next(current view)` at once; false (and nothing done) when the size is unknown or it is null. */
export type ApplyNow = (next: (view: ViewSpec) => Viewport | null) => boolean;
export type GraphInput = { onKeyDown(e: KeyboardEvent): void; applyNow: ApplyNow };

/** The gesture in progress: a drag from one pointer, or a pinch of two, from the view at its start. */
type Gesture =
  | { kind: "drag"; id: number; start: ViewSpec; at: Point }
  | { kind: "pinch"; ids: [number, number]; start: ViewSpec; from: PinchState };

type Press = { id: number; at: Point; moved: boolean; kind: "dot" | "trace" | "pan" };
type InputState = {
  pending: Viewport | null;
  frame: number | null;
  wheeled: boolean; // a wheel step is pending in this frame
  pointers: Map<number, Point>;
  gesture: Gesture | null;
  press: Press | null;
};

const pointerOf = (e: PointerEvent): Pointer => (e.pointerType === "mouse" ? "fine" : "coarse");

export function useGraphInput(o: GraphInputOptions): GraphInput {
  const { panel, surface, engine, size, interaction } = o;
  const locked = o.locked === true;
  const state = useRef<InputState>({
    pending: null,
    frame: null,
    wheeled: false,
    pointers: new Map(),
    gesture: null,
    press: null,
  });
  const latest = useRef({ engine, size, interaction, locked });
  useLayoutEffect(() => {
    latest.current = { engine, size, interaction, locked };
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
    s.wheeled = false;
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
        from: pinchState(s.pointers.get(pair[0])!, s.pointers.get(pair[1])!),
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
      if (view === null || latest.current.locked) return false;
      const viewport = next(view);
      if (viewport === null) return false;
      cancelPending();
      latest.current.interaction?.viewChanged();
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
        s.wheeled = false;
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
      // The controls and the coordinate labels (POI-TRACE-14, POI-TRACE-18) handle their own presses.
      if (e.target instanceof Element && e.target.closest(`.kc-graph-controls, ${LABEL_SELECTOR}`))
        return;
      if (e.button !== 0) return;
      surface.current?.focus({ preventScroll: true });
      try {
        element.setPointerCapture(e.pointerId);
      } catch {
        // synthetic pointers have no capture
      }
      const at = position(e),
        pointer = pointerOf(e),
        hooks = latest.current.interaction;
      s.pointers.set(e.pointerId, at);
      if (s.pointers.size === 1) {
        hooks?.hover(null);
        const kind = hooks?.press(at, pointer, e) ?? "pan";
        s.press = { id: e.pointerId, at, moved: false, kind };
        if (kind !== "pan") {
          s.gesture = null;
          return;
        }
      } else if (s.press !== null) {
        if (s.press.kind === "trace") hooks?.release();
        s.press = { ...s.press, moved: true, kind: "pan" };
        hooks?.viewChanged();
      }
      if (surface.current !== null) surface.current.dataset.dragging = "";
      anchor(view);
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (latest.current.size === null) return;
      if (!s.pointers.has(e.pointerId)) {
        if (e.pointerType === "mouse" && s.pointers.size === 0)
          latest.current.interaction?.hover(position(e));
        return;
      }
      const at = position(e);
      s.pointers.set(e.pointerId, at);
      const press = s.press;
      if (press !== null && press.id === e.pointerId) {
        if (press.kind === "trace") {
          latest.current.interaction?.move(at);
          return;
        }
        if (press.kind === "dot") return;
        if (!press.moved) {
          if (Math.hypot(at[0] - press.at[0], at[1] - press.at[1]) < CLICK_SLOP_PX) return;
          press.moved = true;
          latest.current.interaction?.viewChanged();
        }
      }
      const g = latest.current.locked ? null : s.gesture;
      if (g?.kind === "drag" && g.id === e.pointerId) {
        const at = s.pointers.get(g.id)!;
        schedule(dragViewport(g.start, at[0] - g.at[0], at[1] - g.at[1]));
      } else if (g?.kind === "pinch" && g.ids.includes(e.pointerId)) {
        const now = pinchState(s.pointers.get(g.ids[0])!, s.pointers.get(g.ids[1])!);
        schedule(pinchViewport(g.start, g.from, now));
      }
    };
    const onPointerEnd = (e: PointerEvent): void => {
      if (latest.current.size === null || !s.pointers.delete(e.pointerId)) return;
      const press = s.press;
      if (press !== null && press.id === e.pointerId) {
        s.press = null;
        if (press.kind === "trace") latest.current.interaction?.release();
      }
      const view = currentView();
      if (view !== null) anchor(view);
      if (s.pointers.size === 0 && surface.current !== null)
        delete surface.current.dataset.dragging;
    };
    const onWheel = (e: WheelEvent): void => {
      const view = currentView();
      if (view === null) return;
      e.preventDefault();
      if (s.wheeled || e.deltaY === 0 || latest.current.locked) return;
      latest.current.interaction?.viewChanged();
      schedule(wheelViewport(view, e.deltaY, position(e)));
      s.wheeled = true;
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerEnd);
    element.addEventListener("pointercancel", onPointerEnd);
    element.addEventListener("lostpointercapture", onPointerEnd);
    element.addEventListener("wheel", onWheel, { passive: false });
    const onLeave = () => latest.current.interaction?.hover(null);
    element.addEventListener("pointerleave", onLeave);
    return () => {
      element.removeEventListener("pointerleave", onLeave);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerEnd);
      element.removeEventListener("pointercancel", onPointerEnd);
      element.removeEventListener("lostpointercapture", onPointerEnd);
      element.removeEventListener("wheel", onWheel);
      cancelPending();
      s.pointers.clear();
      s.gesture = null;
      s.press = null;
    };
  }, [panel, surface, anchor, cancelPending, currentView]);

  return { onKeyDown, applyNow };
}
