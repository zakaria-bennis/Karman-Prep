// @vitest-environment jsdom
import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi, type MockInstance } from "vitest";
import { createEngine, type CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { Geometry, RegionGeometry } from "@/lib/calculator/plot/geometry";
import {
  isDefaultViewport,
  resizeViewport,
  type PixelSize,
  type Viewport,
} from "@/lib/calculator/plot/viewport";
import { GraphRenderer } from "@/lib/calculator/render/renderer";
import type { RenderFrame, RenderRow } from "@/lib/calculator/render/types";
import { createMainThreadBackend, type ComputeBackend } from "@/lib/calculator/worker/backend";
import type { MainToWorker } from "@/lib/calculator/worker/protocol";
import { installDomStubs, triggerResize } from "../../__fixtures__/dom-stubs";
import { SkinContext } from "../hooks/skin";
import { EngineContext } from "../hooks/use-engine";
import { GraphPanel, type GraphPanelProps } from "./GraphPanel";

const vp = (l: number, r: number, b: number, t: number): Viewport => ({
  left: l,
  right: r,
  bottom: b,
  top: t,
});
const DEFAULT = vp(-10, 10, -7.5, 7.5);
const P = vp(-8, 12, -7.5, 7.5);
const SIZE: PixelSize = { width: 800, height: 600 };
const DEFAULT_NAME = "Graph from x=-10 to 10, y=-7.5 to 7.5, 0 plots";

/** All four bounds match to 9 digits. */
function expectViewport(actual: Viewport, expected: Viewport): void {
  expect(actual.left).toBeCloseTo(expected.left, 9);
  expect(actual.right).toBeCloseTo(expected.right, 9);
  expect(actual.bottom).toBeCloseTo(expected.bottom, 9);
  expect(actual.top).toBeCloseTo(expected.top, 9);
}

/**
 * The main-thread backend behind a gate: after hold(), posts queue until release() forwards them
 * in order and stops holding.
 */
function gatedBackend() {
  const inner = createMainThreadBackend();
  const queue: MainToWorker[] = [];
  let holding = false;
  const backend: ComputeBackend = {
    get kind() {
      return inner.kind;
    },
    post(message) {
      if (holding) queue.push(message);
      else inner.post(message);
    },
    onMessage: (listener) => inner.onMessage(listener),
    dispose: () => inner.dispose(),
  };
  return {
    backend,
    hold() {
      holding = true;
    },
    release() {
      holding = false;
      for (const message of queue.splice(0)) inner.post(message);
    },
  };
}

let restoreDom: () => void;
let gate: ReturnType<typeof gatedBackend>;
let engine: CalculatorEngine;
let renderSpy: MockInstance<GraphRenderer["render"]>;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  restoreDom = installDomStubs();
  gate = gatedBackend();
  engine = createEngine(undefined, {
    backend: gate.backend,
    scheduleFrame: (cb) => queueMicrotask(cb),
  });
  renderSpy = vi.spyOn(GraphRenderer.prototype, "render");
});

afterEach(() => {
  cleanup();
  engine.destroy();
  restoreDom();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mount(props: Partial<GraphPanelProps> = {}) {
  return render(
    <EngineContext.Provider value={engine}>
      <SkinContext.Provider value="white">
        <GraphPanel
          host={document.body}
          themeRevision={0}
          reducedMotion={false}
          settingsOpen={false}
          onOpenSettings={vi.fn()}
          {...props}
        />
      </SkinContext.Provider>
    </EngineContext.Provider>
  );
}

const layers = (): HTMLElement => document.querySelector<HTMLElement>("[data-graph-layers]")!;

/** Resizes the layers element, then advances one animation frame. */
async function size(width: number, height: number): Promise<void> {
  await act(async () => {
    triggerResize(layers(), { width, height });
    vi.advanceTimersToNextFrame();
  });
}

async function mountSized(props: Partial<GraphPanelProps> = {}) {
  const result = mount(props);
  await size(800, 600);
  return result;
}

const advance = (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms);
  });
const nextFrame = () =>
  act(async () => {
    vi.advanceTimersToNextFrame();
  });
const run = (change: () => void) =>
  act(async () => {
    change();
  });

const lastFrame = (): RenderFrame => renderSpy.mock.lastCall![0];
const rowOf = (id: string): RenderRow | undefined => lastFrame().rows.find((r) => r.rowId === id);
const regionOf = (id: string): RegionGeometry => {
  const geometry = rowOf(id)?.geometry;
  if (geometry?.kind !== "region") throw new Error(`row ${id} is not a drawn region`);
  return geometry;
};
const graphName = () => screen.getByRole("img").getAttribute("aria-label");

