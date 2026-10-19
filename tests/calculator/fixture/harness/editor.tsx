// Editor harness page, /harness/editor.html: mounts the ExpressionPanel, Keypad and
// SettingsPopover around a stand-in graph in one shadow root, with the real MathField, announcer,
// focus controller and Escape stack. Query parameters: rows (URL-encoded JSON string[], ids
// "1"…"n"), layout (desktop | stacked), pointer (fine | coarse), width (container px), keypad=open
// and skin. editor.spec.ts drives the engine through globalThis.__calculatorHarness and counts the
// stand-in graph's resizes on globalThis.__editorHarness.

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import keypadCss from "@/components/calculator/styles/keypad.css?inline";
import listCss from "@/components/calculator/styles/list.css?inline";
import settingsCss from "@/components/calculator/styles/settings.css?inline";
import tokensCss from "@/components/calculator/styles/tokens.css?inline";
import {
  AnnouncerContext,
  LiveRegion,
  createAnnouncer,
  type Announcer,
} from "@/components/calculator/ui/a11y/announcer";
import { EscapeContext, createEscapeStack } from "@/components/calculator/ui/focus/escape-stack";
import {
  FocusContext,
  createFocusController,
} from "@/components/calculator/ui/focus/focus-controller";
import { EngineContext, useEngineSnapshot } from "@/components/calculator/ui/hooks/use-engine";
import { Keypad } from "@/components/calculator/ui/keypad/Keypad";
import { ExpressionPanel } from "@/components/calculator/ui/list/ExpressionPanel";
import { SettingsPopover } from "@/components/calculator/ui/settings/SettingsPopover";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { SKIN_IDS, type SkinId } from "@/lib/calculator/theme/skins";
import mathquillCss from "../../../../vendor/mathquill/mathquill.css?inline";
import { mountHarness } from "./harness-kit";

export interface EditorQuery {
  rows: string[] | null; // null: keep the engine's blank row
  layout: "desktop" | "stacked";
  pointer: "fine" | "coarse";
  width: number;
  keypadOpen: boolean;
  skin: SkinId;
}

declare global {
  var __editorHarness: { graphResizes: number } | undefined;
}

const DEFAULT_WIDTH = 900;

export function readEditorQuery(search: string, coarsePointer: boolean): EditorQuery {
  const params = new URLSearchParams(search);
  const rows = params.get("rows");
  const pointer = params.get("pointer");
  const width = params.get("width");
  const skin = params.get("skin");
  return {
    rows: rows === null ? null : (JSON.parse(rows) as string[]),
    layout: params.get("layout") === "stacked" ? "stacked" : "desktop",
    pointer:
      pointer === "fine" || pointer === "coarse" ? pointer : coarsePointer ? "coarse" : "fine",
    width: width === null ? DEFAULT_WIDTH : Number(width),
    keypadOpen: params.get("keypad") === "open",
    skin:
      skin !== null && (SKIN_IDS as readonly string[]).includes(skin) ? (skin as SkinId) : "ivory",
  };
}

export function EditorHarness(props: {
  engine: CalculatorEngine;
  query: EditorQuery;
}): JSX.Element {
  const { engine, query } = props;
  const [announcer, setAnnouncer] = useState<Announcer | null>(null);
  const focus = useMemo(() => createFocusController(engine), [engine]);
  const escape = useMemo(() => createEscapeStack(), []);
  const [open, setOpen] = useState(query.keypadOpen);
  useEffect(() => () => announcer?.destroy(), [announcer]);
  return (
    <EngineContext.Provider value={engine}>
      <FocusContext.Provider value={focus}>
        <EscapeContext.Provider value={escape}>
          <LiveRegion onReady={(region) => setAnnouncer(createAnnouncer(region))} />
          {announcer !== null && (
            <AnnouncerContext.Provider value={announcer}>
              <EditorFrame
                engine={engine}
                query={query}
                open={open}
                setOpen={setOpen}
                onEscape={() => escape.handleEscape()}
              />
            </AnnouncerContext.Provider>
          )}
        </EscapeContext.Provider>
      </FocusContext.Provider>
    </EngineContext.Provider>
  );
}

function EditorFrame(props: {
  engine: CalculatorEngine;
  query: EditorQuery;
  open: boolean;
  setOpen(open: boolean): void;
  onEscape(): boolean;
}): JSX.Element {
  const { engine, query, open, setOpen, onEscape } = props;
  const { settings } = useEngineSnapshot(engine);
  const frameRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const [settingsButton, setSettingsButton] = useState<HTMLButtonElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(query.width);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    const observer = new ResizeObserver(() => setContainerWidth(frame.clientWidth));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (graph === null) return;
    const observer = new ResizeObserver(() => {
      if (globalThis.__editorHarness) globalThis.__editorHarness.graphResizes += 1;
    });
    observer.observe(graph);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      data-testid="editor-frame"
      style={{
        width: `${query.width}px`,
        height: "600px",
        display: "flex",
        flexDirection: "column",
        background: "var(--kc-paper)",
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && onEscape()) event.preventDefault();
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: query.layout === "desktop" ? "row" : "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: `0 0 ${settings.expressionsCollapsed ? "auto" : "40%"}`,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ExpressionPanel
            layout={query.layout}
            pointer={query.pointer}
            keypadOpen={open}
            onToggleKeypad={() => setOpen(!open)}
            onTouchFocusRow={() => setOpen(true)}
          />
        </div>
        <div
          ref={graphRef}
          data-testid="graph-stand-in"
          style={{ flex: 1, position: "relative", minWidth: 0, background: "var(--kc-paper)" }}
        >
          <button
            ref={setSettingsButton}
            type="button"
            aria-expanded={settingsOpen}
            style={{ position: "absolute", top: "8px", right: "8px" }}
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            Settings
          </button>
          <SettingsPopover
            anchor={settingsButton}
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      </div>
      <Keypad
        containerWidth={containerWidth}
        pointer={query.pointer}
        open={open}
        onOpenChange={(next) => setOpen(next)}
      />
    </div>
  );
}

globalThis.__editorHarness = { graphResizes: 0 };
const query = readEditorQuery(location.search, matchMedia("(any-pointer: coarse)").matches);
const { engine } = mountHarness({
  root: document.getElementById("root")!,
  css: [tokensCss, mathquillCss, listCss, keypadCss, settingsCss],
  skin: query.skin,
  render: (engine) => <EditorHarness engine={engine} query={query} />,
});
if (query.rows) engine.setExpressions(query.rows.map((latex, i) => ({ id: String(i + 1), latex })));
engine.clearHistory(); // before the first test step, so Undo starts disabled
