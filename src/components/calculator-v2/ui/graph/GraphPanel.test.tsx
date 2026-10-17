// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi, type MockInstance } from "vitest";
import { createEngine, type CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import type { Geometry, RegionGeometry } from "@/lib/calculator-v2/plot/geometry";
import {
  isDefaultViewport,
  resizeViewport,
  type PixelSize,
  type Viewport,
} from "@/lib/calculator-v2/plot/viewport";
import { GraphRenderer } from "@/lib/calculator-v2/render/renderer";
import type { RenderFrame, RenderRow } from "@/lib/calculator-v2/render/types";
import { createMainThreadBackend, type ComputeBackend } from "@/lib/calculator-v2/worker/backend";
import type { MainToWorker } from "@/lib/calculator-v2/worker/protocol";
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
      <SkinContext.Provider value="ivory">
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
      { id: "2", latex: "3>2" },
    ])
  );
  await settle("2", "region");
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
