// Calculator v2 per-question reset in the quiz hosts (11 tasks 7 and 12).

import { expect, test, type Page } from "@playwright/test";
import { press, row, rowItem, trigger } from "./quiz-helpers";

const setRows = (page: Page, rows: { id: string; latex: string }[]) =>
  page.evaluate((list) => globalThis.__calculatorHarness!.engine.setExpressions(list), rows);

const snapshot = (page: Page) =>
  page.evaluate(() => {
    const e = globalThis.__calculatorHarness!.engine;
    const s = e.getSnapshot();
    return {
      state: e.getState(),
      canUndo: e.canUndo(),
      geometry: s.geometry.size,
      rows: s.rows.map((r) => ({ latex: r.latex, chips: r.chips, value: r.value })),
    };
  });

async function open(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?flow=diagnostic&calc=v2");
  await trigger(page).click();
  await expect(rowItem(page)).toBeVisible();
}

test.beforeEach(({}, info) =>
  test.skip(info.project.name !== "calculator-chrome", "engine-level reset checks")
);

test("RC-21 after setBlank nothing from the previous question resolves", async ({ page }) => {
  await open(page);
  await setRows(page, [
    { id: "1", latex: "a=5" },
    { id: "2", latex: "f(x)=x^{2}" },
  ]);
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.updateSettings({ angleMode: "degrees" })
  );
  await press(page, "Skip this question");
  await expect(rowItem(page)).toBeVisible();
  await setRows(page, [
    { id: "1", latex: "a" },
    { id: "2", latex: "f(2)" },
    { id: "3", latex: "\\sin(90)" },
  ]);
  await expect
    .poll(async () => (await snapshot(page)).rows.map((r) => r.chips))
    .toEqual([["a"], ["f"], []]);
  await expect
    .poll(async () => {
      const v = (await snapshot(page)).rows[2].value;
      return v?.type === "number" && Math.abs(v.value - Math.sin(90)) < 1e-12;
    })
    .toBe(true);
});

test("NM-24 degrees chosen on one question are back to radians on the next", async ({ page }) => {
  await open(page);
  const value = async () => {
    await expect.poll(async () => (await snapshot(page)).rows[0].value?.type).toBe("number");
    return ((await snapshot(page)).rows[0].value as { value: number }).value;
  };
  await page.evaluate(() => {
    const e = globalThis.__calculatorHarness!.engine;
    e.updateSettings({ angleMode: "degrees" });
    e.setExpression({ id: "1", latex: "\\sin(90)" });
  });
  expect(await value()).toBeCloseTo(1, 12);
  await press(page, "Skip this question");
  await expect(rowItem(page)).toBeVisible();
  await setRows(page, [{ id: "1", latex: "\\sin(90)" }]);
  expect(await value()).toBeCloseTo(Math.sin(90), 12);
  expect((await snapshot(page)).state.settings.angleMode).toBe("radians");
});

test("AR-59 closing and reopening within a question keeps rows, history, settings, mode and viewport", async ({
  page,
}) => {
  await open(page);
  await row(page).focus();
  await page.keyboard.type("y=x");
  await page.evaluate(() => {
    const e = globalThis.__calculatorHarness!.engine;
    e.updateSettings({ angleMode: "degrees", showGrid: false });
    e.setMathBounds({ left: -3, right: 3, bottom: -2, top: 2 });
  });
  const before = await snapshot(page);
  expect(before.canUndo).toBe(true);
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await trigger(page).click();
  await expect(rowItem(page)).toBeVisible();
  const after = await snapshot(page);
  expect(after.state).toEqual(before.state);
  expect(after.canUndo).toBe(true);
});
