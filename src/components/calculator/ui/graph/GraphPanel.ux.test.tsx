// @vitest-environment jsdom
// Owner decisions of 2026-10-21 in the panel: Zoom to fit under Home, the view centred above a
// phone keypad, Desmos's wheel (deltaX, origin snap) and the one-time curve hint.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createTestEngine,
  type TestEngine,
} from "@/lib/calculator/core/api/__fixtures__/test-engine";
import type { Geometry } from "@/lib/calculator/plot/geometry";
import type { Viewport } from "@/lib/calculator/plot/viewport";
import { installDomStubs, triggerResize } from "../../__fixtures__/dom-stubs";
import { SkinContext } from "../hooks/skin";
import { EngineContext } from "../hooks/use-engine";
import { HINT_MS, HINT_STORAGE_KEY, HINT_TEXT, resetCurveHintForTests } from "./curve-hint";
import { GraphPanel, type GraphPanelProps } from "./GraphPanel";

let restoreDom: () => void;
let t: TestEngine;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  restoreDom = installDomStubs();
  t = createTestEngine();
  resetCurveHintForTests();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  t.engine.destroy();
  restoreDom();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function flush(): Promise<void> {
  await act(async () => t.flushFrames());
  await act(async () => {
    vi.advanceTimersToNextFrame();
  });
}

function line(rowId: string): Geometry {
  const coords: number[] = [];
  for (let x = -10; x <= 10; x += 0.05) coords.push(x, x + 1);
  return {
    kind: "curve",
    rowId,
    evaluations: 0,
    polylines: new Float64Array(coords),
    bands: new Float64Array(0),
    dashed: false,
  };
}
const point = (rowId: string, x: number, y: number): Geometry => ({
  kind: "points",
  rowId,
  evaluations: 0,
  coords: new Float64Array([x, y]),
});

const base: GraphPanelProps = {
  host: document.body,
  themeRevision: 0,
  reducedMotion: true,
  settingsOpen: false,
  onOpenSettings: () => undefined,
};

function panelTree(props: Partial<GraphPanelProps>) {
  return (
    <EngineContext.Provider value={t.engine}>
      <SkinContext.Provider value="classic">
        <GraphPanel {...base} {...props} />
      </SkinContext.Provider>
    </EngineContext.Provider>
  );
}

async function mount(props: Partial<GraphPanelProps> = {}) {
  const view = render(panelTree(props));
  await act(async () => {
    triggerResize(document.querySelector<HTMLElement>("[data-graph-layers]")!, {
      width: 800,
      height: 600,
    });
    vi.advanceTimersToNextFrame();
  });
  return view;
}

/** Plots y=x+1 as row c and the points (1, 2) and (3, −2) as rows p and q. */
async function plot(): Promise<void> {
  const generation = t.latestGeneration();
  t.emit({ v: 1, type: "plot", generation, rowId: "c", geometry: line("c") });
  t.emit({ v: 1, type: "plot", generation, rowId: "p", geometry: point("p", 1, 2) });
  t.emit({ v: 1, type: "plot", generation, rowId: "q", geometry: point("q", 3, -2) });
  t.emit({ v: 1, type: "done", generation });
  await flush();
}

const rows = [
  { id: "c", latex: "y=x+1" },
  { id: "p", latex: "(1,2)" },
  { id: "q", latex: "(3,-2)" },
];
const viewport = () => t.engine.getSnapshot().viewport;
function expectViewport(actual: Viewport, expected: Viewport): void {
  expect(actual.left).toBeCloseTo(expected.left, 6);
  expect(actual.right).toBeCloseTo(expected.right, 6);
  expect(actual.bottom).toBeCloseTo(expected.bottom, 6);
  expect(actual.top).toBeCloseTo(expected.top, 6);
}
const fitButton = () => screen.queryByRole("button", { name: "Zoom to fit" });
const homeButton = () => screen.queryByRole("button", { name: "Home" });

it("Zoom to fit shows only with something graphed, under Home, and fits every key point at the same x:y scale", async () => {
  t.engine.setExpressions(rows);
  await mount();
  expect(fitButton()).toBeNull();
  await plot();
  const fit = fitButton()!;
  expect(fit.getAttribute("title")).toBe("Zoom to fit");
  await act(async () => fit.click());
  // Key points: y=x+1's zero (−1, 0) and intercept (0, 1), and the points (1, 2) and (3, −2).
  // x −1…3 and y −2…2 with 10% margins on an 800 by 600 graph: y decides, 5 units per 600 px.
  expectViewport(viewport(), { left: -7 / 3, right: 13 / 3, bottom: -2.5, top: 2.5 });
  const controls = [...document.querySelectorAll(".kc-graph-controls > button")];
  expect(controls.at(-1)).toBe(fitButton());
  expect(controls.at(-2)).toBe(homeButton());
});

