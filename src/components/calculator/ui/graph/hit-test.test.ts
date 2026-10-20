import { expect, it } from "vitest";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { CURVE_HIT_PX, hitBranch, hitPoi, POI_HIT_PX } from "./hit-test";

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
  expect(hitPoi(P, VIEW, [400, 380 + 22], "coarse")).toBe(0);
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
  expect(hitBranch(rows, VIEW, [200, 319], "coarse")).toBe("1");
  const vertical = [{ rowId: "3", branches: [{ independent: "y" as const, f: () => 5 }] }];
  expect(hitBranch(vertical, VIEW, [606, 50], "fine")).toBe("3");
  expect(hitBranch([{ rowId: "4", branches: [] }], VIEW, [200, 300], "fine")).toBeNull();
});
