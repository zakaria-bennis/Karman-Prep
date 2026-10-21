import { expect, it } from "vitest";
import type { PoiPoint } from "@/lib/calculator/poi/types";
import { liveLabels, NO_LABELS, reduceLabels, type LabelState } from "./poi-labels";

const p = (x: number, y: number): PoiPoint => ({ x, y, kinds: ["zero"], withRowId: null });
const A = p(-Math.SQRT2, 0),
  B = p(Math.SQRT2, 0),
  C = p(0, -2);
const at = { rowId: "1", revision: 7 };
const selected: LabelState = { ...at, open: [], hover: null };

it("POI-TRACE-13 pressing a dot toggles its label; several stay open", () => {
  let s = reduceLabels(selected, { type: "toggle", ...at, point: A });
  s = reduceLabels(s, { type: "toggle", ...at, point: B });
  s = reduceLabels(s, { type: "toggle", ...at, point: C });
  expect(s.open).toEqual([A, B, C]);
  s = reduceLabels(s, { type: "toggle", ...at, point: A });
  expect(s).toEqual({ ...at, open: [B, C], hover: null });
});

it("POI-TRACE-12 hovering shows one more label until the pointer leaves", () => {
  let s = reduceLabels(selected, { type: "hover", ...at, point: A });
  expect(s.hover).toEqual(A);
  expect(reduceLabels(s, { type: "hover", ...at, point: p(A.x, A.y) })).toBe(s);
  s = reduceLabels(s, { type: "hover", ...at, point: null });
  expect(s.hover).toBeNull();
});

it("POI-TRACE-14 a press elsewhere closes every label", () => {
  const open: LabelState = { ...at, open: [A, B], hover: C };
  expect(reduceLabels(open, { type: "close" })).toEqual({ ...at, open: [], hover: null });
  expect(reduceLabels(selected, { type: "close" })).toBe(selected);
});

it("POI-TRACE-15 labels never persist across a change of selection or a recompute, read at render", () => {
  const open: LabelState = { ...at, open: [A], hover: null };
  expect(liveLabels(open, "1", 7, [A, B])).toBe(open);
  expect(liveLabels(open, null, 7, [A, B])).toEqual(NO_LABELS);
  expect(liveLabels(open, "2", 7, [A, B])).toEqual({
    rowId: "2",
    revision: 7,
    open: [],
    hover: null,
  });
  expect(liveLabels(open, "1", 8, [A, B])).toEqual({ ...at, revision: 8, open: [], hover: null });
  // an event at a newer revision starts from no labels
  const next = reduceLabels(open, { type: "toggle", rowId: "1", revision: 8, point: B });
  expect(next.open).toEqual([B]);
});

it("a label whose point is gone after a recompute closes", () => {
  const s = liveLabels({ ...at, open: [A, B], hover: A }, "1", 7, [B, C]);
  expect(s).toEqual({ ...at, open: [B], hover: null });
});
