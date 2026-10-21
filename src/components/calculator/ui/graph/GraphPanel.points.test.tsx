// @vitest-environment jsdom
// POI-LIVE-1 to POI-LIVE-5 in the panel: plotted points' labels (reference, 2026-10-20) and a second
// finger while tracing.
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createTestEngine,
  type TestEngine,
} from "@/lib/calculator/core/api/__fixtures__/test-engine";
import type { Geometry } from "@/lib/calculator/plot/geometry";
import { installDomStubs, triggerResize } from "../../__fixtures__/dom-stubs";
import { SkinContext } from "../hooks/skin";
import { EngineContext } from "../hooks/use-engine";
import { GraphPanel } from "./GraphPanel";

let restoreDom: () => void;
let t: TestEngine;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  restoreDom = installDomStubs();
  t = createTestEngine();
});

afterEach(() => {
  cleanup();
  t.engine.destroy();
  restoreDom();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// The default 800×600 view: px = (x + 10)·40, py = (7.5 − y)·40.
const px = (x: number) => (x + 10) * 40;
const py = (y: number) => (7.5 - y) * 40;

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

/** Row c (y=x+1), and points p (1, 2) on it and q (3, −2), plotted at 800×600; nothing selected. */
async function setup(): Promise<void> {
  t.engine.setExpressions([
    { id: "c", latex: "y=x+1" },
    { id: "p", latex: "(1,2)" },
    { id: "q", latex: "(3,-2)" },
  ]);
  render(
    <EngineContext.Provider value={t.engine}>
      <SkinContext.Provider value="classic">
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
  t.emit({ v: 1, type: "plot", generation, rowId: "c", geometry: line("c") });
  t.emit({ v: 1, type: "plot", generation, rowId: "p", geometry: point("p", 1, 2) });
  t.emit({ v: 1, type: "plot", generation, rowId: "q", geometry: point("q", 3, -2) });
  t.emit({ v: 1, type: "done", generation });
  await flush();
}

const panel = () => document.querySelector<HTMLElement>("[data-graph-panel]")!;
const labels = () =>
  [...document.querySelectorAll("[data-poi-label]")].map(
    (l) => `${l.getAttribute("aria-label")}${l.hasAttribute("data-plotted") ? " plotted" : ""}`
  );
const trace = () =>
  document.querySelector("[data-trace-label]")?.getAttribute("aria-label") ?? null;
const selected = () => t.engine.getSnapshot().selectedRowId;

async function down(x: number, y: number, pointerId = 1, pointerType = "mouse") {
  await act(async () => {
    fireEvent.pointerDown(panel(), { pointerId, button: 0, clientX: x, clientY: y, pointerType });
  });
  await flush();
}
async function up(x: number, y: number, pointerId = 1, pointerType = "mouse") {
  await act(async () => {
    fireEvent.pointerUp(panel(), { pointerId, button: 0, clientX: x, clientY: y, pointerType });
  });
  await flush();
}
async function tap(x: number, y: number, pointerType = "mouse") {
  await down(x, y, 1, pointerType);
  await up(x, y, 1, pointerType);
}

it("POI-LIVE-1, POI-LIVE-2 pressing plotted points toggles their labels without selecting", async () => {
  await setup();
  await tap(px(1) + 6, py(2)); // on the unselected line too: the point wins
  expect(labels()).toEqual(["(1, 2) plotted"]);
  expect(selected()).toBeNull();
  expect(document.querySelector(".kc-poi-export")).toBeNull(); // no export button
  await tap(px(3), py(-2));
  expect(labels()).toEqual(["(1, 2) plotted", "(3, −2) plotted"]);
  await tap(px(1), py(2));
  expect(labels()).toEqual(["(3, −2) plotted"]);
  await tap(px(3), py(-2) + 12); // 12 px off: out of reach, so blank paper closes it
  expect(labels()).toEqual([]);
});

it("POI-LIVE-1 a point is in reach 20 px from a finger", async () => {
  await setup();
  await tap(px(3) + 19, py(-2), "touch");
  expect(labels()).toEqual(["(3, −2) plotted"]);
});

it("POI-LIVE-1 the selected line comes before a point on it, and traces", async () => {
  await setup();
  await tap(px(-3), py(-2)); // selects the line
  expect(selected()).toBe("c");
  await down(px(1), py(2));
  expect(trace()).toBe("(1, 2)");
  expect(labels()).toEqual([]);
  await up(px(1), py(2));
  expect(trace()).toBeNull();
});

it("POI-LIVE-3 point labels stay through a zoom and close on a press on blank paper", async () => {
  await setup();
  await tap(px(1), py(2));
  await act(async () => {
    fireEvent.wheel(panel(), { deltaY: -100, clientX: 400, clientY: 300 });
    vi.advanceTimersToNextFrame();
  });
  await flush();
  expect(labels()).toEqual(["(1, 2) plotted"]);
  await act(async () => {
    fireEvent.pointerDown(document.body, { pointerId: 9, button: 0 });
  });
  await flush();
  expect(labels()).toEqual([]);
});

it("POI-LIVE-5 a second finger while one traces neither pinches nor ends the trace", async () => {
  await setup();
  const before = t.engine.getSnapshot().viewport;
  await down(px(-3), py(-2), 1, "touch");
  expect(trace()).toBe("(−3, −2)");
  await down(px(4), py(4), 2, "touch");
  await act(async () => {
    fireEvent.pointerMove(panel(), {
      pointerId: 2,
      clientX: px(6),
      clientY: py(6),
      pointerType: "touch",
    });
    fireEvent.pointerMove(panel(), {
      pointerId: 1,
      clientX: px(-2),
      clientY: py(-1),
      pointerType: "touch",
    });
    vi.advanceTimersToNextFrame();
  });
  await flush();
  expect(trace()).toBe("(−2, −1)");
  expect(t.engine.getSnapshot().viewport).toEqual(before);
  await up(px(6), py(6), 2, "touch");
  await up(px(-2), py(-1), 1, "touch");
  expect(trace()).toBeNull();
});
