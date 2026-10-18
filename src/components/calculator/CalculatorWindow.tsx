"use client";

// The v2 calculator's light-DOM window (A11Y-6, L-12): one frame element in every mode, so a mode
// change never remounts the shadow host inside it. Key handling is native on the frame (AR-18,
// KB-6): React delegates from the root, which never sees the events the frame stops, so the move
// handle, grip, splitter and Escape are handled here before propagation stops. The title bar and
// the grip also drag with the pointer, captured, through clampFloatingRect (AR-22). Eager module.

import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Maximize2, Minimize2, Minus, PictureInPicture2, X } from "lucide-react";
import {
  DOCK_MARGIN,
  DOCK_MIN_WIDTH,
  WINDOW_KEY_STEP,
  calculatorWindowStore,
  clampDockWidth,
  clampFloatingRect,
  type WindowMode,
  type WindowRect,
} from "./calculator-window-store";
import styles from "./CalculatorWindow.module.css";

export interface CalculatorWindowProps {
  mode: WindowMode;
  dockTop: number;
  dockWidth: number;
  floatingRect: WindowRect;
  onModeChange(mode: WindowMode): void;
  onFloatingRectChange(rect: WindowRect): void;
  onDockWidthChange(width: number): void;
  onClose(): void;
  onMinimize(): void;
  onFocusBoundary(edge: "first" | "last"): void;
  frameRef: RefObject<HTMLDivElement | null>; // tabIndex -1; OI-7 touch focus target
  chromeSlotRef: RefObject<HTMLDivElement | null>; // class styles.titleSlot, data-calculator-title-slot
  children: ReactNode;
}

const WINDOW_LABEL = "Karman calculator";
const ISOLATED_KEY_EVENTS = ["keydown", "keyup", "keypress"] as const;
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Arrow keys as a 16 px step on each axis (KB-10, AR-22). */
const ARROW_STEPS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -WINDOW_KEY_STEP, dy: 0 },
  ArrowRight: { dx: WINDOW_KEY_STEP, dy: 0 },
  ArrowUp: { dx: 0, dy: -WINDOW_KEY_STEP },
  ArrowDown: { dx: 0, dy: WINDOW_KEY_STEP },
};

const SPLITTER_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

type WindowControl = "undock" | "maximize" | "restore" | "minimize";

/** The AR- mode table's window controls, in title-bar order, before Close (L-12). */
const CONTROLS_BY_MODE: Record<WindowMode, readonly WindowControl[]> = {
  floating: ["maximize", "minimize"],
  docked: ["undock", "maximize", "minimize"],
  maximized: ["restore", "minimize"],
  fullscreen: [],
};

const CONTROL_LABELS: Record<WindowControl, string> = {
  undock: "Undock calculator",
  maximize: "Maximize calculator",
  restore: "Restore calculator size",
  minimize: "Minimize calculator",
};

const CONTROL_ICONS: Record<WindowControl, typeof X> = {
  undock: PictureInPicture2,
  maximize: Maximize2,
  restore: Minimize2,
  minimize: Minus,
};

/** The contract's React 19 ref type, as @types/react 18's `ref` prop accepts it. */
function domRef(ref: RefObject<HTMLDivElement | null>): RefObject<HTMLDivElement> {
  return ref as RefObject<HTMLDivElement>;
}

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** The dock's widest width in this viewport, `min(900px, 100vw - 480px)` but at least 400 px. */
function maxDockWidth(): number {
  return typeof window === "undefined"
    ? DOCK_MIN_WIDTH
    : clampDockWidth(Number.POSITIVE_INFINITY, window.innerWidth);
}

/** A pointer drag of the title bar (move) or the grip (resize), from the rect it started on. */
interface PointerDrag {
  kind: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  rect: WindowRect;
}

/** `drag`'s rect after the pointer moved by (dx, dy), kept inside the viewport (AR-22). */
function draggedRect(drag: PointerDrag, dx: number, dy: number): WindowRect {
  const { rect } = drag;
  const next =
    drag.kind === "move"
      ? { ...rect, x: rect.x + dx, y: rect.y + dy }
      : { ...rect, width: rect.width + dx, height: rect.height + dy };
  return clampFloatingRect(next, viewport());
}

function frameStyle(props: CalculatorWindowProps): CSSProperties | undefined {
  if (props.mode === "floating") {
    const { x, y, width, height } = props.floatingRect;
    return { left: x, top: y, width, height };
  }
  if (props.mode === "docked") {
    return { left: DOCK_MARGIN, top: props.dockTop, bottom: DOCK_MARGIN, width: props.dockWidth };
  }
  return undefined; // maximized and full screen: inset 0 from the stylesheet
}

