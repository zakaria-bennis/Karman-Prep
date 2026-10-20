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
  { x: 0, y: -2, kinds: ["intercept", "extremum"], withRowId: null },
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
const labels = () =>
  [...document.querySelectorAll("[data-poi-label]")].map((l) => l.getAttribute("aria-label"));
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

it("POI-TRACE-13 pressing a dot opens its label, several stay open, pressing it again closes it", async () => {
  await setup();
  expect(lastFrame().poi).toEqual(POINTS.map(({ x, y }) => ({ x, y, open: false })));
  await tap(px(ROOT2) + 5, py(0));
  expect(labels()).toEqual(["(1.41421, 0)"]);
  expect(lastFrame().poi?.filter((d) => d.open)).toEqual([{ x: ROOT2, y: 0, open: true }]);
  await tap(px(0), py(-2) - 3);
  expect(labels()).toEqual(["(1.41421, 0)", "(0, −2)"]);
  await tap(px(ROOT2), py(0));
  expect(labels()).toEqual(["(0, −2)"]);
  expect(t.engine.getSnapshot().selectedRowId).toBe("1");
});

it("POI-TRACE-12 hovering within 12 px of a dot shows its label until the mouse leaves", async () => {
  await setup();
  const hover = async (x: number, y: number) => {
    await act(async () => {
      fireEvent.pointerMove(panel(), {
        pointerId: 1,
        clientX: x,
        clientY: y,
        pointerType: "mouse",
      });
    });
    await flush();
  };
  await hover(px(ROOT2), py(0) + 12);
  expect(labels()).toEqual(["(1.41421, 0)"]);
  expect(document.querySelector("[data-poi-label]")?.hasAttribute("data-opened")).toBe(false);
  await hover(px(ROOT2), py(0) + 13);
  expect(labels()).toEqual([]);
});

it("POI-TRACE-14 a press on blank paper or anywhere else in the page closes every label", async () => {
  await setup();
  await tap(px(ROOT2), py(0));
  await tap(px(-ROOT2), py(0));
  expect(labels()).toHaveLength(2);
  await act(async () => {
    fireEvent.pointerDown(document.body, { pointerId: 2, button: 0, pointerType: "mouse" });
  });
  await flush();
  expect(labels()).toEqual([]);
  expect(t.engine.getSnapshot().selectedRowId).toBe("1");
  await tap(px(ROOT2), py(0));
  await tap(px(-6), py(-5)); // blank paper: closes and deselects
  expect(labels()).toEqual([]);
  expect(t.engine.getSnapshot().selectedRowId).toBeNull();
  expect(lastFrame().poi ?? []).toEqual([]);
});

it("POI-TRACE-15 the zoom buttons close labels and keep the selection", async () => {
  await setup();
  await tap(px(ROOT2), py(0));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Zoom in" })));
  await flush();
  expect(labels()).toEqual([]);
  expect(t.engine.getSnapshot().selectedRowId).toBe("1");
});

it("POI-TRACE-18 the export button closes the label and appends the point as a new row", async () => {
  await setup();
  await tap(px(ROOT2), py(0));
  const button = screen.getByRole("button", { name: "Export point to expression list" });
  expect(button.getAttribute("title")).toBe("Export point to expression list");
  await act(async () => {
    fireEvent.pointerDown(button, { pointerId: 1, button: 0, pointerType: "mouse" });
    fireEvent.click(button);
  });
  await flush();
  expect(labels()).toEqual([]);
  expect(t.engine.getSnapshot().rows.at(-1)?.latex).toBe("\\left(1.41421,\\ 0\\right)");
  expect(t.engine.getSnapshot().selectedRowId).toBe("1");
});

it("POI-TRACE-17 an open label is a note named by its coordinates, its math hidden", async () => {
  await setup();
  await tap(px(0), py(-2));
  const label = screen.getByRole("note", { name: "(0, −2)" });
  expect(label.querySelector(".mq-math-mode")?.getAttribute("aria-hidden")).toBe("true");
  expect(label.textContent).toContain("−2");
  // A unary minus carries MathQuill's empty class, so it gets the reference's side padding.
  const minus = [...label.querySelectorAll("span")].find((el) => el.textContent === "−");
  expect(minus?.getAttribute("class")).toBe("");
  expect(label.querySelector(".kc-poi-export svg")).not.toBeNull();
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
const traceLabel = () =>
  document.querySelector("[data-trace-label]")?.getAttribute("aria-label") ?? null;

it("POI-TRACE-21 pressing on a curve traces at once instead of panning; labels stay open", async () => {
  await setup();
  await tap(px(ROOT2), py(0));
  const before = t.engine.getSnapshot().viewport;
  await drag([[px(-2.5), py(4.25)]], "mouse", false);
  expect(traceLabel()).toBe("(−2.5, 4.25)");
  await drag([[px(3), py(7)]], "mouse", false);
  expect(lastFrame().trace).toMatchObject({ x: 3, y: 7 });
  expect(t.engine.getSnapshot().viewport).toEqual(before);
  expect(labels()).toEqual(["(1.41421, 0)"]);
});

it("POI-TRACE-26 releasing a trace removes the dot and label and opens nothing", async () => {
  await setup();
  await drag([
    [px(2), py(2)],
    [px(ROOT2), py(0)],
  ]);
  expect(traceLabel()).toBeNull();
  expect(lastFrame().trace ?? null).toBeNull();
  expect(labels()).toEqual([]);
});

it("POI-TRACE-27 pressing another curve selects it and traces it", async () => {
  await setup();
  await drag([[px(4), py(3) + 2]], "mouse", false);
  expect(t.engine.getSnapshot().selectedRowId).toBe("2");
  expect(traceLabel()).toBe("(4, 3)");
  expect(lastFrame().rows.find((r) => r.rowId === "2")?.selected).toBe(true);
});

it("POI-TRACE-2 pointsOfInterest off hides the dots but keeps the trace", async () => {
  await setup();
  await act(async () => t.engine.updateSettings({ pointsOfInterest: false }));
  await flush();
  expect(lastFrame().poi ?? []).toEqual([]);
  await tap(px(ROOT2), py(0)); // no dot to press: the press traces the curve instead
  expect(labels()).toEqual([]);
  await drag([[px(-2.5), py(4.25)]], "mouse", false);
  expect(traceLabel()).toBe("(−2.5, 4.25)");
});

it("POI-TRACE-2 trace off: no dots, no trace, and a press on a curve only selects it", async () => {
  await setup();
  await act(async () => t.engine.updateSettings({ trace: false }));
  await flush();
  expect(lastFrame().poi ?? []).toEqual([]);
  const before = t.engine.getSnapshot().viewport;
  await drag(
    [
      [px(4), py(3) + 2],
      [px(4) + 40, py(3) + 2],
    ],
    "mouse",
    false
  );
  expect(t.engine.getSnapshot().selectedRowId).toBe("2");
  expect(traceLabel()).toBeNull();
  expect(t.engine.getSnapshot().viewport).not.toEqual(before); // the press pans
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
