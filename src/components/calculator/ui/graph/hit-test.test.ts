import { expect, it } from "vitest";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import type { PoiPoint } from "@/lib/calculator/poi/types";
import { CURVE_HIT_PX, hitBranch, hitPoi, ON_CURVE_PX, POI_HIT_PX } from "./hit-test";

const VIEW: ViewSpec = {
  viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
  size: { width: 800, height: 600 },
  dpr: 1,
};
const P = [{ x: 0, y: -2 }]; // px (400, 380)

it("POI-TRACE-12 a dot is hit within 12 px on a mouse and 22 px on touch", () => {
  expect(POI_HIT_PX).toEqual({ fine: 12, coarse: 22 });
  expect(hitPoi(P, VIEW, [400, 380 + 12], "fine")).toBe(0);
  expect(hitPoi(P, VIEW, [400, 380 + 13], "fine")).toBeNull();
  // A pointer event's float32 clientY: 12 px reads as 12.0000122 and still hits, as on Desmos.
  expect(hitPoi(P, VIEW, [400, 380 + Math.fround(12.2) - 0.2], "fine")).toBe(0);
  expect(hitPoi(P, VIEW, [400, 380 + 21.5], "coarse")).toBe(0);
  expect(hitPoi(P, VIEW, [400, 380 + 22], "coarse")).toBeNull(); // short of 22 on touch
  expect(hitPoi(P, VIEW, [400 + 23, 380], "coarse")).toBeNull();
  expect(hitPoi([], VIEW, [400, 380], "fine")).toBeNull();
});

it("POI-TRACE-21 a press within 10 px (20 on touch) of a branch hits the nearest row", () => {
  expect(CURVE_HIT_PX).toEqual({ fine: 10, coarse: 20 });
  // y = 0 is the line py = 300; y = 0.1 is py = 296
  const rows = [
    { rowId: "1", branches: [{ independent: "x" as const, f: () => 0 }] },
    { rowId: "2", branches: [{ independent: "x" as const, f: () => 0.1 }] },
  ];
  expect(hitBranch(rows, VIEW, [200, 298], "fine")).toBe("2"); // a tie: the later row
  expect(hitBranch(rows, VIEW, [200, 303], "fine")).toBe("1");
  expect(hitBranch(rows, VIEW, [200, 310], "fine")).toBe("1");
  expect(hitBranch(rows, VIEW, [200, 311], "fine")).toBeNull();
  expect(hitBranch(rows, VIEW, [200, 300 + Math.fround(10.2) - 0.2], "fine")).toBe("1");
  expect(hitBranch(rows, VIEW, [200, 319.5], "coarse")).toBe("1");
  expect(hitBranch(rows, VIEW, [200, 320], "coarse")).toBeNull(); // short of 20 on touch
  const vertical = [{ rowId: "3", branches: [{ independent: "y" as const, f: () => 5 }] }];
  expect(hitBranch(vertical, VIEW, [606, 50], "fine")).toBe("3");
  expect(hitBranch([{ rowId: "4", branches: [] }], VIEW, [200, 300], "fine")).toBeNull();
});

it("POI-TRACE-21 a later row within 4.75 px wins over a nearer earlier row, as on Desmos", () => {
  expect(ON_CURVE_PX).toBe(4.75);
  const line = (rowId: string, y: number) => ({
    rowId,
    branches: [{ independent: "x" as const, f: () => y }],
  });
  // 40 px per unit: y = 0 is py = 300. Desmos (live 2026-10-25): `y=x^2` then `y=x^2+0.12`
  // (4.5 px) pressed on the first picks the second; 4.9 px apart it picks the first.
  expect(hitBranch([line("1", 0), line("2", 4.5 / 40)], VIEW, [200, 300], "fine")).toBe("2");
  expect(hitBranch([line("1", 0), line("2", -4.5 / 40)], VIEW, [200, 300], "fine")).toBe("2");
  expect(hitBranch([line("1", 0), line("2", 4.9 / 40)], VIEW, [200, 300], "fine")).toBe("1");
  // 6 px from the later row and 2 px from the earlier: the earlier (Desmos, same day)
  expect(hitBranch([line("1", 8 / 40), line("2", 0)], VIEW, [200, 294], "fine")).toBe("1");
});

it("POI-TRACE-21 b132A-e85a3541: a press on y=f(x) beside its regression curve picks y=f(x)", () => {
  // y_1~ax_1^2+bx_1+c gives c = -711; f(x)=ax^2+bx+c-6 is the same parabola 6 lower: under 2 px
  // apart on this steep stretch. Desmos opens (0, -717) for a press at (0, -717).
  const view: ViewSpec = {
    viewport: { left: -5, right: 40, bottom: -800, top: 50 },
    size: { width: 800, height: 800 },
    dpr: 1,
  };
  const parabola = (rowId: string, c: number) => ({
    rowId,
    branches: [{ independent: "x" as const, f: (x: number) => -2 * x * x + 76 * x + c }],
  });
  const rows = [parabola("2", -711), parabola("3", -717), parabola("5", -717)];
  expect(hitBranch(rows, view, [88, 721], "fine")).toBe("5");
});

it("POI-TRACE-12 within 4.75 px the higher kind of dot opens, as on Desmos", () => {
  // 40 px per unit; the press is on (0, -2), px (400, 380)
  const at = [400, 380] as const;
  const dot = (x: number, y: number, kinds: PoiPoint["kinds"]) => ({ x, y, kinds });
  // b70A-799c384b: `y=1600`'s intercept and its intersection with the curve, a px apart
  expect(
    hitPoi([dot(0, -2, ["intercept"]), dot(0.1175, -2, ["intersection"])], VIEW, at, "fine")
  ).toBe(1);
  expect(
    hitPoi([dot(0, -2, ["intercept"]), dot(0.125, -2, ["intersection"])], VIEW, at, "fine")
  ).toBe(0);
  expect(hitPoi([dot(0, -2, ["intercept"]), dot(0.1, -2, ["extremum"])], VIEW, at, "fine")).toBe(1);
  expect(hitPoi([dot(0, -2, ["zero"]), dot(0, -1.9, ["intercept"])], VIEW, at, "fine")).toBe(1);
  expect(
    hitPoi([dot(0, -2, ["extremum"]), dot(0.05, -2, ["intersection"])], VIEW, at, "fine")
  ).toBe(1);
  expect(hitPoi([dot(0.05, -2, ["zero"]), dot(0, -2, ["zero"])], VIEW, at, "fine")).toBe(1);
});