/**
 * Waits (vi.waitFor advances the fake timers on every check) until row `id` has geometry of
 * `kind` and the panel has drawn the current revision. Like Testing Library's own waitFor, it
 * turns the act environment off while it waits: the main-thread backend's results arrive in
 * MessageChannel tasks, outside any act scope.
 */
async function settle(id: string, kind: Geometry["kind"]): Promise<void> {
  const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previous = scope.IS_REACT_ACT_ENVIRONMENT;
  scope.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    await vi.waitFor(
      () => {
        const s = engine.getSnapshot();
        expect(s.geometry.get(id)?.kind).toBe(kind);
        expect(layers().getAttribute("data-rendered-revision")).toBe(String(s.revision));
      },
      { timeout: 10_000 }
    );
  } finally {
    scope.IS_REACT_ACT_ENVIRONMENT = previous;
  }
  await act(async () => {}); // commits anything the last results scheduled
}

it("G-5 a zero-size container keeps a finite viewport and skips rendering", async () => {
  await mountSized();
  await size(0, 0);
  expect(engine.getSnapshot().view?.size).toEqual(SIZE);

  await run(() => engine.setExpressions([{ id: "1", latex: "y=x" }]));
  await size(800, 600);
  await settle("1", "curve");
  const { viewport } = engine.getSnapshot();
  for (const bound of Object.values(viewport)) expect(Number.isFinite(bound)).toBe(true);
  expectViewport(viewport, DEFAULT);
  expect(lastFrame().rows.map((r) => r.rowId)).toEqual(["1"]);

  expect(renderSpy).toHaveBeenCalled();
  for (const [frame] of renderSpy.mock.calls) {
    expect(frame.view.size.width).toBeGreaterThan(0);
    expect(frame.view.size.height).toBeGreaterThan(0);
  }
});

it("G-5 resizes keep the default view default and other views' units per pixel", async () => {
  await mountSized();
  await size(400, 600);
  expectViewport(engine.getSnapshot().viewport, vp(-10, 10, -15, 15));

  await run(() => engine.setMathBounds(P));
  await size(800, 600);
  expectViewport(
    engine.getSnapshot().viewport,
    resizeViewport(P, { width: 400, height: 600 }, SIZE)
  );

  await run(() => engine.setBlank());
  expect(isDefaultViewport(engine.getSnapshot().viewport, SIZE)).toBe(true);

  await run(() => engine.setMathBounds(vp(-10, 10, -2, 2)));
  await nextFrame();
  expectViewport(engine.getSnapshot().viewport, vp(-10, 10, -2, 2));
  await size(400, 600);
  expectViewport(engine.getSnapshot().viewport, vp(-5, 5, -2, 2));
});

it("G-5 inequality shading follows a pan while the region is re-plotted", async () => {
  await mountSized();
  await run(() =>
    engine.setExpressions([
      { id: "1", latex: "y<1" },
      { id: "2", latex: "x=2" }, // a second plot (`3>2` draws nothing, as on Desmos: RC-14)
    ])
  );
  await settle("2", "lines");
  await settle("1", "region");
  const before = Array.from(regionOf("1").spans);
  expect(before.length).toBeGreaterThan(0);

  gate.hold();
  await run(() => engine.setMathBounds(P));
  expect(engine.getSnapshot().geometry.has("1")).toBe(false);

  await nextFrame();
  const after = Array.from(regionOf("1").spans);
  expect(after).toHaveLength(before.length);
  after.forEach((value, i) => {
    expect(value, `span value ${i}`).toBeCloseTo(i % 4 >= 2 ? before[i] - 80 : before[i], 3);
  });
  await advance(250);
  expect(graphName()).toMatch(/, 2 plots$/);

  await run(() => gate.release());
  await settle("1", "region");
  expect(rowOf("1")?.geometry).toBe(engine.getSnapshot().geometry.get("1"));
});

