// The keypad (01-interfaces-integration.md section 11 and 09's Row DOM): a region named "Keypad"
// with a Hide keypad bar and the key groups of keypadLayout() for the page, width, pointer and
// Shift (the K-1 tray, the K-3 letters pages, the K-6 phone keypad), and a Show keypad control
// while closed. A closed keypad stays mounted, hidden from assistive technology and inert, so the
// AN-1 slide has something to move. The audio key starts and stops the keyboard trace (K-9, POI-20). Insert and Enter
// keys act through pressKey without taking focus from the row (K-10); arrows and Backspace repeat
// while held (K-11); a pressed key carries data-pressed for its tone (AN-11). The Functions key
// opens the Functions panel (K-4, K-5): a panel button inserts its template into the keypad's row
// in one run call, closes the panel and returns focus to the row.

import {
  ArrowBigUp,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CornerDownLeft,
  Delete,
  Keyboard,
  Volume2,
  type LucideIcon,
} from "lucide-react";
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
import type { PanelEntry } from "@/lib/calculator-v2/core/latex/operator-names";
import { AnnouncerContext } from "../a11y/announcer";
import { EscapeContext, type EscapeStack } from "../focus/escape-stack";
import { FocusContext } from "../focus/focus-controller";
import { KeyboardTraceContext } from "../graph/keyboard-trace";
import { useEngine } from "../hooks/use-engine";
import { editThroughKeypad } from "../list/row-actions";
import { MotionContext } from "../list/motion";
import { keypadTarget, pressKey, type KeyContext } from "./apply-key";
import { createDoubleTapTracker } from "./double-tap";
import { FunctionsPanel, functionsPlacement } from "./FunctionsPanel";
import { createKeyRepeat } from "./key-repeat";
import { keypadLayout, type KeyDef, type KeyIcon, type KeypadLayout } from "./keys";

export interface KeypadProps {
  containerWidth: number; // < 600 uses the K-6 phone keypad
  pointer: "fine" | "coarse";
  open: boolean;
  onOpenChange(open: boolean, by: "student" | "system"): void;
}

const KEY_ICONS: Record<KeyIcon, LucideIcon> = {
  ArrowLeft,
  ArrowRight,
  Delete,
  CornerDownLeft,
  ArrowBigUp,
  Volume2,
};

// The installed @types/react (18) has no `inert` prop; React 19 renders it as a boolean attribute.
const INERT: object = { inert: true };

/** The letter keys a to z: under Shift they type the capital, then Shift turns off (K-3). */
const LETTER_KEY = /^[a-z]$/;

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
  tracing: boolean
): ButtonHTMLAttributes<HTMLButtonElement> {
  switch (key.behaviour.type) {
    case "letters":
      return { "aria-pressed": page === "letters" };
    case "shift":
      return { "aria-pressed": shift };
    case "functions":
      return { "aria-expanded": functionsOpen, "aria-controls": functionsPanelId };
    case "audio":
      return { "aria-pressed": tracing, title: key.name };
    default:
      return {};
  }
}

const noSubscribe = () => () => undefined;

