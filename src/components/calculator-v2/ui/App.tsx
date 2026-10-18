// The calculator's React root inside the shadow root (01-interfaces-integration.md section 12).
// App provides the five contexts every v2 component reads (engine, focus, Escape layers,
// announcer, skin) and renders the calculator region. The skin and the layout come from the shell
// store, so a TH-15 or AR-29 change re-renders without touching the engine. App holds the
// settings popover's anchor and composes CalculatorLayout from the engine snapshot and the shell
// store; 13 wraps it in CalculatorChrome, which portals into chromeSlot. App installs the shell
// keyboard (KB-3, KB-7) on the layout's root: shortcuts go through 09's row actions, so they insert,
// focus and announce exactly as the toolbar does (A11Y-2, NM-42). Every keypad change goes through
// the K-2 policy (reduceKeypad). The quiz setting reaches the stylesheet as the host's
// data-reduced-motion, and either it or the OS preference makes the graph's motion instant (AN-13).

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
} from "react";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import { AnnouncerContext, type Announcer } from "./a11y/announcer";
import { reduceKeypad, type KeypadEvent } from "./controller/keypad-policy";
import type { ShellStore } from "./controller/shell-store";
import { installShellKeyboard, type ShortcutAction } from "./controller/shortcuts";
import { EscapeContext, type EscapeStack } from "./focus/escape-stack";
import { FocusContext, type FocusController } from "./focus/focus-controller";
import { SkinContext } from "./hooks/skin";
import { EngineContext, useEngineSnapshot } from "./hooks/use-engine";
import { CalculatorLayout } from "./layout/CalculatorLayout";
import { insertRowBelow, performRedo, performUndo } from "./list/row-actions";

export interface AppProps {
  engine: CalculatorEngine;
  host: HTMLElement;
  store: ShellStore; // 13's CalculatorChrome reads ShellState.pointer
  focus: FocusController;
  escape: EscapeStack;
  announcer: Announcer;
  chromeSlot: HTMLElement | null; // HostHooks.chromeSlot; read by 13's portal
}

/**
 * KB-3 on WebKit: a click does not focus a button or checkbox, so focus falls from the calculator
 * to the light-DOM frame around it, and the next Escape would skip every open layer and close the
 * calculator. A click that leaves focus on an ancestor of the host (or on nothing) focuses the
 * clicked control, as Chromium and Firefox do on mousedown. Focus kept elsewhere is left alone.
 */
function focusClickedControl(event: MouseEvent): void {
  const root = event.currentTarget as HTMLElement;
  const target = event.target instanceof Element ? event.target : null;
  const control = target?.closest("button, input, select, textarea, [tabindex]");
  if (!(control instanceof HTMLElement) || !root.contains(control)) return;
  const shadow = root.getRootNode();
  if (!(shadow instanceof ShadowRoot)) return;
  const inside = shadow.activeElement;
  if (inside !== null && root.contains(inside)) return;
  const outside = root.ownerDocument.activeElement;
  if (outside !== null && !outside.contains(shadow.host)) return;
  control.focus({ preventScroll: true });
}

export function App(props: AppProps): JSX.Element {
  const { engine, host, store, focus, escape, announcer } = props;
  const snapshot = useEngineSnapshot(engine);
  const shell = useSyncExternalStore(store.subscribe, store.get, store.get);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const { settings } = snapshot;

  // AN-13: base.css and tokens.css zero every duration under :host([data-reduced-motion="true"]).
  useLayoutEffect(() => {
    host.dataset.reducedMotion = String(settings.reducedMotion);
  }, [host, settings.reducedMotion]);

  const toggleSettings = useCallback(
    (anchor: HTMLElement) => setSettingsAnchor((open) => (open === null ? anchor : null)),
    []
  );
  const closeSettings = useCallback(() => setSettingsAnchor(null), []);
  // K-2: every keypad change goes through the policy. studentClosed lives for this mount only, so
  // a student close does not carry into the next question (a new KarmanCalculator).
  const studentClosed = useRef(false);
  const keypadEvent = useCallback(
    (event: KeypadEvent) => {
      const open = engine.settings.keypad;
      const next = reduceKeypad({ open, studentClosed: studentClosed.current }, event);
      studentClosed.current = next.studentClosed;
      if (next.open !== open) engine.updateSettings({ keypad: next.open });
    },
    [engine]
  );
  const toggleKeypad = useCallback(
    () => keypadEvent({ type: "set", open: !engine.settings.keypad, by: "student" }), // Decision 3
    [engine, keypadEvent]
  );
  const changeKeypad = useCallback(
    (open: boolean, by: "student" | "system") => keypadEvent({ type: "set", open, by }),
    [keypadEvent]
  );
  const touchFocusRow = useCallback(() => keypadEvent({ type: "touch-focus-row" }), [keypadEvent]);

  // KB-7: the current shortcut handler, read through a ref so the listener installs once per stack.
  const latest = useRef<(action: ShortcutAction) => void>(() => {});
  latest.current = (action) => {
    switch (action) {
      case "undo":
        return performUndo(engine, announcer);
      case "redo":
        return performRedo(engine, announcer);
      case "toggle-keypad":
        return toggleKeypad(); // a student change (10 Decision 3)
      case "add-row-end":
        insertRowBelow(engine, focus, announcer, null, "focus"); // NM-42 on a refusal
    }
  };
  useEffect(() => {
    const root = rootRef.current!;
    const off = installShellKeyboard(root, {
      onShortcut: (a) => latest.current(a),
      onEscape: () => escape.handleEscape(),
    });
    root.addEventListener("click", focusClickedControl);
    return () => {
      off();
      root.removeEventListener("click", focusClickedControl);
    };
  }, [escape]);

  return (
    <EngineContext.Provider value={engine}>
      <FocusContext.Provider value={focus}>
        <EscapeContext.Provider value={escape}>
          <AnnouncerContext.Provider value={announcer}>
            <SkinContext.Provider value={shell.skin}>
              <CalculatorLayout
                layout={shell.layout}
                containerWidth={shell.size.width}
                pointer={shell.pointer}
                collapsed={settings.expressionsCollapsed}
                keypadOpen={settings.keypad}
                host={host}
                themeRevision={shell.themeRevision}
                reducedMotion={settings.reducedMotion || shell.reducedMotionMedia}
                settingsAnchor={settingsAnchor}
                revealRowId={snapshot.focusedRowId ?? snapshot.activeRowId}
                rootRef={rootRef}
                onOpenSettings={toggleSettings}
                onCloseSettings={closeSettings}
                onToggleKeypad={toggleKeypad}
                onKeypadChange={changeKeypad}
                onTouchFocusRow={touchFocusRow}
              />
            </SkinContext.Provider>
          </AnnouncerContext.Provider>
        </EscapeContext.Provider>
      </FocusContext.Provider>
    </EngineContext.Provider>
  );
}
