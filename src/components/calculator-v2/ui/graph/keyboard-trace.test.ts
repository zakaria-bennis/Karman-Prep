import { beforeEach, expect, it } from "vitest";
import {
  createTestEngine,
  TEST_VIEW,
  type TestEngine,
} from "@/lib/calculator-v2/core/api/__fixtures__/test-engine";
import type { PoiPoint } from "@/lib/calculator-v2/poi/types";
import { KeyboardTrace, kindWords, poiAnnouncement, TRACE_HELP } from "./keyboard-trace";

let t: TestEngine;
let said: string[];
let focused: string[];
let trace: KeyboardTrace;

const P: PoiPoint[] = [
  { x: -Math.SQRT2, y: 0, kinds: ["zero"], withRowId: null },
  { x: 0, y: -2, kinds: ["y-intercept", "minimum"], withRowId: null },
  { x: Math.SQRT2, y: 0, kinds: ["zero"], withRowId: null },
];
const key = (k: string, mods: Partial<KeyboardEvent> = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

beforeEach(() => {
  t = createTestEngine();
  t.engine.setExpressions([
    { id: "a", latex: "y=x^{2}-2" },
    { id: "b", latex: "y=2x+1" },
  ]);
  t.engine.removeExpression({ id: "1" }); // the blank row every calculator starts with
  t.engine.setView(TEST_VIEW);
  said = [];
  focused = [];
  trace = new KeyboardTrace({
    engine: t.engine,
    announce: (text) => said.push(text),
    focusRow: (rowId) => focused.push(rowId),
  });
});

/** Delivers row `rowId`'s points at the latest generation. */
function deliver(rowId: string, points: PoiPoint[]): void {
  t.emit({ v: 1, type: "poi", generation: t.latestGeneration(), rowId, points });
  t.flushFrames();
}

it("POI-20 Alt+T starts the trace at the focused row's first point and announces Audio trace on with the key help and the point", () => {
  trace.toggle("a");
  expect(t.engine.getSnapshot().selectedRowId).toBe("a");
  expect(trace.state).toMatchObject({ rowId: "a" });
  deliver("a", P);
  expect(said).toEqual([`Audio trace on. ${TRACE_HELP} Zero at x negative 1.41421, y 0`]);
  expect(trace.state).toMatchObject({ rowId: "a", x: -Math.SQRT2, y: 0 });
  trace.toggle("a");
  expect(trace.state).toBeNull();
  expect(said.at(-1)).toBe("Audio trace off");
});

it("POI-20 Page Down and Page Up step through points in x order and past the last say No more points of interest", () => {
  trace.toggle("a");
  deliver("a", P);
  expect(trace.handleKey(key("PageDown"))).toBe(true);
  expect(said.at(-1)).toBe("Y-intercept and Minimum at x 0, y negative 2");
  trace.handleKey(key("PageDown"));
  expect(said.at(-1)).toBe("Zero at x 1.41421, y 0");
  trace.handleKey(key("PageDown"));
  expect(said.at(-1)).toBe("No more points of interest. Zero at x 1.41421, y 0");
  trace.handleKey(key("PageUp"));
  expect(said.at(-1)).toBe("Y-intercept and Minimum at x 0, y negative 2");
  expect(trace.handleKey(key("a"))).toBe(false); // other keys pass through
});

it("POI-20 Home and End jump to the curve's ends in view, Ctrl or Cmd with Up and Down switch expression, Escape exits to the row", () => {
  trace.toggle("a");
  deliver("a", P);
  trace.handleKey(key("End"));
  expect(said.at(-1)).toBe("x 10, y 98");
  trace.handleKey(key("Home"));
  expect(said.at(-1)).toBe("x negative 10, y 98");
  trace.handleKey(key("ArrowRight"));
  expect(said.at(-1)).toBe("x negative 9.8, y 94.04");
  trace.handleKey(key("ArrowDown", { ctrlKey: true }));
  expect(trace.state?.rowId).toBe("b");
  deliver("b", [{ x: -0.5, y: 0, kinds: ["zero"], withRowId: null }]);
  expect(said.at(-1)).toBe("Expression 2. Zero at x negative 0.5, y 0");
  trace.handleKey(key("ArrowUp", { metaKey: true }));
  expect(trace.state?.rowId).toBe("a");
  expect(trace.handleKey(key("Escape"))).toBe(true);
  expect(trace.state).toBeNull();
  expect(focused).toEqual(["a"]);
});

it("A11Y-9 announcements use the kind words, Y-intercept and Minimum, Intersection with Expression 2", () => {
  const numbers = new Map([
    ["a", 1],
    ["b", 2],
  ]);
  expect(kindWords(["y-intercept", "minimum"], null, numbers)).toBe("Y-intercept and Minimum");
  expect(kindWords(["intersection"], "b", numbers)).toBe("Intersection with Expression 2");
  expect(kindWords(["zero", "x-intercept", "maximum", "top", "bottom"], null, numbers)).toBe(
    "Zero and X-intercept and Maximum and Top and Bottom"
  );
  expect(
    poiAnnouncement({ x: 2, y: 5, kinds: ["intersection"], withRowId: "b" }, numbers, TEST_VIEW)
  ).toBe("Intersection with Expression 2 at x 2, y 5");
});
