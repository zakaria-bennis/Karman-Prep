// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi, type MockInstance } from "vitest";
import {
  createTestEngine,
  type TestEngine,
} from "@/lib/calculator/core/api/__fixtures__/test-engine";
import type { Geometry } from "@/lib/calculator/plot/geometry";
import type { PoiPoint } from "@/lib/calculator/poi/types";
import { GraphRenderer } from "@/lib/calculator/render/renderer";
import type { RenderFrame } from "@/lib/calculator/render/types";
import { installDomStubs, triggerResize } from "../../__fixtures__/dom-stubs";
import { SkinContext } from "../hooks/skin";
import { EngineContext } from "../hooks/use-engine";
import { GraphPanel } from "./GraphPanel";

let restoreDom: () => void;
let t: TestEngine;
let renderSpy: MockInstance<GraphRenderer["render"]>;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  restoreDom = installDomStubs();
  t = createTestEngine();
  renderSpy = vi.spyOn(GraphRenderer.prototype, "render");
});

afterEach(() => {
  cleanup();
  t.engine.destroy();
  restoreDom();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const ROOT2 = Math.SQRT2;
// The default 800×600 view: px = (x + 10)·40, py = (7.5 − y)·40.
const px = (x: number) => (x + 10) * 40;
const py = (y: number) => (7.5 - y) * 40;
const POINTS: PoiPoint[] = [
  { x: -ROOT2, y: 0, kinds: ["zero"], withRowId: null },
  { x: 0, y: -2, kinds: ["y-intercept", "minimum"], withRowId: null },
  { x: ROOT2, y: 0, kinds: ["zero"], withRowId: null },
];

/** Delivers the engine's frame callbacks, then lets the panel commit and draw its next frame. */
async function flush(): Promise<void> {
  await act(async () => t.flushFrames());
  await act(async () => {
    vi.advanceTimersToNextFrame();
  });
}

function curve(rowId: string, f: (x: number) => number): Geometry {
  const coords: number[] = [];
  for (let x = -10; x <= 10; x += 0.05) coords.push(x, f(x));
  return {
    kind: "curve",
    rowId,
    evaluations: 0,
    polylines: new Float64Array(coords),
    bands: new Float64Array(0),
    dashed: false,
  };
}

/** Rows 1 (y=x²−2) and 2 (y=3), sized at 800×600, plotted, and row 1 selected with its points. */
async function setup(): Promise<void> {
  t.engine.setExpressions([
    { id: "1", latex: "y=x^{2}-2" },
    { id: "2", latex: "y=3" },
  ]);
  render(
    <EngineContext.Provider value={t.engine}>
      <SkinContext.Provider value="ivory">
        <GraphPanel
          host={document.body}
          themeRevision={0}
          reducedMotion={false}
          settingsOpen={false}
          onOpenSettings={vi.fn()}
        />
      </SkinContext.Provider>
    </EngineContext.Provider>
  );
  await act(async () => {
    triggerResize(document.querySelector<HTMLElement>("[data-graph-layers]")!, {
      width: 800,
      height: 600,
    });
    vi.advanceTimersToNextFrame();
  });
  const generation = t.latestGeneration();
  t.emit({ v: 1, type: "plot", generation, rowId: "1", geometry: curve("1", (x) => x * x - 2) });
  t.emit({ v: 1, type: "plot", generation, rowId: "2", geometry: curve("2", () => 3) });
  t.emit({ v: 1, type: "done", generation });
  await act(async () => t.engine.setSelectedRow("1"));
  t.emit({ v: 1, type: "poi", generation: t.latestGeneration(), rowId: "1", points: POINTS });
  await flush();
}

const panel = () => document.querySelector<HTMLElement>("[data-graph-panel]")!;
const labels = () => [...document.querySelectorAll("[data-poi-label]")].map((l) => l.textContent);
const lastFrame = (): RenderFrame => renderSpy.mock.lastCall![0];

async function tap(x: number, y: number, pointerType = "mouse"): Promise<void> {
  await act(async () => {
    fireEvent.pointerDown(panel(), {
      pointerId: 1,
      button: 0,
      clientX: x,
      clientY: y,
      pointerType,
    });
    fireEvent.pointerUp(panel(), { pointerId: 1, button: 0, clientX: x, clientY: y, pointerType });
  });
  await flush();
}

it("POI-13 clicking a dot of the selected curve opens its label and clicking it again closes only that label", async () => {
  await setup();
  expect(lastFrame().poi).toEqual(POINTS.map(({ x, y }) => ({ x, y, open: false })));
  await tap(px(ROOT2) + 5, py(0));
  expect(labels()).toEqual(["(1.41421, 0)"]);
  expect(lastFrame().poi?.filter((d) => d.open)).toEqual([{ x: ROOT2, y: 0, open: true }]);
  await tap(px(0), py(-2) - 3);
  expect(labels()).toEqual(["(1.41421, 0)", "(0, −2)"]);
  await tap(px(ROOT2), py(0));
  expect(labels()).toEqual(["(0, −2)"]);
});

it("POI-13 several labels stay open, and a click on an unselected curve's dot only selects that curve", async () => {
  await setup();
  await tap(px(-ROOT2), py(0));
  await tap(px(ROOT2), py(0));
  expect(labels()).toHaveLength(2);
  await tap(px(4), py(3) + 2); // row 2's line, away from any of row 1's points
  expect(t.engine.getSnapshot().selectedRowId).toBe("2");
  expect(labels()).toEqual([]);
  expect(lastFrame().rows.find((r) => r.rowId === "2")?.selected).toBe(true);
});

it("POI-13 empty paper closes every label and deselects; zoom buttons and panning close labels and keep the selection", async () => {
  await setup();
  await tap(px(ROOT2), py(0));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Zoom in" })));
  await flush();
  expect(labels()).toEqual([]);
  expect(t.engine.getSnapshot().selectedRowId).toBe("1");

  await tap(px(0), py(-2) / 2 + 150); // empty paper after the zoom
  expect(t.engine.getSnapshot().selectedRowId).toBeNull();
  expect(lastFrame().poi ?? []).toEqual([]);
});

it("POI-13 a drag that moves the paper is a pan, not a click, and closes labels", async () => {
  await setup();
  await tap(px(ROOT2), py(0));
  await act(async () => {
    fireEvent.pointerDown(panel(), {
      pointerId: 1,
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(panel(), {
      pointerId: 1,
      clientX: 140,
      clientY: 120,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(panel(), {
      pointerId: 1,
      button: 0,
      clientX: 140,
      clientY: 120,
      pointerType: "mouse",
    });
  });
  await flush();
  expect(labels()).toEqual([]);
  expect(t.engine.getSnapshot().selectedRowId).toBe("1");
});

it("POI-19 an open label is text reading the coordinates", async () => {
  await setup();
  await tap(px(0), py(-2));
  const label = screen.getByText("(0, −2)");
  expect(label.closest("[aria-hidden]")).toBeNull();
  expect(label.getAttribute("role")).toBe("note");
});

async function drag(
  points: [number, number][],
  pointerType = "mouse",
  release = true
): Promise<void> {
  await act(async () => {
    const [first, ...rest] = points;
    fireEvent.pointerDown(panel(), {
      pointerId: 1,
      button: 0,
      clientX: first[0],
      clientY: first[1],
      pointerType,
    });
    for (const [x, y] of rest)
      fireEvent.pointerMove(panel(), { pointerId: 1, clientX: x, clientY: y, pointerType });
    if (release) {
      const [x, y] = points.at(-1)!;
      fireEvent.pointerUp(panel(), {
        pointerId: 1,
        button: 0,
        clientX: x,
        clientY: y,
        pointerType,
      });
    }
  });
  await flush();
}
const traceLabel = () => document.querySelector("[data-trace-label]")?.textContent ?? null;

it("POI-14 pressing on a curve and dragging traces instead of panning", async () => {
  await setup();
  const before = t.engine.getSnapshot().viewport;
  await drag(
    [
      [px(2), py(2)],
      [px(2.5), py(4.25)],
      [px(3), py(0)],
    ],
    "mouse",
    false
  );
  expect(traceLabel()).toBe("(3, 7)");
  expect(lastFrame().trace).toMatchObject({ x: 3, y: 7 });
  expect(t.engine.getSnapshot().viewport).toEqual(before);
});

it("POI-14 releasing a trace removes the dot and label and pins nothing", async () => {
  await setup();
  await drag([
    [px(2), py(2)],
    [px(2.5), py(4.25)],
  ]);
  expect(traceLabel()).toBeNull();
  expect(lastFrame().trace ?? null).toBeNull();
  expect(labels()).toEqual([]);
});

it("POI-14 a trace on a fine pointer snaps to a point of interest and shows its exact label", async () => {
  await setup();
  await drag(
    [
      [px(2), py(2)],
      [px(1.6), py(0.5)],
      [px(ROOT2) + 2, py(0)],
    ],
    "mouse",
    false
  );
  expect(traceLabel()).toBe("(1.41421, 0)");
});

it("KB-14 with the graph focused ] and [ step through the selected row's points, one label at a time", async () => {
  await setup();
  const surface = screen.getByRole("img");
  await act(async () => fireEvent.keyDown(surface, { key: "]" }));
  expect(labels()).toEqual(["(−1.41421, 0)"]);
  await act(async () => fireEvent.keyDown(surface, { key: "]" }));
  expect(labels()).toEqual(["(0, −2)"]);
  await act(async () => fireEvent.keyDown(surface, { key: "[" }));
  expect(labels()).toEqual(["(−1.41421, 0)"]);
  expect(t.engine.getSnapshot().viewport.left).toBe(-10); // [ and ] are not graph keys
});
