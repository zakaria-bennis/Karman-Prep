import { expect, it } from "vitest";
import type { RowView } from "@/lib/calculator-v2/core/api/engine";
import type { RowKind } from "@/lib/calculator-v2/core/corpus/types";
import type { CurveGeometry, Geometry, RegionGeometry } from "@/lib/calculator-v2/plot/geometry";
import type { Viewport } from "@/lib/calculator-v2/plot/viewport";
import { countPlots, formatBound, graphAccessibleName } from "./accessible-name";

const vp = (l: number, r: number, b: number, t: number): Viewport => ({
  left: l,
  right: r,
  bottom: b,
  top: t,
});
const DEFAULT = vp(-10, 10, -7.5, 7.5);

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
  type: "expression",
  columns: null,
  ...extra,
});
const REGION_STUB: RegionGeometry = {
  kind: "region",
  rowId: "9",
  evaluations: 0,
  spans: new Float32Array([0, 1, 0, 1]),
  boundaries: [],
};
const EMPTY_REGION: RegionGeometry = { ...REGION_STUB, rowId: "15", spans: new Float32Array(0) };
const CURVE_STUB: CurveGeometry = {
  kind: "curve",
  rowId: "16",
  evaluations: 0,
  polylines: new Float64Array([0, 0, 1, 1]),
  bands: new Float64Array(0),
  dashed: false,
};

it("A11Y-1 the name states the bounds and the plot count", () => {
  expect(graphAccessibleName(DEFAULT, 2)).toBe("Graph from x=-10 to 10, y=-7.5 to 7.5, 2 plots");
  expect(graphAccessibleName(vp(-10, 10, -8.60887, 8.60887), 1)).toBe(
    "Graph from x=-10 to 10, y=-8.609 to 8.609, 1 plot"
  );
  expect(graphAccessibleName(vp(-5, 5, -3.75, 3.75), 0)).toBe(
    "Graph from x=-5 to 5, y=-3.75 to 3.75, 0 plots"
  );
});

it("A11Y-1 bounds keep at most 4 significant digits", () => {
  const cases: [number, string][] = [
    [-6.4000000000000004, "-6.4"],
    [12.345678, "12.35"],
    [0.00012347, "0.0001235"],
    [1234567.8, "1.235×10^6"],
    [-2.5e-7, "-2.5×10^-7"],
    [1e15, "1×10^15"],
    [-0, "0"],
  ];
  for (const [v, text] of cases) expect(formatBound(v), String(v)).toBe(text);
});

it("A11Y-1 only visible, error-free, chip-free graphed rows count as plots", () => {
  const geometry = new Map<string, Geometry>([
    ["9", REGION_STUB],
    ["15", EMPTY_REGION],
    ["16", CURVE_STUB],
  ]);
  const syntax = { code: "syntax" as const, message: "Syntax error", names: [], span: null };
  const rows: RowView[] = [
    // counted
    row("1", "curve-y"),
    row("6", "point", { value: { type: "point", value: [2, 3] } }),
    row("9", "constant-relation"),
    row("11", "region"),
    row("12", "vertical-lines"),
    row("13", "curve-x"),
    row("14", "horizontal-lines"),
    row("16", "function-definition"),
    // not counted
    row("2", "curve-y", { hidden: true }),
    row("3", "value"),
    row("4", "implicit", { error: syntax }),
    row("5", "curve-y", { chips: ["a"] }),
    row("7", "point", { value: null }),
    row("8", "point", { value: { type: "point", value: [NaN, 3] } }),
    row("10", "constant-relation"),
    row("15", "constant-relation"),
    row("17", "function-definition"),
  ];
  expect(countPlots(rows, geometry)).toBe(8);
});
