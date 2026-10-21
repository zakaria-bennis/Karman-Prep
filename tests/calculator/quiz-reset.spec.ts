// Calculator per-question reset in the quiz hosts.

import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_SETTINGS } from "../../src/lib/calculator/core/api/types";
import { press, row, rowItem, RUNAWAY, trigger } from "./quiz-helpers";

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

const status = (page: Page) => page.locator("[data-calculator-host]").getByRole("status");

const counters = (page: Page) => page.evaluate(() => globalThis.__karmanCalculatorCounters);

async function open(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?flow=diagnostic");
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
  // Degrees carry to the next question (owner decision, 2026-10-21), so sin(90) is 1.
  await expect
    .poll(async () => {
      const v = (await snapshot(page)).rows[2].value;
      return v?.type === "number" && Math.abs(v.value - 1) < 1e-12;
    })
    .toBe(true);
});

test("NM-24 degrees chosen on one question stay on for the next (owner decision, 2026-10-21)", async ({
  page,
}) => {
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
  expect(await value()).toBeCloseTo(1, 12);
  expect((await snapshot(page)).state.settings.angleMode).toBe("degrees");
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
  // L-4 opens docked; reopening the dock measures the graph again, which may move a bound by one
  // floating-point step, so the viewport is compared to 12 significant digits.
  const { viewport: was, ...restBefore } = before.state;
  const { viewport: now, ...restAfter } = after.state;
  expect(restAfter).toEqual(restBefore);
  for (const side of ["left", "right", "bottom", "top"] as const)
    expect(now[side]).toBeCloseTo(was[side], 12);
  expect(after.canUndo).toBe(true);
});

test("AR-58 a new question's calculator starts blank with the student's settings kept (owner decision, 2026-10-21) and announces the reset once, only while open", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const g = globalThis as { resetAnnouncements?: number };
    g.resetAnnouncements = 0;
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
      const root = attach.call(this, init);
      let on = false;
      new MutationObserver(() => {
        const now = [...root.querySelectorAll("[role=status]")].some(
          (el) => el.textContent === "Calculator cleared for this question."
        );
        if (now && !on) g.resetAnnouncements!++;
        on = now;
      }).observe(root, { subtree: true, childList: true, characterData: true });
      return root;
    };
  });
  await open(page);
  await setRows(page, [
    { id: "1", latex: "a=5" },
    { id: "2", latex: "f(x)=x^{2}" },
  ]);
  await page.evaluate(() => {
    const e = globalThis.__calculatorHarness!.engine;
    e.updateSettings({
      angleMode: "degrees",
      complex: true,
      showGrid: false,
      polarGrid: true,
      minorGridlines: false,
      arrows: true,
      axisNumbers: false,
      keypad: true,
    });
    e.setMathBounds({ left: -1, right: 1, bottom: -1, top: 1 });
  });
  await press(page, "Skip this question");
  await expect(status(page)).toHaveText("Calculator cleared for this question.");
  const s = await snapshot(page);
  expect(s.state.expressions.map((e) => e.latex ?? "")).toEqual([""]);
  expect(s.canUndo).toBe(false);
  expect(s.geometry).toBe(0);
  expect(s.state.settings).toEqual({
    ...DEFAULT_SETTINGS,
    angleMode: "degrees",
    complex: true,
    showGrid: false,
    polarGrid: true,
    minorGridlines: false,
    arrows: true,
    axisNumbers: false,
    keypad: true,
  });
  expect(s.state.mode).toBe("graphing");
  expect([s.state.viewport.left, s.state.viewport.right]).toEqual([-10, 10]);
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await press(page, "Previous");
  await trigger(page).click();
  await expect(rowItem(page)).toBeVisible();
  await page.waitForTimeout(800);
  await expect(status(page)).toHaveText("");
  expect(
    await page.evaluate(() => (globalThis as { resetAnnouncements?: number }).resetAnnouncements)
  ).toBe(1);
});

test("AR-61 twenty question changes with the calculator opened each time leave one live calculator and one live worker", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 20; i++) {
    await press(page, i % 2 ? "Previous" : "Skip this question");
    if (!(await page.locator("[data-calculator-window]").isVisible())) await trigger(page).click();
    await expect(rowItem(page)).toBeVisible();
  }
  const c = await counters(page);
  expect(c?.calculators).toBe(1);
  expect(c?.workers).toBeLessThanOrEqual(1);
});

test("AR-61 five question changes in one second leave one calculator and no stale output", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const burst = async (first: "Skip this question" | "Previous") => {
    const other = first === "Previous" ? "Skip this question" : "Previous";
    for (let i = 0; i < 5; i++) await press(page, i % 2 ? other : first);
  };
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route(/\/calculator\/host\/quiz-host\.ts/, async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });
  await page.goto("/?flow=diagnostic");
  await trigger(page).click();
  await burst("Skip this question");
  await expect(rowItem(page)).toBeVisible();
  await setRows(page, [{ id: "1", latex: RUNAWAY }]);
  await burst("Previous");
  await page.waitForTimeout(2500);
  const c = await counters(page);
  const s = await snapshot(page);
  expect(c?.calculators).toBe(1);
  expect(c?.workers).toBeLessThanOrEqual(1);
  expect(s.rows.map((r) => r.latex)).toEqual([""]);
  expect(s.geometry).toBe(0);
  await expect(status(page)).toHaveText(/^(Calculator cleared for this question\.)?$/);
  expect(errors).toEqual([]);
});
