import { expect, it } from "vitest";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { WHEEL_ORIGIN_SNAP_PX, wheelStep } from "./use-graph-input";

// Origin at (400, 300) px.
const VIEW: ViewSpec = {
  viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
  size: { width: 800, height: 600 },
  dpr: 1,
};

it("reads deltaY, else deltaX, and nothing for no delta (live Desmos, 2026-10-21)", () => {
  expect(wheelStep(VIEW, { deltaX: 0, deltaY: 3 }, [10, 10])).toEqual({ dy: 3, at: [10, 10] });
  expect(wheelStep(VIEW, { deltaX: 100, deltaY: 0 }, [10, 10])).toEqual({ dy: 100, at: [10, 10] });
  expect(wheelStep(VIEW, { deltaX: 0, deltaY: 0 }, [10, 10])).toBeNull();
});

it("zooming in within 50 px of the origin on both axes anchors on the origin; zooming out never does", () => {
  expect(WHEEL_ORIGIN_SNAP_PX).toBe(50);
  expect(wheelStep(VIEW, { deltaX: 0, deltaY: -1 }, [430, 330])?.at).toEqual([400, 300]);
  expect(wheelStep(VIEW, { deltaX: 0, deltaY: -1 }, [450, 350])?.at).toEqual([400, 300]);
  expect(wheelStep(VIEW, { deltaX: 0, deltaY: -1 }, [460, 310])?.at).toEqual([460, 310]);
  expect(wheelStep(VIEW, { deltaX: 0, deltaY: 1 }, [430, 330])?.at).toEqual([430, 330]);
});