export function CalculatorWindow(props: CalculatorWindowProps) {
  const { mode, frameRef, chromeSlotRef } = props;
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const handleRef = useRef<HTMLSpanElement>(null);
  const gripRef = useRef<HTMLDivElement>(null);
  const splitterRef = useRef<HTMLDivElement>(null);
  const titlebarRef = useRef<HTMLDivElement>(null);
  const drag = useRef<PointerDrag | null>(null);

  // AR-22, L-6: a primary-button press on the title bar (outside its buttons) or the grip starts a
  // captured drag while floating; every move writes the clamped rect.
  const startDrag = (kind: PointerDrag["kind"], event: PointerEvent<HTMLElement>) => {
    const current = latest.current;
    if (current.mode !== "floating" || event.button !== 0) return;
    if (kind === "move" && (event.target as Element).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect: current.floatingRect,
    };
    event.preventDefault();
  };
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    latest.current.onFloatingRectChange(draggedRect(active, dx, dy));
  };
  const endDrag = (event: PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };
  const dragHandlers = (kind: PointerDrag["kind"]) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => startDrag(kind, event),
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
  });

  // AR-18, KB-6, KB-10, AR-23: the frame's own key handling, then no key event leaves it.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const current = latest.current;
      const step = ARROW_STEPS[event.key];
      const target = event.target;
      const dockKey = SPLITTER_KEYS.has(event.key);
      if (step && current.mode === "floating" && target === handleRef.current) {
        const rect = current.floatingRect;
        const moved = { ...rect, x: rect.x + step.dx, y: rect.y + step.dy };
        current.onFloatingRectChange(clampFloatingRect(moved, viewport()));
        event.preventDefault();
      } else if (step && current.mode === "floating" && target === gripRef.current) {
        const rect = current.floatingRect;
        const resized = { ...rect, width: rect.width + step.dx, height: rect.height + step.dy };
        current.onFloatingRectChange(clampFloatingRect(resized, viewport()));
        event.preventDefault();
      } else if (current.mode === "docked" && target === splitterRef.current && dockKey) {
        current.onDockWidthChange(splitterWidth(event.key, current.dockWidth));
        event.preventDefault();
      } else if (event.key === "Escape" && !event.defaultPrevented) {
        current.onClose();
      }
    };
    const stop = (event: Event) => event.stopPropagation();
    frame.addEventListener("keydown", onKeyDown);
    for (const type of ISOLATED_KEY_EVENTS) frame.addEventListener(type, stop);
    return () => {
      frame.removeEventListener("keydown", onKeyDown);
      for (const type of ISOLATED_KEY_EVENTS) frame.removeEventListener(type, stop);
    };
  }, [frameRef]);

  // AR-28: Shift+Tab past the start reaches the calculator's last element; Tab past the end wraps
  // to the title bar, or to the calculator's first element when the title bar has nothing to focus.
  const focusEndBoundary = () => {
    const first = titlebarRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    if (first) first.focus();
    else latest.current.onFocusBoundary("first");
  };

  const runControl = (control: WindowControl) => {
    if (control === "undock") props.onModeChange("floating");
    else if (control === "maximize") props.onModeChange("maximized");
    else if (control === "restore") props.onModeChange(calculatorWindowStore.get().restoreMode);
    else props.onMinimize();
  };

  const floating = mode === "floating";
  const fullScreen = mode === "fullscreen";
  const sentinel = (edge: "start" | "end") =>
    fullScreen ? (
      <div
        className={styles.sentinel}
        data-focus-sentinel={edge}
        tabIndex={0}
        onFocus={edge === "start" ? () => props.onFocusBoundary("last") : focusEndBoundary}
      />
    ) : null;

  return (
    <div
      ref={domRef(frameRef)}
      className={styles.frame}
      data-calculator-window=""
      data-mode={mode}
      tabIndex={-1}
      role={mode === "docked" ? "complementary" : "dialog"}
      aria-modal={fullScreen ? "true" : undefined}
      aria-label={WINDOW_LABEL}
      style={frameStyle(props)}
    >
      {sentinel("start")}
      <div
        ref={titlebarRef}
        className={styles.titlebar}
        data-calculator-titlebar=""
        {...(floating ? dragHandlers("move") : {})}
      >
        <span
          ref={handleRef}
          className={styles.moveHandle}
          role={floating ? "button" : undefined}
          aria-roledescription={floating ? "move handle" : undefined}
          tabIndex={floating ? 0 : undefined}
        >
          {WINDOW_LABEL}
        </span>
        <div
          ref={domRef(chromeSlotRef)}
          className={styles.titleSlot}
          data-calculator-title-slot=""
        />
        <div className={styles.controls} data-window-controls="">
          {CONTROLS_BY_MODE[mode].map((control) => {
            const Icon = CONTROL_ICONS[control];
            return (
              <button
                key={control}
                type="button"
                aria-label={CONTROL_LABELS[control]}
                title={CONTROL_LABELS[control]}
                onClick={() => runControl(control)}
              >
                <Icon size={16} aria-hidden="true" />
              </button>
            );
          })}
          <button
            type="button"
            aria-label="Close calculator"
            title="Close calculator"
            onClick={() => props.onClose()}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.body}>{props.children}</div>
      {floating ? (
        <div
          ref={gripRef}
          className={styles.grip}
          role="button"
          aria-label="Resize calculator"
          aria-roledescription="resize handle"
          tabIndex={0}
          {...dragHandlers("resize")}
        />
      ) : null}
      {mode === "docked" ? (
        <div
          ref={splitterRef}
          className={styles.splitter}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize calculator dock"
          aria-valuenow={props.dockWidth}
          aria-valuemin={DOCK_MIN_WIDTH}
          aria-valuemax={maxDockWidth()}
          tabIndex={0}
        />
      ) : null}
      {sentinel("end")}
    </div>
  );
}

/** The splitter's next dock width for one of SPLITTER_KEYS (AR-23). */
function splitterWidth(key: string, dockWidth: number): number {
  const viewportWidth = window.innerWidth;
  if (key === "Home") return DOCK_MIN_WIDTH;
  if (key === "End") return clampDockWidth(Number.POSITIVE_INFINITY, viewportWidth);
  const step = key === "ArrowRight" ? WINDOW_KEY_STEP : -WINDOW_KEY_STEP;
  return clampDockWidth(dockWidth + step, viewportWidth);
}
