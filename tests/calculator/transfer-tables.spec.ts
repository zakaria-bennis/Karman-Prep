// Table and pair transfers in the browser (c-transfer TR-22 to TR-25, TR-29, TR-34,
// TR-39; b D-17, D-40): D-40's table from a fixture question lands as x₁, y₁ with every point
// inside graphpaperBounds, and a pair transfers as Point and as Table row.
import { expect, test, type Page } from "@playwright/test";
import { TABLE_COORDINATE, TABLE_PAIR } from "./fixture/harness/transfer-questions";
import {
  box,
  control,
  item,
  settled,
  statusRegion,
  touchOnly,
  transferByMouse,
} from "./transfer-helpers";

const URL = "/?flow=daily&questions=transfer-tables";
const TABLE_NAME = "Transfer to Calculator: table, 4 rows";
async function openTables(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL);
  await expect(page.getByText("The table shows", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: TABLE_NAME })).toBeAttached();
  await settled(page);
}
/** The calculator's tables as [header, ...cells] columns, and its view. */
const calculator = (page: Page) =>
  page.evaluate(() => {
    const engine = globalThis.__calculatorHarness?.engine;
    if (engine === undefined) return null;
    return {
      rows: engine
        .getExpressions()
        .map((r) =>
          r.type === "table"
            ? (r.columns ?? []).map((c) => [c.latex, ...c.values].join(" "))
            : (r.latex ?? "")
        ),
      view: engine.graphpaperBounds.mathCoordinates,
    };
  });
const D40: [number, number][] = [
  [1990, 30000],
  [2000, 36000],
  [2010, 42000],
  [2020, 48000],
];
const chooser = (page: Page) => page.getByRole("menu");

test("D-40, TR-25, TR-39, D-17 the fixture question's table lands as x₁, y₁ with every transferred point inside graphpaperBounds", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "mouse hover; the tap case follows");
  await openTables(page);
  const table = page.locator("figure table");
  const b = await box(table);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.getByRole("button", { name: TABLE_NAME }).click();
  await expect
    .poll(async () => (await calculator(page))?.rows)
    .toEqual([["x_{1} 1990 2000 2010 2020", "y_{1} 30000 36000 42000 48000"]]);
  await expect(statusRegion(page)).toHaveText(
    "Added table to calculator: x₁ is Year, y₁ is Population, 4 rows."
  );
  const view = (await calculator(page))?.view;
  if (!view) throw new Error("no view");
  for (const [x, y] of D40) {
    expect(x).toBeGreaterThanOrEqual(view.left);
    expect(x).toBeLessThanOrEqual(view.right);
    expect(y).toBeGreaterThanOrEqual(view.bottom);
    expect(y).toBeLessThanOrEqual(view.top);
  }
  // D-18: the table is an ordinary table in the calculator's list
  const host = page.locator("[data-calculator-host]");
  await expect(host.getByRole("grid").first()).toBeVisible();
});

test("TR-29, TR-34 a pair transfers as Point and as Table row, and a function coordinate's Table row goes to its own table", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "mouse hover; the tap case follows");
  await openTables(page);
  await transferByMouse(page, TABLE_PAIR);
  await chooser(page).getByRole("menuitem", { name: "Point" }).click();
  await expect.poll(async () => (await calculator(page))?.rows).toEqual(["(2,5)"]);
  await expect(statusRegion(page)).toHaveText("Added to calculator: point (2, 5).");
  await transferByMouse(page, TABLE_PAIR);
  // TR-61: the last format used in this question has the initial focus
  await expect(chooser(page).getByRole("menuitem", { name: "Point" })).toBeFocused();
  await chooser(page).getByRole("menuitem", { name: "Table row" }).click();
  await expect
    .poll(async () => (await calculator(page))?.rows)
    .toEqual(["(2,5)", ["x_{1} 2", "y_{1} 5"]]);
  await expect(statusRegion(page)).toHaveText("Added to table x₁, y₁, row 1.");
  await transferByMouse(page, TABLE_COORDINATE);
  const menu = chooser(page);
  await expect(menu.getByRole("menuitem")).toHaveCount(3);
  await expect(menu.getByRole("menuitem", { name: "Evaluate f(3)" })).toHaveAttribute(
    "aria-disabled",
    "true"
  );
  await expect(menu.getByText("f isn't defined in the calculator or this question")).toBeVisible();
  // D-17: (2, 5) was inside the default view, so the two transfers above did not move it.
  const before = (await calculator(page))!.view;
  expect(before.left < 0 && before.right > 2 && before.top > 5 && before.bottom < 0).toBe(true);
  await menu.getByRole("menuitem", { name: "Table row" }).click();
  await expect
    .poll(async () => (await calculator(page))?.rows)
    .toEqual(["(2,5)", ["x_{1} 2", "y_{1} 5"], ["x_{2} 3", "y_{2} 7"]]);
  // D-17 again for (3, 7): a visible point leaves the view alone; one outside it (the stacked
  // dock's default view tops out near y = 5.7, L-8) zooms the view to fit it.
  const after = (await calculator(page))!.view;
  if (before.top > 7 && before.right > 3) expect(after).toEqual(before);
  else expect(after.left < 3 && after.right > 3 && after.bottom < 7 && after.top > 7).toBe(true);
});

test("TR-56, TR-34 on touch a tapped pair's control opens the chooser and Table row adds a point table", async ({
  page,
}, info) => {
  touchOnly(info.project.name);
  // CODE BUG (2026-10-20, WebKit touch): the selecting tap 6 px into the 35 px pair "(2, 5)" lands
  // 5 px below the 44 px control it reveals, and WebKit retargets that tap's click to the control,
  // so the chooser opens on the selecting tap and the tap below closes it. Remove this line once
  // a click from the gesture that revealed the control is ignored.
  test.fail(info.project.name === "calculator-ios", "the selecting tap also opens the chooser");
  await page.goto(URL);
  await expect(control(page, TABLE_PAIR)).toBeAttached();
  await settled(page);
  const target = item(page, TABLE_PAIR);
  await target.scrollIntoViewIfNeeded();
  const t = await box(target);
  await page.touchscreen.tap(t.x + Math.min(t.width / 2, 6), t.y + t.height / 2);
  const c = await box(control(page, TABLE_PAIR));
  await page.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2);
  const row = chooser(page).getByRole("menuitem", { name: "Table row" });
  await expect(row).toBeVisible();
  const r = await box(row);
  await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  await expect.poll(async () => (await calculator(page))?.rows).toEqual([["x_{1} 2", "y_{1} 5"]]);
});
