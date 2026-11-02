import { expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../core/api/types";
import type { ViewSpec } from "../plot/viewport";
import { SKIN_COLORS } from "../theme/skin-colors.generated";
import { createRecordingContext } from "./__fixtures__/recording-context";
import { drawGridLayer } from "./draw-grid";
import { pickGrid, planGrid } from "./grid-plan";
import type { RenderTheme } from "./types";

const p = SKIN_COLORS.white.normal;
const THEME: RenderTheme = {
  paper: p.roles.paper,
  text: p.roles.text,
  axis: p.roles.axis,
  gridMajor: p.roles.gridMajor,
  gridMinor: p.roles.gridMinor,
  focusRing: p.roles.focusRing,
  curves: p.curves,
  fillAlpha: p.fillAlpha,
};

/** The phone graph (phone-375): 375 by 321.5 CSS px at DPR 2, x from −10 to 10. */
const PHONE: ViewSpec = {
  viewport: { left: -10, right: 10, bottom: -160.75 / 18.75, top: 160.75 / 18.75 },
  size: { width: 375, height: 321.5 },
  dpr: 2,
};

const gridRects = (view: ViewSpec) => {
  const { ctx, calls } = createRecordingContext();
  const plan = planGrid(view, pickGrid(DEFAULT_SETTINGS), (t) => 7 * t.length);
  drawGridLayer(ctx, plan, THEME, view);
  const rects = calls.filter((c) => c.name === "fillRect").map((c) => c.args as number[]);
  return { plan, rects };
};

it("GP-2 gridlines cover the device px of the CSS px they fall in, as the reference snaps them", () => {
  const { plan, rects } = gridRects(PHONE);
  const columns = rects.filter(([, , w, h]) => w === 2 && h > 2).map(([x]) => x);
  const rows = rects.filter(([, , w, h]) => h === 2 && w > 2).map(([, y]) => y);
  // x = −7 sits at CSS 56.25: the line fills device px 112 and 113, not 111 and 112.
  expect(columns).toContain(112);
  expect(columns).not.toContain(111);
  // y = 1 sits at CSS 142.0: device rows 284 and 285.
  expect(rows).toContain(284);
  for (const x of columns) expect(x % 2).toBe(0);
  for (const y of rows) expect(y % 2).toBe(0);
  // x = ±10 lie on the canvas's first and last CSS px, which the reference leaves bare.
  expect(plan.majorLines.some((s) => s.x0 === 0)).toBe(true);
  expect(columns).not.toContain(0);
  expect(columns.every((x) => x > 0 && x < 750)).toBe(true);
});

it("GP-2 at DPR 1 a gridline still fills the one px its position falls in", () => {
  const view: ViewSpec = { ...PHONE, size: { width: 800, height: 600 }, dpr: 1 };
  const { rects } = gridRects({
    ...view,
    viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
  });
  const columns = rects.filter(([, , w, h]) => w === 1 && h > 1).map(([x]) => x);
  expect(columns).toContain(80); // x = −8
  expect(columns).toContain(720); // x = 8
  expect(columns).not.toContain(0); // x = −10, the first px
});

it("GP-7 axes stroke a quarter px before the origin rounded to a whole CSS px", () => {
  const { plan } = gridRects(PHONE);
  // The origin is at 187.5, 160.75: the reference rounds it to 188, 161.
  expect(plan.axes).toEqual([
    { x0: 0, y0: 160.75, x1: 375, y1: 160.75 },
    { x0: 187.75, y0: 0, x1: 187.75, y1: 321.5 },
  ]);
});
