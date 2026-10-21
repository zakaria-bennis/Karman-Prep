// The keypad: a region named "Keypad"
// with a Hide keypad bar and the key groups of keypadLayout() for the page, width, pointer and
// Shift (the K-1 tray, the K-3 letters pages, the K-6 phone keypad), and, while closed, a Show
// keypad tab at the bottom-left for a mouse in the side-by-side layout only (VIS-RESPONSIVE-15: a
// stacked mouse layout opens it from the list toolbar, and a touch opens it by focusing a row). A closed keypad stays mounted, hidden from assistive technology and inert, so the
// AN-1 slide has something to move. The audio key starts and stops the keyboard trace (K-9, POI-20). Insert and Enter
// keys act through pressKey without taking focus from the row (K-10); every key acts once per press,
// on its click, with no hold-to-repeat, as Desmos's does (K-11); a pressed key carries data-pressed for its tone (AN-11). The Functions key
// opens the Functions panel (K-4, K-5): a panel button inserts its template into the keypad's row
// in one run call, closes the panel and returns focus to the row. On a phone a touch on the graph
// shrinks the open keypad to a thin Show keypad bar (`minimized`, owner decision 2026-10-21); the
// bar brings the keys back onto the row last typed in.

import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type JSX,
  type PointerEvent,
} from "react";
import type { PanelEntry } from "@/lib/calculator/core/latex/operator-names";
import { AnnouncerContext } from "../a11y/announcer";
import { EscapeContext, type EscapeStack } from "../focus/escape-stack";
import { FocusContext } from "../focus/focus-controller";
import { CaretUpGlyph, KeyboardGlyph } from "../../icons/list";
import { KeyboardTraceContext } from "../graph/keyboard-trace";
import { useEngine } from "../hooks/use-engine";
import { editThroughKeypad } from "../list/row-actions";
import { MotionContext } from "../list/motion";
import { keypadTarget, pressKey, type KeyContext } from "./apply-key";
import { createDoubleTapTracker } from "./double-tap";
import { FunctionsPanel } from "./FunctionsPanel";
import { KeyFace } from "./KeyFace";
import { CaretDownGlyph, TabKeyboardGlyph } from "./keypad-icons";
import { keypadLayout, placeRow, NARROW_BELOW, type KeyDef, type KeypadLayout } from "./keys";

export interface KeypadProps {
  containerWidth: number; // VIS-KEYPAD-39: word labels by width
  layout: "desktop" | "stacked"; // L-1 side by side, L-2 stacked (under 450 px)
  pointer: "fine" | "coarse"; // VIS-KEYPAD-32: Show/Hide controls only for a mouse side by side
  open: boolean;
  /** The open keypad shows only its Show keypad bar (phone, after a graph touch). */
  minimized?: boolean;
  onRestore?(): void;
  onOpenChange(open: boolean, by: "student" | "system"): void;
}

// The installed @types/react (18) has no `inert` prop; React 19 renders it as a boolean attribute.
const INERT: object = { inert: true };

/** True when focus (in `el`'s document or shadow root) is on `el` or inside it. */
function holdsFocus(el: HTMLElement | null): boolean {
  if (el === null) return false;
  const active = (el.getRootNode() as Document | ShadowRoot).activeElement;
  return active !== null && el.contains(active);
}

/** Keeps focus in the row: a key's mousedown never moves focus to the key (K-10). */
const keepFocus = (event: { preventDefault(): void }) => event.preventDefault();

/** Pushes an escape layer while `active`; Escape calls the latest `close`. */
function useEscapeLayer(
  escape: EscapeStack | null,
  id: string,
  active: boolean,
  close: () => void
): void {
  const closeRef = useRef(close);
  useLayoutEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!active || escape === null) return;
    return escape.push({ id, close: () => closeRef.current() });
  }, [escape, id, active]);
}

/** The Functions panel's lifecycle: only "open" pushes its escape layer and expands the key. */
type FunctionsState = "closed" | "open" | "closing";

