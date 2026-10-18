import { expect, it } from "vitest";
import type { EngineSnapshot, RowView } from "@/lib/calculator-v2/core/api/engine";
import { DEFAULT_SETTINGS } from "@/lib/calculator-v2/core/api/types";
import type { RowKind } from "@/lib/calculator-v2/core/corpus/types";
import type { CurveGeometry, Geometry, RegionGeometry } from "@/lib/calculator-v2/plot/geometry";
import type { PixelSize, Viewport, ViewSpec } from "@/lib/calculator-v2/plot/viewport";
import { resolveRowColor } from "@/lib/calculator-v2/theme/roles";
import {
  buildRenderRows,
  displayedGeometry,
  updateRegionCache,
  type RegionCache,
} from "./render-rows";

const vp = (l: number, r: number, b: number, t: number): Viewport => ({
  left: l,
  right: r,
  bottom: b,
  top: t,
});
const DEFAULT = vp(-10, 10, -7.5, 7.5);
const SIZE: PixelSize = { width: 800, height: 600 };
const view = (v: Viewport = DEFAULT, size: PixelSize = SIZE): ViewSpec => ({
  viewport: v,
  size,
  dpr: 1,
});

const row = (id: string, kind: RowKind, extra: Partial<RowView> = {}): RowView => ({
  id,
  kind,
  latex: "",
  hidden: false,
  color: "c1",
  error: null,
  chips: [],
  complexHint: false,
  value: null,
  valueText: null,
  overrun: false,
  ...extra,
});
const curveG = (id: string): CurveGeometry => ({
  kind: "curve",
  rowId: id,
  evaluations: 0,
  polylines: new Float64Array([0, 0, 1, 1]),
  bands: new Float64Array(0),
  dashed: false,
});
const REGION: RegionGeometry = {
  kind: "region",
  rowId: "4",
  evaluations: 0,
  spans: new Float32Array([0, 300, 0, 800]),
  boundaries: [],
};

const CURVE_1 = curveG("1");
const CURVE_2 = curveG("2");
const snap: EngineSnapshot = {
  revision: 1,
  rows: [
    row("1", "curve-y", { latex: "y=x" }),
    row("2", "curve-y", { latex: "y=2x", hidden: true }),
    row("3", "value", { latex: "2+3" }),
    row("4", "region", { latex: "y<1", color: "c2" }),
  ],
  settings: DEFAULT_SETTINGS,
  viewport: DEFAULT,
  view: view(),
  geometry: new Map<string, Geometry>([
    ["1", CURVE_1],
    ["2", CURVE_2],
    ["4", REGION],
  ]),
  focusedRowId: null,
  activeRowId: null,
  selectedRowId: null,
  poi: null,
  canUndo: false,
  canRedo: false,
  backendKind: "main-thread",
};
// snap as 07 leaves it after setMathBounds(vp(-8, 12, -6, 9)): region geometry dropped on the view send
const PANNED_VIEWPORT = vp(-8, 12, -6, 9);
const panned: EngineSnapshot = {
  ...snap,
  revision: 2,
  viewport: PANNED_VIEWPORT,
  view: view(PANNED_VIEWPORT),
  geometry: new Map<string, Geometry>([
    ["1", CURVE_1],
    ["2", CURVE_2],
  ]),
};
const c0 = updateRegionCache(new Map(), snap);
const c1 = updateRegionCache(c0, panned);

const regionOf = (rows: ReturnType<typeof buildRenderRows>, id: string): RegionGeometry => {
  const geometry = rows.find((r) => r.rowId === id)?.geometry;
  if (geometry?.kind !== "region") throw new Error(`row ${id} has no region`);
  return geometry;
};

it("G-5 render rows follow list order with skin colours", () => {
  const rows = buildRenderRows(snap, "ivory", view(), c0);
  expect(rows.map((r) => r.rowId)).toEqual(["1", "4"]);
  expect(rows[0].color).toBe(resolveRowColor("c1", "ivory").hex);
  expect(rows[1].fillAlpha).toBe(resolveRowColor("c2", "ivory").fillAlpha);
  expect(rows[1].geometry).toBe(REGION);
});

it("G-5 the region cache keeps a row's shading through a pan and drops it when the row changes", () => {
  expect(c1.get("4")?.geometry).toBe(REGION);
  expect(c1.get("4")?.source).toEqual(view());
  expect(updateRegionCache(c1, panned)).toBe(c1);

  const atPan = buildRenderRows(panned, "ivory", panned.view!, c1);
  expect(atPan.map((r) => r.rowId)).toEqual(["1", "4"]);
  expect(Array.from(regionOf(atPan, "4").spans)).toEqual([60, 360, -80, 720]);

  const zoomed = buildRenderRows(panned, "ivory", view(vp(-5, 5, -3.75, 3.75)), c1);
  expect(Array.from(regionOf(zoomed, "4").spans)).toEqual([]);

  expect(displayedGeometry(panned, c1).get("4")).toBe(REGION);
  expect(displayedGeometry(snap, c0)).toBe(snap.geometry);

  const withRow4 = (change: Partial<RowView>): EngineSnapshot => ({
    ...panned,
    rows: panned.rows.map((r) => (r.id === "4" ? { ...r, ...change } : r)),
  });
  const changes: Partial<RowView>[] = [
    { latex: "y<2" },
    { hidden: true },
    { kind: "implicit" },
    { error: { code: "timeout", message: "", names: [], span: null } },
  ];
  for (const change of changes) {
    const cache: RegionCache = updateRegionCache(c1, withRow4(change));
    expect(cache.has("4"), JSON.stringify(change)).toBe(false);
  }
});