it("A11Y-1 the graph is one role img named from the view and plotted rows, renamed after 250 ms", async () => {
  await mountSized();
  await advance(250);
  expect(screen.getByRole("img")).toHaveAccessibleName(DEFAULT_NAME);

  await run(() =>
    engine.setExpressions([
      { id: "1", latex: "y=x" },
      { id: "2", latex: "y=x^{2}" },
      { id: "3", latex: "2+3" },
    ])
  );
  await advance(250);
  expect(graphName()).toMatch(/, 2 plots$/);

  const named = graphName();
  await run(() => engine.setMathBounds(P));
  await advance(100);
  expect(graphName()).toBe(named);
  await advance(150);
  expect(graphName()).toBe("Graph from x=-8 to 12, y=-7.5 to 7.5, 2 plots");
});

it("A11Y-1 a continuous pan renames the graph within 500 ms, before the pan stops", async () => {
  await mountSized();
  await advance(250);
  expect(graphName()).toBe(DEFAULT_NAME);

  for (let i = 1; i <= 20; i++) {
    await run(() => engine.setMathBounds(vp(-10 + i / 10, 10 + i / 10, -7.5, 7.5)));
    await advance(50);
    if (i >= 10) expect(graphName(), `${i * 50} ms after the first pan`).not.toBe(DEFAULT_NAME);
  }
  await advance(250);
  expect(graphName()).toBe("Graph from x=-8 to 12, y=-7.5 to 7.5, 0 plots");
});

const graph = (): HTMLElement => screen.getByRole("img");
const panel = (): HTMLElement => document.querySelector<HTMLElement>("[data-graph-panel]")!;
const button = (name: string): HTMLElement => screen.getByRole("button", { name });
const click = (name: string) => run(() => fireEvent.click(button(name)));
const WHEEL = { deltaY: -100, deltaMode: 0, clientX: 400, clientY: 300 };

it("G-5 graph controls: Zoom in and out by 2 about the centre, Home restores the default", async () => {
  const onOpenSettings = vi.fn();
  await mountSized({ settingsOpen: true, onOpenSettings });
  const group = screen.getByRole("group", { name: "Graph controls" });
  expect(
    within(group)
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label"))
  ).toEqual(["Graph settings", "Zoom in", "Zoom out"]);

  const settings = button("Graph settings");
  expect(settings).toHaveAttribute("aria-expanded", "true");
  await click("Graph settings");
  expect(onOpenSettings).toHaveBeenCalledWith(settings);

  // GP-46: the view moves over 7 frames, a tenth of the way after the first.
  const settle = async () => {
    for (let i = 0; i < 7; i++) await nextFrame();
  };
  await click("Zoom in");
  expect(engine.getSnapshot().viewport).toEqual(DEFAULT);
  await nextFrame();
  expectViewport(engine.getSnapshot().viewport, vp(-9.5, 9.5, -7.125, 7.125));
  await settle();
  expect(engine.getSnapshot().viewport).toEqual(vp(-5, 5, -3.75, 3.75));
  // A click during an animation builds on its target.
  await click("Zoom out");
  await nextFrame();
  await click("Zoom out");
  await settle();
  expectViewport(engine.getSnapshot().viewport, vp(-20, 20, -15, 15));

  await run(() => engine.setMathBounds(P));
  await click("Zoom in");
  await settle();
  expectViewport(engine.getSnapshot().viewport, vp(-3, 7, -3.75, 3.75));

  await click("Home");
  await settle();
  expectViewport(engine.getSnapshot().viewport, DEFAULT);
});

it("GP-46 another change of the view stops a zoom animation where it is", async () => {
  await mountSized();
  await click("Zoom in");
  await nextFrame();
  await run(() => fireEvent.keyDown(graph(), { key: "ArrowRight" }));
  const moved = engine.getSnapshot().viewport;
  for (let i = 0; i < 7; i++) await nextFrame();
  expect(engine.getSnapshot().viewport).toEqual(moved);
});

it("GP-46 with reduced motion the zoom buttons apply at once", async () => {
  await mountSized({ reducedMotion: true });
  await click("Zoom in");
  expect(engine.getSnapshot().viewport).toEqual(vp(-5, 5, -3.75, 3.75));
});

