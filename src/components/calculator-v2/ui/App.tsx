// The calculator's React root inside the shadow root (01-interfaces-integration.md section 12).
// App provides the five contexts every v2 component reads (engine, focus, Escape layers,
// announcer, skin) and renders the calculator region. The skin and the layout come from the shell
// store, so a TH-15 or AR-29 change re-renders without touching the engine. App holds the
// settings popover's anchor and composes CalculatorLayout from the engine snapshot and the shell
// store; 13 wraps it in CalculatorChrome, which portals into chromeSlot. App installs the shell
// keyboard (KB-3, KB-7) on the layout's root: shortcuts go through 09's row actions, so they insert,
// focus and announce exactly as the toolbar does (A11Y-2, NM-42).

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type JSX } from "react";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import { AnnouncerContext, type Announcer } from "./a11y/announcer";
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

  const toggleSettings = useCallback(
    (anchor: HTMLElement) => setSettingsAnchor((open) => (open === null ? anchor : null)),
    []
  );
  const closeSettings = useCallback(() => setSettingsAnchor(null), []);
  const toggleKeypad = useCallback(
    () => engine.updateSettings({ keypad: !engine.settings.keypad }),
    [engine]
  );
  const changeKeypad = useCallback(
    (keypad: boolean) => engine.updateSettings({ keypad }),
    [engine]
  );
  const touchFocusRow = useCallback(() => {}, []); // K-2 policy arrives in Task 10

  // KB-7: the current shortcut handler, read through a ref so the listener installs once per stack.
  const latest = useRef<(action: ShortcutAction) => void>(() => {});
  latest.current = (action) => {
    switch (action) {
      case "undo":
        return performUndo(engine, announcer);
      case "redo":
        return performRedo(engine, announcer);
      case "toggle-keypad":
        return toggleKeypad(); // Task 10 routes this through the policy
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
                reducedMotion={settings.reducedMotion}
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
