// The editor test kit: renders editor UI in
// jsdom with every 09 provider, a main-thread engine on a test-owned clock, recording fake
// MathFields and a recording announcer. Test-only.

import { render, screen } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { onTestFinished, vi } from "vitest";
import { createEngine, type CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { SkinId } from "@/lib/calculator/theme/skins";
import { createMainThreadBackend } from "@/lib/calculator/worker/backend";
import { installDomStubs } from "../../../__fixtures__/dom-stubs";
import { AnnouncerContext, type Announcer } from "../../a11y/announcer";
import { EscapeContext, createEscapeStack, type EscapeStack } from "../../focus/escape-stack";
import {
  FocusContext,
  createFocusController,
  type FocusController,
} from "../../focus/focus-controller";
import { SkinContext } from "../../hooks/skin";
import { KeyboardTrace, KeyboardTraceContext } from "../../graph/keyboard-trace";
import { EngineContext } from "../../hooks/use-engine";
import { MathFieldFactoryContext } from "../math-field-factory";
import { MotionContext } from "../motion";
import type { ExpressionPanelProps } from "../ExpressionPanel";
import { createFakeFieldFactory, type FakeFieldFactory } from "./fake-math-field";

export interface RecordingAnnouncer extends Announcer {
  readonly texts: string[];
}

export interface EditorKit {
  engine: CalculatorEngine;
  focus: FocusController;
  escape: EscapeStack;
  announcer: RecordingAnnouncer;
  fields: FakeFieldFactory;
  trace: KeyboardTrace; // POI-20, the keypad's audio key (K-9)
  clock: { now: number }; // the engine's deps.now; starts at 0
  pressEscape(): void;
}

/** Records the text of every announce call when it is made; cancel and destroy do nothing. */
function createRecordingAnnouncer(): RecordingAnnouncer {
  const texts: string[] = [];
  return {
    texts,
    announce(text) {
      texts.push(text);
    },
    cancel: () => undefined,
    destroy: () => undefined,
  };
}

export function renderEditor(
  ui: ReactNode,
  options: { rows?: string[]; skin?: SkinId; durationMs?: number } = {}
): EditorKit {
  const restoreStubs = installDomStubs();
  const clock = { now: 0 }; // only a test's assignment to clock.now moves it
  const engine = createEngine(undefined, {
    backend: createMainThreadBackend(),
    now: () => clock.now,
  });
  onTestFinished(() => {
    restoreStubs();
    engine.destroy();
  });
  if (options.rows !== undefined) {
    engine.setExpressions(options.rows.map((latex, i) => ({ id: String(i + 1), latex })));
  }
  engine.clearHistory();
  const wrapper = createRef<HTMLDivElement>();
  const escape = createEscapeStack();
  const focus = createFocusController(engine),
    announcer = createRecordingAnnouncer();
  const kit: EditorKit = {
    engine,
    focus,
    escape,
    announcer,
    trace: new KeyboardTrace({
      engine,
      announce: (text) => announcer.announce(text),
      focusRow: (rowId) => focus.focusRow(rowId, "end"),
    }),
    fields: createFakeFieldFactory(),
    clock,
    pressEscape() {
      const root = wrapper.current;
      if (root === null) throw new Error("renderEditor: the editor is not mounted");
      const active = document.activeElement;
      const target =
        active instanceof HTMLElement && active !== document.body && root.contains(active)
          ? active
          : root;
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
      );
    },
  };
  const durationMs = options.durationMs ?? 0;
  render(
    <EngineContext.Provider value={engine}>
      <SkinContext.Provider value={options.skin ?? "ivory"}>
        <FocusContext.Provider value={kit.focus}>
          <EscapeContext.Provider value={escape}>
            <AnnouncerContext.Provider value={kit.announcer}>
              <KeyboardTraceContext.Provider value={kit.trace}>
                <MathFieldFactoryContext.Provider value={kit.fields.factory}>
                  <MotionContext.Provider value={() => durationMs}>
                    <div
                      ref={wrapper}
                      onKeyDown={(event) => {
                        if (event.key === "Escape" && escape.handleEscape()) event.preventDefault();
                      }}
                    >
                      {ui}
                    </div>
                  </MotionContext.Provider>
                </MathFieldFactoryContext.Provider>
              </KeyboardTraceContext.Provider>
            </AnnouncerContext.Provider>
          </EscapeContext.Provider>
        </FocusContext.Provider>
      </SkinContext.Provider>
    </EngineContext.Provider>
  );
  return kit;
}

/** ExpressionPanel props for a desktop, fine-pointer list with the keypad closed; vi.fn() handlers. */
export function panelProps(overrides: Partial<ExpressionPanelProps> = {}): ExpressionPanelProps {
  return {
    layout: "desktop",
    pointer: "fine",
    keypadOpen: false,
    onToggleKeypad: vi.fn(),
    onTouchFocusRow: vi.fn(),
    ...overrides,
  };
}

/**
 * The row textbox named exactly `Expression n`. Testing Library's ByRoleOptions has no `exact`
 * (that is Playwright's option): a string `name` already matches the whole accessible name, so
 * `Expression 1` never finds `Expression 10`.
 */
export function textbox(n: number): HTMLElement {
  return screen.getByRole("textbox", { name: `Expression ${n}` });
}

/** The row's list item, li[data-row-id="<id>"]; throws when it is absent. */
export function rowItem(rowId: string): HTMLElement {
  const item = [...document.querySelectorAll<HTMLElement>("li[data-row-id]")].find(
    (li) => li.dataset.rowId === rowId
  );
  if (item === undefined) throw new Error(`No row item has data-row-id "${rowId}"`);
  return item;
}
