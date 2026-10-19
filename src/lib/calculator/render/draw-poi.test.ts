import { expect, it } from "vitest";
import type { ViewSpec } from "../plot/viewport";
import { createRecordingContext } from "./__fixtures__/recording-context";
import { POI_OPEN_RADIUS_PX, POI_RADIUS_PX } from "./constants";
import { drawPoiDots, poiDotColor } from "./draw-poi";

const VIEW: ViewSpec = {
  viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
  size: { width: 800, height: 600 },
  dpr: 1,
};
const THEME = { paper: "#ffffff", text: "#000000" };

it("POI-1 grey dots draw for the selected row's points inside the view and open ones draw larger and dark", () => {
  const { ctx, calls } = createRecordingContext();
  drawPoiDots(ctx, VIEW, THEME, [
    { x: 0, y: -2, open: false },
    { x: 1, y: 0, open: true },
    { x: 50, y: 0, open: false }, // outside the view
  ]);
  const arcs = calls.filter((c) => c.name === "arc");
  expect(
    arcs.map((c) => (c.args.slice(0, 3) as number[]).map((n) => Number(n.toFixed(6))))
  ).toEqual([
    [400, 380, POI_RADIUS_PX],
    [440, 300, POI_OPEN_RADIUS_PX],
  ]);
  expect(arcs[0].state.fillStyle).toBe(poiDotColor(THEME));
  expect(poiDotColor(THEME)).toBe("#8c8c8c");
  const fills = calls.filter((c) => c.name === "fill").map((c) => c.state.fillStyle);
  expect(fills).toEqual(["#8c8c8c", "#000000"]);
});