export function Keypad(props: KeypadProps): JSX.Element {
  const { containerWidth, pointer, open, onOpenChange } = props;
  const engine = useEngine();
  const focus = useContext(FocusContext);
  const announcer = useContext(AnnouncerContext);
  const trace = useContext(KeyboardTraceContext);
  const tracing =
    useSyncExternalStore(
      trace === null ? noSubscribe : (l) => trace.subscribe(l),
      () => trace?.state ?? null
    ) !== null;
  const escape = useContext(EscapeContext);
  const readDuration = useContext(MotionContext);
  const [page, setPage] = useState<KeypadLayout["page"]>("main");
  const [shift, setShift] = useState(false);
  /** The key held by a pointer, drawn with its press tone (AN-11). */
  const [pressed, setPressed] = useState<string | null>(null);
  // One double-tap tracker (K-7) and one hold-to-repeat (K-11) per mount.
  const [doubleTap] = useState(() => createDoubleTapTracker(() => performance.now()));
  const [repeat] = useState(createKeyRepeat);
  /** Repeat keys whose pointer press already acted: the click that follows it is ignored. */
  const pointerPressed = useRef(new Set<string>());
  const functionsPanelId = useId();
  const [functionsState, setFunctionsState] = useState<FunctionsState>("closed");
  const sectionRef = useRef<HTMLElement>(null);
  const hideRef = useRef<HTMLButtonElement>(null);
  const showRef = useRef<HTMLButtonElement>(null);
  /** KB-13, WCAG 2.4.3: the control to focus once `open` commits, set when focus was on the
   *  control that unmounts (Show keypad) or inside the keypad that turns inert (Hide, Escape). */
  const focusAfter = useRef<"hide" | "show" | null>(null);
  const studentOpenChange = (next: boolean) => {
    const held = next ? holdsFocus(showRef.current) : holdsFocus(sectionRef.current);
    focusAfter.current = held ? (next ? "hide" : "show") : null;
    onOpenChange(next, "student");
  };
  useLayoutEffect(() => {
    const target = focusAfter.current;
    if (target === null || (target === "hide") !== open) return;
    focusAfter.current = null;
    (target === "hide" ? hideRef : showRef).current?.focus();
  }, [open]);

  // Closing the keypad resets the page and Shift, so it always reopens on the main page, and ends
  // a held key, whose pointerup an inert keypad never receives.
  useEffect(() => {
    if (open) return;
    repeat.stop();
    pointerPressed.current.clear();
    setPressed(null);
    setPage("main");
    setShift(false);
    setFunctionsState("closed");
  }, [open, repeat]);
  useEffect(() => () => repeat.stop(), [repeat]);
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

  const layout = keypadLayout(page, containerWidth, pointer, shift);
  const ctx: KeyContext = { engine, focus, announcer, doubleTap };

  /** K-5: one run call into the keypad's row, close the panel, then focus the row's field. */
  const insertFunction = (entry: PanelEntry) => {
    doubleTap.clear();
    const target = keypadTarget(focus, engine.getSnapshot());
    if (target !== null) {
      const { rowId, field } = target;
      editThroughKeypad(engine, announcer, rowId, field, (f) => f.run(entry.actions));
    }
    setFunctionsState("closing");
    target?.field.focus(); // the caret stays where the template put it
  };

  /** A key's action on click (mouse, touch and keyboard). */
  const activate = (key: KeyDef) => {
    switch (key.behaviour.type) {
      case "letters":
        setPage((p) => (p === "main" ? "letters" : "main"));
        return;
      case "shift":
        setShift((on) => !on);
        return;
      case "insert":
      case "enter":
        pressKey(ctx, key);
        if (LETTER_KEY.test(key.id)) setShift(false); // Shift capitalises the next letter only
        return;
      case "functions":
        setFunctionsState((state) => (state === "open" ? "closing" : "open"));
        return;
      case "audio": // K-9: the keyboard trace of the keypad's row (POI-20)
        trace?.toggle(keypadTarget(focus, engine.getSnapshot())?.rowId ?? null);
        return;
    }
  };
  const startPress = (event: PointerEvent<HTMLButtonElement>, key: KeyDef) => {
    if (event.button > 0) return; // the primary button, a touch or a pen contact
    setPressed(key.id);
    if (!key.repeat) return;
    pointerPressed.current.add(key.id);
    repeat.start(() => pressKey(ctx, key));
  };
  const endPress = (key: KeyDef) => {
    setPressed((id) => (id === key.id ? null : id));
    if (key.repeat) repeat.stop();
  };
  const click = (key: KeyDef) => {
    if (pointerPressed.current.delete(key.id)) return;
    activate(key);
  };

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
        data-layout={layout.id}
        data-pointer={pointer}
        data-page={page}
      >
        <div className="kc-keypad-bar">
          <button
            ref={hideRef}
            type="button"
            aria-label="Hide keypad"
            onClick={() => studentOpenChange(false)}
          >
            <ChevronDown aria-hidden="true" focusable="false" size={20} />
          </button>
        </div>
        {layout.groups.map((group) => (
          <div
            key={group.id}
            role="group"
            data-group={group.id}
            style={{ "--kc-columns": group.columns } as CSSProperties}
          >
            {group.rows.flat().map((key) => {
              const Icon = key.icon === undefined ? null : KEY_ICONS[key.icon];
              return (
                <button
                  key={key.id}
                  type="button"
                  className="kc-key"
                  aria-label={key.name}
                  data-key={key.id}
                  data-tone={key.tone}
                  data-pressed={pressed === key.id ? "true" : undefined}
                  style={{ gridColumn: `span ${key.span}` }}
                  {...keyState(
                    key,
                    page,
                    shift,
                    functionsPanelId,
                    functionsState === "open",
                    tracing
                  )}
                  onMouseDown={keepFocus}
                  onPointerDown={(event) => startPress(event, key)}
                  onPointerUp={() => endPress(key)}
                  onPointerCancel={() => endPress(key)}
                  onPointerLeave={() => endPress(key)}
                  // A pointer press that ended off the key leaves no click; a keyboard press acts.
                  onKeyDown={() => pointerPressed.current.delete(key.id)}
                  onClick={() => click(key)}
                >
                  {Icon === null ? (
                    key.label
                  ) : (
                    <Icon aria-hidden="true" focusable="false" size={20} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
        {functionsState !== "closed" && (
          <FunctionsPanel
            id={functionsPanelId}
            placement={functionsPlacement(containerWidth)}
            state={functionsState}
            onInsert={insertFunction}
          />
        )}
      </section>
      {!open && (
        <button
          ref={showRef}
          type="button"
          className="kc-show-keypad"
          aria-label="Show keypad"
          data-layout={layout.id}
          data-pointer={pointer}
          onClick={() => studentOpenChange(true)}
        >
          <Keyboard aria-hidden="true" focusable="false" size={20} />
        </button>
      )}
    </>
  );
}
