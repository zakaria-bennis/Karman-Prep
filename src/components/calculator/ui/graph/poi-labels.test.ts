import { expect, it } from "vitest";
import type { PoiPoint } from "@/lib/calculator/poi/types";
import { NO_LABELS, reduceLabels, type LabelState } from "./poi-labels";

const p = (x: number, y: number): PoiPoint => ({ x, y, kinds: ["zero"], withRowId: null });
const A = p(-Math.SQRT2, 0),
  B = p(Math.SQRT2, 0),
  C = p(0, -2);
const selected = (rowId: string): LabelState => ({ rowId, open: [], hover: null });

it("POI-TRACE-13 pressing a dot toggles its label; several stay open", () => {
  let s = reduceLabels(selected("1"), { type: "toggle", rowId: "1", point: A });
  s = reduceLabels(s, { type: "toggle", rowId: "1", point: B });
  s = reduceLabels(s, { type: "toggle", rowId: "1", point: C });
  expect(s.open).toEqual([A, B, C]);
  s = reduceLabels(s, { type: "toggle", rowId: "1", point: A });
  expect(s).toEqual({ rowId: "1", open: [B, C], hover: null });
});

it("POI-TRACE-12 hovering shows one more label until the pointer leaves", () => {
  let s = reduceLabels(selected("1"), { type: "hover", point: A });
  expect(s.hover).toEqual(A);
  expect(reduceLabels(s, { type: "hover", point: p(A.x, A.y) })).toBe(s);
  s = reduceLabels(s, { type: "hover", point: null });
  expect(s.hover).toBeNull();
});

it("POI-TRACE-14, POI-TRACE-15 a press elsewhere or a recompute closes every label", () => {
  const open: LabelState = { rowId: "1", open: [A, B], hover: C };
  expect(reduceLabels(open, { type: "close" })).toEqual({ rowId: "1", open: [], hover: null });
  const none = selected("1");
  expect(reduceLabels(none, { type: "close" })).toBe(none);
});

it("labels never persist across a change of selection", () => {
  let s: LabelState = { rowId: "1", open: [A], hover: null };
  s = reduceLabels(s, { type: "selection", rowId: null });
  expect(s).toEqual(NO_LABELS);
  const kept = reduceLabels(
    { rowId: "1", open: [A], hover: null },
    { type: "selection", rowId: "1" }
  );
  expect(kept.open).toEqual([A]);
});

it("a label whose point is gone after a recompute closes", () => {
  const s = reduceLabels(
    { rowId: "1", open: [A, B], hover: A },
    { type: "poi-updated", rowId: "1", points: [B, C] }
  );
  expect(s).toEqual({ rowId: "1", open: [B], hover: null });
});
