// The calculator's React root inside the shadow root (01-interfaces-integration.md section 12).
// App provides the five contexts every v2 component reads (engine, focus, Escape layers,
// announcer, skin) and renders the calculator region. The skin and the layout come from the shell
// store, so a TH-15 or AR-29 change re-renders without touching the engine. Task 4 composes
// CalculatorLayout inside the region; 13 wraps it in CalculatorChrome, which portals into
// chromeSlot.

import { useSyncExternalStore, type JSX } from "react";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import { AnnouncerContext, type Announcer } from "./a11y/announcer";
import type { ShellStore } from "./controller/shell-store";
import { EscapeContext, type EscapeStack } from "./focus/escape-stack";
import { FocusContext, type FocusController } from "./focus/focus-controller";
import { SkinContext } from "./hooks/skin";
import { EngineContext } from "./hooks/use-engine";

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
  const { engine, store, focus, escape, announcer } = props;
  const shell = useSyncExternalStore(store.subscribe, store.get, store.get);
  return (
    <EngineContext.Provider value={engine}>
      <FocusContext.Provider value={focus}>
        <EscapeContext.Provider value={escape}>
          <AnnouncerContext.Provider value={announcer}>
            <SkinContext.Provider value={shell.skin}>
              <section
                className="kc-app"
                role="region"
                aria-label="Graphing calculator"
                data-kc-layout={shell.layout}
              />
            </SkinContext.Provider>
          </AnnouncerContext.Provider>
        </EscapeContext.Provider>
      </FocusContext.Provider>
    </EngineContext.Provider>
  );
}
