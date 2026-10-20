// G-22: a list of curves joins its branches into one geometry of the row's kind, which crosses the
// worker boundary like any other (PROTOCOL_VERSION stays 1).
import { expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import { isWorkerMessage } from "../worker/protocol";
import { VIEW_800 } from "./__fixtures__/measure";
import { geometryTransferables, type CurveGeometry, type RegionGeometry } from "./geometry";
import { plotRow } from "./index";
import { mergeCurves, mergeRegions } from "./merge";

const curve = (polylines: number[], bands: number[] = [], evaluations = 1): CurveGeometry => ({
  rowId: "r",
  kind: "curve",
  polylines: Float64Array.from(polylines),
  bands: Float64Array.from(bands),
  dashed: false,
  evaluations,
});

it("G-22 curves join with one NaN pair between runs, bands and evaluations added", () => {
  const merged = mergeCurves([
    curve([0, 0, 1, 1]),
    curve([]),
    curve([2, 2, 3, 3, NaN, NaN], [0, 1, 2, 3], 4),
    curve([4, 4, 5, 5]),
  ]);
  expect(Array.from(merged.polylines)).toEqual([
    0,
    0,
    1,
    1,
    NaN,
    NaN,
    2,
    2,
    3,
    3,
    NaN,
    NaN,
    4,
    4,
    5,
    5,
    NaN,
    NaN,
  ]);
  expect([Array.from(merged.bands), merged.evaluations]).toEqual([[0, 1, 2, 3], 7]);
  const one = curve([0, 0]);
  expect(mergeCurves([one])).toBe(one);
});

it("G-22 a merged curve and region pass isWorkerMessage with each buffer transferred once", () => {
  const input = {
    rowId: "r",
    kind: "explicit",
    independent: "x",
    fs: [(x: number) => x, (x: number) => 2 * x],
  } as const;
  const lines = plotRow({ ...input, fs: [...input.fs] }, VIEW_800, NO_DEADLINE) as CurveGeometry;
  const region = plotRow(
    {
      rowId: "s",
      kind: "region",
      branches: [
        [(_x, y) => y, (x) => x],
        [(_x, y) => y, (x) => -x],
      ],
      ops: ["<"],
    },
    VIEW_800,
    NO_DEADLINE
  ) as RegionGeometry;
  expect(region.boundaries).toHaveLength(2);
  for (const geometry of [lines, region]) {
    const message = { v: 1, type: "plot", generation: 1, rowId: geometry.rowId, geometry };
    expect(isWorkerMessage(message)).toBe(true);
    const buffers = geometryTransferables(geometry);
    expect(new Set(buffers).size).toBe(buffers.length);
  }
  expect(geometryTransferables(region)).toHaveLength(1 + 2 * 2); // spans, then each boundary's two
});

it("G-22 a list region keeps where each element's spans start, so its elements shade on their own", () => {
  const part = (spans: number[], elements?: number[]): RegionGeometry => ({
    rowId: "r",
    kind: "region",
    spans: Float32Array.from(spans),
    ...(elements ? { elements } : {}),
    boundaries: [],
    evaluations: 1,
  });
  const merged = mergeRegions([part([0, 1, 0, 4]), part([]), part([0, 1, 2, 8, 1, 2, 2, 8])]);
  expect(Array.from(merged.spans)).toEqual([0, 1, 0, 4, 0, 1, 2, 8, 1, 2, 2, 8]);
  expect(merged.elements).toEqual([0, 4, 4]); // the empty element starts where the next does
  expect(mergeRegions([part([0, 1, 0, 4], [0]), part([0, 1, 0, 2], [0, 0])]).elements).toEqual([
    0, 4, 4,
  ]);
  const one = part([0, 1, 0, 4]);
  expect(mergeRegions([one])).toBe(one);
  expect(one.elements).toBeUndefined();
});