/** The ARIA state each key with a behaviour of its own carries. */
function keyState(
  key: KeyDef,
  page: KeypadLayout["page"],
  shift: boolean,
  functionsPanelId: string,
  functionsOpen: boolean,
  tracing: boolean,
  traceAvailable: boolean
): ButtonHTMLAttributes<HTMLButtonElement> {
  switch (key.behaviour.type) {
    case "letters":
      return { "aria-pressed": page === "letters" };
    case "shift":
      return { "aria-pressed": shift };
    case "functions":
      return { "aria-expanded": functionsOpen, "aria-controls": functionsPanelId };
    case "audio":
      return {
        "aria-pressed": tracing,
        "aria-disabled": tracing || traceAvailable ? undefined : true,
        title: key.name,
      };
    default:
      return {};
  }
}

const noSubscribe = () => () => undefined;

export function Keypad(props: KeypadProps): JSX.Element {
  const { containerWidth, pointer, open, onOpenChange } = props;
  const minimized = open && props.minimized === true;
  const engine = useEngine();
  const focus = useContext(FocusContext);
  const announcer = useContext(AnnouncerContext);
  const trace = useContext(KeyboardTraceContext);
  const tracing =
    useSyncExternalStore(
      trace === null ? noSubscribe : (l) => trace.subscribe(l),
      () => trace?.state ?? null
    ) !== null;
  // VIS-KEYPAD-9: the open keypad's audio key looks disabled while no row has a curve to trace,
  // checked once per engine snapshot.
  const traceCache = useRef<{ snapshot: unknown; available: boolean } | null>(null);
  const traceAvailable = useSyncExternalStore(
    (l) => engine.subscribe(l),
    () => {
      if (!open) return false;
      const snapshot = engine.getSnapshot();
      if (traceCache.current?.snapshot !== snapshot) {
        const available = snapshot.rows.some((row) => engine.poiCurves(row.id).length > 0);
        traceCache.current = { snapshot, available };
      }
      return traceCache.current.available;
    }
  );
  const escape = useContext(EscapeContext);
  const readDuration = useContext(MotionContext);
  const [page, setPage] = useState<KeypadLayout["page"]>("main");
  const [shift, setShift] = useState(false);
  /** The key held by a pointer, drawn with its press tone (AN-11). */
  const [pressed, setPressed] = useState<string | null>(null);
  // One double-tap tracker (K-7) per mount.
  const [doubleTap] = useState(() => createDoubleTapTracker(() => performance.now()));
  const functionsPanelId = useId();
  const [functionsState, setFunctionsState] = useState<FunctionsState>("closed");
  const sectionRef = useRef<HTMLElement>(null);
  const hideRef = useRef<HTMLButtonElement>(null);
  const showRef = useRef<HTMLButtonElement>(null);
  /** KB-13, WCAG 2.4.3: the control to focus once `open` commits, set when focus was on the
   *  control that unmounts (Show keypad) or inside the keypad that turns inert (Hide, Escape). */
  const focusAfter = useRef<"hide" | "show" | null>(null);
  /** VIS-KEYPAD-36: Show keypad fades in only when it returns after the keypad was open. */
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) setWasOpen(true);
  const studentOpenChange = (next: boolean) => {
    const held = next ? holdsFocus(showRef.current) : holdsFocus(sectionRef.current);
    focusAfter.current = held ? (next ? "hide" : "show") : null;
    onOpenChange(next, "student");
  };
  useLayoutEffect(() => {
    const target = focusAfter.current;
    if (target === null || (target === "hide") !== open) return;
    focusAfter.current = null;
    // Without the Show keypad tab, focus goes to the list toolbar's Keypad toggle when there is one.
    const show =
      showRef.current ??
      sectionRef.current?.closest(".kc-app")?.querySelector<HTMLElement>('[data-tool="keypad"]');
    (target === "hide" ? hideRef.current : show)?.focus();
  }, [open]);

  // Closing the keypad resets the page and Shift, so it always reopens on the main page, and ends
  // a held key's press tone, whose pointerup an inert keypad never receives.
  useEffect(() => {
    if (open) return;
    setPressed(null);
    setPage("main");
    setShift(false);
    setFunctionsState("closed");
  }, [open]);
  // KB-3: Escape closes the ABC page before the keypad (ESCAPE_RANK).
  useEscapeLayer(escape, "keypad", open, () => studentOpenChange(false));
  useEscapeLayer(escape, "letters", open && page === "letters", () => setPage("main"));
  // KB-3: Escape closes the Functions panel first. Focus inside the panel moves to the Functions
  // key, checked before "closing" makes the panel inert (a browser drops focus from it).
  useEscapeLayer(escape, "functions", open && functionsState === "open", () => {
    const section = sectionRef.current;
    const panel = section?.querySelector(".kc-functions-panel") ?? null;
    if (panel !== null && panel.contains(panel.ownerDocument.activeElement)) {
      section?.querySelector<HTMLElement>('[data-key="functions"]')?.focus();
    }
    setFunctionsState("closing");
  });
  // AN-2: a closing panel waits its own closing duration, read once "closing" is committed; 0
  // (reduced motion, jsdom) unmounts it here, before paint. A reopen clears the timeout.
  useLayoutEffect(() => {
    if (functionsState !== "closing") return;
    const panel = sectionRef.current?.querySelector(".kc-functions-panel") ?? null;
    const ms = panel === null ? 0 : readDuration(panel);
    if (ms <= 0) {
      setFunctionsState("closed");
      return;
    }
    const timer = setTimeout(() => setFunctionsState("closed"), ms);
    return () => clearTimeout(timer);
  }, [functionsState, readDuration]);
  if (escape === null) throw new Error("Keypad must be used inside EscapeContext");
  if (focus === null) throw new Error("Keypad must be used inside FocusContext");

  /** The row a mouse-opened keypad types into: the focused one, the last focused, else row 1. */
  const focusKeypadRow = () => {
    const { focusedRowId, rows } = engine.getSnapshot();
    if (focusedRowId !== null) return;
    const rowId = focus.lastFocusedRowId() ?? rows.find((row) => row.type !== "table")?.id;
    if (rowId !== undefined) focus.focusRow(rowId, "end");
  };
  const layout = keypadLayout(page, containerWidth, shift);
  // VIS-KEYPAD-32, 40, VIS-RESPONSIVE-15: the Show and Hide controls are for a mouse side by side
  // only; a stacked mouse layout toggles from the list toolbar, and a touch opens by row focus.
  const controls = pointer === "fine" && props.layout === "desktop";
  const ctx: KeyContext = { engine, focus, announcer, doubleTap };

  /** K-5: one run call into the keypad's row, close the panel, then focus the row's field. */
  const insertFunction = (entry: PanelEntry) => {
    doubleTap.clear();
    const target = keypadTarget(focus, engine.getSnapshot(), engine);
    if (target !== null) {
      const { rowId, field, cell } = target;
      editThroughKeypad(engine, announcer, rowId, field, (f) => f.run(entry.actions), cell?.commit);
    }
    setFunctionsState("closing");
    target?.field.focus(); // the caret stays where the template put it
  };

  /** A key's action on click (mouse, touch and keyboard). */
  const activate = (key: KeyDef) => {
    switch (key.behaviour.type) {
      case "letters":
        // KB-3: the letters page has no Functions key, so the switch closes the panel and its
        // Escape layer at once, as the reference's does; the return to the main page leaves it shut.
        setPage((p) => (p === "main" ? "letters" : "main"));
        setFunctionsState("closed");
        return;
      case "shift":
        setShift((on) => !on);
        return;
      case "insert":
      case "enter":
        pressKey(ctx, key); // VIS-KEYPAD-23: Shift stays on until tapped again
        return;
      case "functions":
        setFunctionsState((state) => (state === "open" ? "closing" : "open"));
        return;
      case "audio": // K-9: the keyboard trace of the keypad's row (POI-20)
        trace?.toggle(keypadTarget(focus, engine.getSnapshot(), engine)?.rowId ?? null);
        return;
    }
  };
  const startPress = (event: PointerEvent<HTMLButtonElement>, key: KeyDef) => {
    if (event.button > 0) return; // the primary button, a touch or a pen contact
    setPressed(key.id);
  };
  const endPress = (key: KeyDef) => {
    setPressed((id) => (id === key.id ? null : id));
  };

  // VIS-KEYPAD-3: each key fills its cell less a 2 px margin, edges rounded to whole pixels.
  const renderKey = (key: KeyDef, x: number, width: number) => (
    <button
      key={key.id}
      style={{ "--kc-x": x, "--kc-w": width } as CSSProperties}
      type="button"
      className="kc-key"
      aria-label={key.name}
      data-key={key.id}
      data-tone={key.tone}
      data-pressed={pressed === key.id ? "true" : undefined}
      {...keyState(
        key,
        page,
        shift,
        functionsPanelId,
        functionsState === "open",
        tracing,
        traceAvailable
      )}
      onMouseDown={keepFocus}
      onPointerDown={(event) => startPress(event, key)}
      onPointerUp={() => endPress(key)}
      onPointerCancel={() => endPress(key)}
      onPointerLeave={() => endPress(key)}
      // K-11: one action per press, on its click; a press that ends off the key leaves no click.
      onClick={() => activate(key)}
    >
      <KeyFace face={key.face} />
    </button>
  );

  return (
    <>
      <section
        ref={sectionRef}
        className="kc-keypad"
        role="region"
        aria-label="Keypad"
        aria-hidden={open ? undefined : true}
        {...(open ? {} : INERT)}
        data-open={String(open)}
        data-narrow={containerWidth < NARROW_BELOW ? "true" : undefined}
        data-full-width={containerWidth <= KEY_BLOCK_MAX ? "true" : undefined}
        data-abc-size={abcSize(containerWidth)}
        data-pointer={pointer}
        data-page={page}
        data-minimized={minimized ? "true" : undefined}
      >
        {minimized && (
          <button
            type="button"
            className="kc-keypad-bar"
            aria-label="Show keypad"
            onClick={() => {
              props.onRestore?.();
              focusKeypadRow();
            }}
          >
            <KeyboardGlyph />
            <CaretUpGlyph />
          </button>
        )}
        {controls && (
          <button
            ref={hideRef}
            type="button"
            className="kc-hide-keypad"
            aria-label="Hide keypad"
            onClick={() => studentOpenChange(false)}
          >
            <TabKeyboardGlyph />
            <CaretDownGlyph />
          </button>
        )}
        <div
          className="kc-keypad-keys"
          aria-hidden={minimized ? true : undefined}
          {...(minimized ? INERT : {})}
        >
          {layout.rows.map((row, r) => (
            <div key={r} className="kc-keypad-row">
              {placeRow(row).map((cell) => renderKey(cell.key, cell.x, cell.width))}
            </div>
          ))}
          {functionsState !== "closed" && (
            <>
              <FunctionsPanel
                id={functionsPanelId}
                state={functionsState}
                onInsert={insertFunction}
              />
              <FunctionsArrow />
            </>
          )}
        </div>
      </section>
      {!open && controls && (
        <button
          ref={showRef}
          type="button"
          className="kc-show-keypad"
          aria-label="Show keypad"
          data-returning={wasOpen ? "true" : undefined}
          onClick={(event) => {
            // VIS-KEYPAD-37: a mouse click opens the keypad onto a row, as the reference's does;
            // Enter or Space (detail 0) keeps focus on the toggle (WCAG 2.4.3).
            if (event.detail === 0) return studentOpenChange(true);
            focusAfter.current = null;
            onOpenChange(true, "student");
            focusKeypadRow();
          }}
        >
          <KeyboardGlyph />
          <CaretUpGlyph />
        </button>
      )}
    </>
  );
}

/** VIS-KEYPAD-2: the key block's largest width. */
const KEY_BLOCK_MAX = 835;

/** VIS-KEYPAD-39: the ABC key's font steps below 490, 420 and 380 px. */
function abcSize(width: number): string | undefined {
  if (width < 380) return "xs";
  if (width < 420) return "s";
  if (width < 490) return "m";
  return undefined;
}

/** VIS-KEYPAD-26: the popover's 24 by 12 arrow, its tip on the Functions key's cell. */
function FunctionsArrow(): JSX.Element {
  return (
    <svg
      className="kc-functions-arrow"
      width={24}
      height={13}
      viewBox="0 0 24 13"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 0.5L12 12.5L24 0.5" />
    </svg>
  );
}