it("Zoom to fit is gone while the viewport is locked", async () => {
  t.engine.setExpressions(rows);
  t.engine.updateSettings({ lockViewport: true });
  await mount();
  await plot();
  expect(fitButton()).toBeNull();
});

it("a phone keypad over the graph raises the view's centre to the middle of the visible part, and closing restores it", async () => {
  t.engine.setExpressions(rows);
  const view = await mount();
  view.rerender(panelTree({ keypadInset: 200 }));
  await flush();
  // 100 px up at 40 px a unit: the view moves 2.5 down; Home counts this as home.
  expectViewport(viewport(), { left: -10, right: 10, bottom: -10, top: 5 });
  expect(homeButton()).toBeNull();
  view.rerender(panelTree({ keypadInset: 0 }));
  await flush();
  expectViewport(viewport(), { left: -10, right: 10, bottom: -7.5, top: 7.5 });
  expect(homeButton()).toBeNull();
});

it("Home with a phone keypad open goes to the default view raised above it", async () => {
  t.engine.setExpressions(rows);
  const view = await mount({ keypadInset: 200 });
  await flush();
  t.engine.setMathBounds({ left: 0, right: 4, bottom: 0, top: 3 });
  view.rerender(panelTree({ keypadInset: 200 }));
  await flush();
  await act(async () => homeButton()!.click());
  expectViewport(viewport(), { left: -10, right: 10, bottom: -10, top: 5 });
});

it("the wheel zooms on deltaX when deltaY is 0, and a zoom in near the origin anchors on it (live Desmos)", async () => {
  await mount();
  const panel = document.querySelector<HTMLElement>("[data-graph-panel]")!;
  // deltaX alone zooms out by 17/16 about the pointer (600, 100) = world (5, 5).
  fireEvent.wheel(panel, { deltaX: 100, deltaY: 0, clientX: 600, clientY: 100 });
  await flush();
  expect(viewport().right - viewport().left).toBeCloseTo(20 * (17 / 16), 9);
  expect(viewport().left).toBeCloseTo(5 - 15 * (17 / 16), 9);
  t.engine.setMathBounds({ left: -10, right: 10, bottom: -7.5, top: 7.5 });
  await flush();
  // In, 30 px right and 20 px up of the origin (400, 300): about the origin itself.
  fireEvent.wheel(panel, { deltaY: -100, clientX: 430, clientY: 280 });
  await flush();
  expect(viewport().left).toBeCloseTo(-10 * (16 / 17), 9);
  expect(viewport().top).toBeCloseTo(7.5 * (16 / 17), 9);
});

/** A student types y=x+1 into row c; it plots. */
async function studentGraphs(): Promise<void> {
  t.engine.setExpressions([{ id: "c", latex: "" }]);
  await flush();
  act(() => void t.engine.editRow("c", "y=x+1", "typing"));
  await flush();
  const generation = t.latestGeneration();
  t.emit({ v: 1, type: "plot", generation, rowId: "c", geometry: line("c") });
  t.emit({ v: 1, type: "done", generation });
  await flush();
}
const hint = () => document.querySelector("[data-curve-hint]")?.textContent ?? null;

it("the curve hint shows once, the first time a student graphs a curve, and leaves after 6 s", async () => {
  await mount({ pointer: "coarse" });
  expect(hint()).toBeNull();
  await studentGraphs();
  expect(hint()).toBe(HINT_TEXT.coarse);
  expect(localStorage.getItem(HINT_STORAGE_KEY)).toBe("1");
  await act(async () => vi.advanceTimersByTime(HINT_MS));
  expect(hint()).toBeNull();
});

it("the curve hint never shows for a preset graph, nor again once seen", async () => {
  t.engine.setExpressions(rows);
  await mount();
  await plot();
  expect(hint()).toBeNull();
  cleanup();
  localStorage.setItem(HINT_STORAGE_KEY, "1");
  await mount();
  await studentGraphs();
  expect(hint()).toBeNull();
});

it("the curve hint goes on any press outside the keypad and the math", async () => {
  await mount({ pointer: "coarse" });
  await studentGraphs();
  expect(hint()).not.toBeNull();
  fireEvent.pointerDown(document.querySelector("[data-graph-panel]")!, { pointerId: 1 });
  expect(hint()).toBeNull();
});

it("with storage blocked the curve hint shows at most once a page load", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  await mount();
  await studentGraphs();
  expect(hint()).not.toBeNull();
  cleanup();
  await mount();
  await studentGraphs();
  expect(hint()).toBeNull();
});