it("AN-8 Home shows only off the default view and hands focus to the graph as it leaves", async () => {
  await mountSized({ reducedMotion: true });
  expect(screen.queryByRole("button", { name: "Home" })).toBeNull();

  await run(() => fireEvent.keyDown(graph(), { key: "ArrowRight" }));
  const home = button("Home");

  await run(() => {
    home.focus();
    fireEvent.click(home);
  });
  expect(screen.queryByRole("button", { name: "Home" })).toBeNull();
  expect(document.activeElement).toBe(graph());

  await run(() => fireEvent.keyDown(graph(), { key: "ArrowRight" }));
  await run(() => button("Home").focus());
  // A re-render that keeps the view off the default leaves focus on Home and never moves it away,
  // even for a moment that React's commit would hide by restoring focus.
  const graphFocus = vi.fn();
  graph().addEventListener("focus", graphFocus);
  await advance(250);
  await run(() => engine.setExpressions([{ id: "1", latex: "y=x" }]));
  graph().removeEventListener("focus", graphFocus);
  expect(graphFocus).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(button("Home"));
  await run(() => engine.setMathBounds(DEFAULT));
  expect(screen.queryByRole("button", { name: "Home" })).toBeNull();
  expect(document.activeElement).toBe(graph());
});

it("KB-8 the graph surface is the panel's one focusable graph element and handles the graph keys", async () => {
  await mountSized();
  expect(graph()).toHaveAttribute("tabindex", "0");
  expect(document.querySelectorAll("[data-graph-panel] [tabindex]:not(button)")).toHaveLength(1);

  const right = createEvent.keyDown(graph(), { key: "ArrowRight" });
  await run(() => fireEvent(graph(), right));
  expect(right.defaultPrevented).toBe(true);
  expectViewport(engine.getSnapshot().viewport, P);

  const zoom = createEvent.keyDown(graph(), { key: "=", ctrlKey: true });
  await run(() => fireEvent(graph(), zoom));
  expect(zoom.defaultPrevented).toBe(false);
  expect(engine.getSnapshot().viewport.left).toBeCloseTo(-8, 9);

  const home = createEvent.keyDown(graph(), { key: "Home" });
  await run(() => fireEvent(graph(), home));
  expect(home.defaultPrevented).toBe(true);
  expectViewport(engine.getSnapshot().viewport, DEFAULT);
});

it("G-5 unmounting GraphPanel destroys the renderer and leaves no timer or frame", async () => {
  const destroySpy = vi.spyOn(GraphRenderer.prototype, "destroy");
  const { unmount } = await mountSized();
  await run(() => engine.setMathBounds(P));
  unmount();
  expect(destroySpy).toHaveBeenCalledTimes(1);
  engine.destroy();
  expect(vi.getTimerCount()).toBe(0);
});

it("GP-48 only the first wheel event of a frame zooms, by one fixed step", async () => {
  await mountSized();
  await act(async () => {
    expect(fireEvent.wheel(panel(), WHEEL)).toBe(false);
    expect(fireEvent.wheel(panel(), WHEEL)).toBe(false);
    expectViewport(engine.getSnapshot().viewport, DEFAULT);
  });
  await nextFrame();
  const k = 17 / 16;
  const { viewport } = engine.getSnapshot();
  expectViewport(viewport, vp(-10 / k, 10 / k, -7.5 / k, 7.5 / k));
  expect(viewport.right - viewport.left).toBeCloseTo(20 / k, 9);
});

it("G-5 a graph key while a wheel frame is pending keeps both changes", async () => {
  await mountSized();
  await run(() => {
    fireEvent.wheel(panel(), WHEEL);
  });
  await run(() => fireEvent.keyDown(graph(), { key: "ArrowRight" }));
  const k = 17 / 16;
  const expected = vp(-8 / k, 12 / k, -7.5 / k, 7.5 / k);
  expectViewport(engine.getSnapshot().viewport, expected);
  await nextFrame();
  expectViewport(engine.getSnapshot().viewport, expected);
});

it("SETTINGS-7, SETTINGS-20 a locked viewport drops Zoom and Home and ignores keys and the wheel", async () => {
  await mountSized({ reducedMotion: true });
  await run(() => fireEvent.keyDown(graph(), { key: "ArrowRight" }));
  expect(button("Home")).toBeInTheDocument();
  const moved = engine.getSnapshot().viewport;
  await run(() => engine.updateSettings({ lockViewport: true }));
  expect(screen.queryByRole("group", { name: "Zoom" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Home" })).toBeNull();
  await run(() => fireEvent.keyDown(graph(), { key: "ArrowRight" }));
  await act(async () => {
    fireEvent.wheel(panel(), WHEEL);
  });
  await nextFrame();
  expect(engine.getSnapshot().viewport).toEqual(moved);
  // The API still moves a locked view.
  await run(() => engine.setMathBounds(DEFAULT));
  expectViewport(engine.getSnapshot().viewport, DEFAULT);
});
