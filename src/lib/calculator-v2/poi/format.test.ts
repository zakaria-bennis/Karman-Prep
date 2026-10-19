import { describe, expect, it } from "vitest";
import type { ViewSpec } from "../plot/viewport";
import {
  formatPoiCoordinate,
  formatPoiLabel,
  formatTraceLabel,
  poiDecimals,
  roundTraceX,
  traceDecimals,
} from "./format";

const view = (width = 20): ViewSpec => ({
  viewport: { left: -width / 2, right: width / 2, bottom: -7.5, top: 7.5 },
  size: { width: 800, height: 600 },
  dpr: 1,
});

describe("point-of-interest and trace labels", () => {
  it("POI-12 labels show 5 decimals at the default view, 6 at 8x zoom in and still 5 at 8x zoom out", () => {
    expect(poiDecimals(0.025)).toBe(5);
    expect(poiDecimals(0.025 / 8)).toBe(6);
    expect(poiDecimals(0.025 * 8)).toBe(5);
    expect(poiDecimals(1e-15)).toBe(12);
    expect(formatPoiCoordinate(Math.SQRT2, 5)).toBe("1.41421");
    expect(formatPoiCoordinate(1 / 3, 6)).toBe("0.333333");
    expect(formatPoiCoordinate(Math.sqrt(3) - 1, 5)).toBe("0.73205");
  });

  it("POI-12 terminating values print exactly with a true minus and a leading zero", () => {
    expect(formatPoiCoordinate(-0.5, 5)).toBe("−0.5");
    expect(formatPoiCoordinate(0.8, 5)).toBe("0.8");
    expect(formatPoiCoordinate(2, 5)).toBe("2");
    expect(formatPoiCoordinate(-0, 5)).toBe("0");
    expect(formatPoiCoordinate(-1e-9, 5)).toBe("0");
    expect(formatPoiLabel({ x: 2, y: -2 }, view())).toBe("(2, −2)");
    expect(formatPoiLabel({ x: Math.SQRT2, y: 0 }, view())).toBe("(1.41421, 0)");
    expect(formatPoiLabel({ x: 1 / 3, y: 0 }, view(20 / 8))).toBe("(0.333333, 0)");
  });

  it("POI-12 values outside the plain range use the ×10^n form", () => {
    expect(formatPoiCoordinate(1.5e13, 5)).toBe("1.5×10^13");
    expect(formatPoiCoordinate(-2.5e-8, 12)).toBe("−2.5×10^-8");
  });

  it("POI-14 trace x rounds to the view's pixel precision and y shows at most 5 decimals", () => {
    expect(traceDecimals(0.025)).toBe(3);
    expect(roundTraceX(1.23456, view())).toBe(1.235);
    expect(roundTraceX(1.23456, view(2))).toBe(1.2346);
    expect(formatTraceLabel(1.235, 1.235 ** 2, view())).toBe("(1.235, 1.52523)");
    expect(formatTraceLabel(-2, 4, view())).toBe("(−2, 4)");
  });
});
