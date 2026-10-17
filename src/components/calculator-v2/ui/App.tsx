// The calculator's React root inside the shadow root (01-interfaces-integration.md section 12).
// App provides the five contexts every v2 component reads (engine, focus, Escape layers,
// announcer, skin) and renders the calculator region. The skin and the layout come from the shell
// store, so a TH-15 or AR-29 change re-renders without touching the engine. App holds the
// settings popover's anchor and composes CalculatorLayout from the engine snapshot and the shell
// store; 13 wraps it in CalculatorChrome, which portals into chromeSlot.

import { useCallback, useRef, useState, useSyncExternalStore, type JSX } from "react";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import { AnnouncerContext, type Announcer } from "./a11y/announcer";
import type { ShellStore } from "./controller/shell-store";
import { EscapeContext, type EscapeStack } from "./focus/escape-stack";
import { FocusContext, type FocusController } from "./focus/focus-controller";
import { SkinContext } from "./hooks/skin";
import { EngineContext, useEngineSnapshot } from "./hooks/use-engine";
import { CalculatorLayout } from "./layout/CalculatorLayout";

export interface AppProps {
  engine: CalculatorEngine;
  host: HTMLElement;
  store: ShellStore; // 13's CalculatorChrome reads ShellState.pointer
  focus: FocusController;
  escape: EscapeStack;
  announcer: Announcer;
  chromeSlot: HTMLElement | null; // HostHooks.chromeSlot; read by 13's portal
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
