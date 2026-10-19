import { expect, it } from "vitest";
import type { PoiPoint } from "@/lib/calculator/poi/types";
import { NO_LABELS, reduceLabels, type LabelState } from "./poi-labels";

const p = (x: number, y: number): PoiPoint => ({ x, y, kinds: ["zero"], withRowId: null });
const A = p(-Math.SQRT2, 0),
  B = p(Math.SQRT2, 0),
  C = p(0, -2);
const selected = (rowId: string): LabelState => ({ rowId, open: [] });

it("POI-13 clicking a dot of the selected curve opens its label and clicking it again closes only that label", () => {
  let s = reduceLabels(selected("1"), { type: "click-poi", rowId: "1", point: A });
  s = reduceLabels(s, { type: "click-poi", rowId: "1", point: B });
  expect(s.open).toEqual([A, B]);
  s = reduceLabels(s, { type: "click-poi", rowId: "1", point: A });
  expect(s).toEqual({ rowId: "1", open: [B] });
});

it("POI-13 several labels stay open, and a click on an unselected curve's dot only selects that curve", () => {
  let s = reduceLabels(selected("1"), { type: "click-poi", rowId: "1", point: A });
  s = reduceLabels(s, { type: "click-poi", rowId: "1", point: C });
  expect(s.open).toHaveLength(2);
  s = reduceLabels(s, { type: "click-poi", rowId: "2", point: B });
  expect(s).toEqual({ rowId: "2", open: [] });
  s = reduceLabels(s, { type: "click-curve", rowId: "2" });
  expect(s).toEqual({ rowId: "2", open: [] });
});

it("POI-13 empty paper closes every label and deselects; focusing or editing a row, zoom buttons and panning close labels and keep the selection", () => {
  const open: LabelState = { rowId: "1", open: [A, B] };
  expect(reduceLabels(open, { type: "click-empty" })).toEqual(NO_LABELS);
  for (const type of ["view-changed", "row-edited"] as const) {
    expect(reduceLabels(open, { type })).toEqual({ rowId: "1", open: [] });
  }
  expect(reduceLabels(open, { type: "row-focused", rowId: "3" })).toEqual({ rowId: "3", open: [] });
  expect(reduceLabels(open, { type: "escape" })).toEqual({ rowId: "1", open: [] });
});

it("POI-13 labels never persist across deselection", () => {
  let s: LabelState = { rowId: "1", open: [A] };
  s = reduceLabels(s, { type: "selection", rowId: null });
  expect(s).toEqual(NO_LABELS);
  s = reduceLabels(s, { type: "selection", rowId: "1" });
  expect(s).toEqual({ rowId: "1", open: [] });
  const kept = reduceLabels({ rowId: "1", open: [A] }, { type: "selection", rowId: "1" });
  expect(kept.open).toEqual([A]);
});

it("POI-13 a label whose point is gone after a recompute closes", () => {
  const s = reduceLabels(
    { rowId: "1", open: [A, B] },
    { type: "poi-updated", rowId: "1", points: [B, C] }
  );
  expect(s.open).toEqual([B]);
});
