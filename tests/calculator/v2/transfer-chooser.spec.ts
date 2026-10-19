// The format chooser in the browser (07 Task 17; c-transfer TR-63): placement against the item
// and the control, item heights by reveal, and the viewport margin.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { TABLE_PAIR } from "../fixture/v2/transfer-questions";
import {
  box,
  control,
  item,
  settled,
  tapItem,
  touchOnly,
  transferByMouse,
} from "./transfer-helpers";

const URL = "/?flow=daily&calc=v2&questions=transfer-tables";
async function openTables(page: Page, size = { width: 1280, height: 800 }) {
  await page.setViewportSize(size);
  await page.goto(URL);
  await expect(page.getByText("The table shows", { exact: false })).toBeVisible();
  await expect(control(page, TABLE_PAIR)).toBeAttached();
  await settled(page);
}
const chooser = (page: Page) => page.getByRole("menu");
const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function geometry(page: Page, menu: Locator) {
  const m = await box(menu);
  const c = await box(control(page, TABLE_PAIR));
  const i = await box(item(page, TABLE_PAIR));
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error("no viewport");
  const heights = await menu
    .getByRole("menuitem")
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  return { m, c, i, viewport, heights };
}
function insideViewport(
  m: { x: number; y: number; width: number; height: number },
  v: { width: number; height: number }
) {
  expect(m.x).toBeGreaterThanOrEqual(16 - 0.5);
  expect(m.y).toBeGreaterThanOrEqual(16 - 0.5);
  expect(m.x + m.width).toBeLessThanOrEqual(v.width - 16 + 0.5);
  expect(m.y + m.height).toBeLessThanOrEqual(v.height - 16 + 0.5);
}

test("TR-63 the chooser opens above or below the item and stays inside the viewport", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "mouse placement; the tap case follows");
  await openTables(page);
  // with room above, it opens above the item and the control, never over either
  await item(page, TABLE_PAIR).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await transferByMouse(page, TABLE_PAIR);
  await expect(chooser(page)).toBeVisible();
  let g = await geometry(page, chooser(page));
  expect(g.m.y + g.m.height).toBeLessThanOrEqual(Math.min(g.i.y, g.c.y) + 0.5);
  expect(overlaps(g.m, g.c)).toBe(false);
  expect(Math.min(...g.heights)).toBeGreaterThanOrEqual(32);
  insideViewport(g.m, g.viewport);
  await page.keyboard.press("Escape");
  await expect(chooser(page)).toHaveCount(0);
  // with no room above, it opens below them
  await item(page, TABLE_PAIR).evaluate((el) => {
    document.body.style.paddingBottom = "2000px"; // room to scroll the item to the top
    window.scrollBy(0, el.getBoundingClientRect().top - 30);
  });
  await expect.poll(async () => (await box(item(page, TABLE_PAIR))).y).toBeLessThan(40);
  await transferByMouse(page, TABLE_PAIR);
  await expect(chooser(page)).toBeVisible();
  g = await geometry(page, chooser(page));
  expect(g.m.y).toBeGreaterThanOrEqual(Math.max(g.i.y + g.i.height, g.c.y + g.c.height) - 0.5);
  expect(overlaps(g.m, g.c)).toBe(false);
  insideViewport(g.m, g.viewport);
  // it stays anchored while the page scrolls
  const before = g.m.y - g.c.y;
  await page.mouse.wheel(0, 40);
  await expect
    .poll(async () => {
      const now = await geometry(page, chooser(page));
      return Math.round(now.m.y - now.c.y);
    })
    .toBe(Math.round(before));
  await page.keyboard.press("Escape");
  // a narrow window keeps the 16 px margin on both sides
  await openTables(page, { width: 360, height: 640 });
  await item(page, TABLE_PAIR).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await transferByMouse(page, TABLE_PAIR);
  await expect(chooser(page)).toBeVisible();
  g = await geometry(page, chooser(page));
  insideViewport(g.m, g.viewport);
  expect(overlaps(g.m, g.c)).toBe(false);
});

test("TR-63, TR-56 a tap on the selected pair's control opens the chooser with 44 px items", async ({
  page,
}, info) => {
  touchOnly(info.project.name);
  await openTables(page);
  await tapItem(page, TABLE_PAIR);
  const button = control(page, TABLE_PAIR);
  const b = await box(button);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await expect(chooser(page)).toBeVisible();
  const g = await geometry(page, chooser(page));
  expect(Math.min(...g.heights)).toBeGreaterThanOrEqual(44);
  expect(overlaps(g.m, g.c)).toBe(false);
  insideViewport(g.m, g.viewport);
  await expect(chooser(page).getByRole("menuitem")).toHaveText(["Point", "Table row"]);
});
