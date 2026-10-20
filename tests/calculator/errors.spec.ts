// Error marking as live Desmos showed it on 2026-10-20: a header in error greys its column and
// hides its values, a cell's triangle sits against its text, a call with the wrong argument count
// marks its cell or header, a name defined twice marks only the rows that use it, and Add table
// on a blank list makes the table row 1.

import { expect, test, type Page } from "@playwright/test";
import { enc, openShell, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const setExpressions = (page: Page, expressions: object[]) =>
  page.evaluate((list) => {
    const calculator = globalThis.__shell!.handle.calculator;
    const state = calculator.getState();
    calculator.setState({ ...state, expressions: list as typeof state.expressions });
  }, expressions);

/** Each marker's message (its tooltip's text, which describes it), in document order. */
const markerTexts = (page: Page, selector: string) =>
  page.evaluate((selector) => {
    const root = document.querySelector("#calc")!.shadowRoot!;
    return [...root.querySelectorAll(selector)].map((m) => {
      const id = m.getAttribute("aria-describedby");
      return id === null ? null : root.getElementById(id)?.textContent;
    });
  }, selector);

const SIN_NONE = "Function 'sin' requires an argument. For example, try typing: sin(x).";
const SIN_ONE = "Function 'sin' requires only 1 argument. For example, try typing: sin(x).";
const DUPLICATE_X =
  "You've defined 'x_1' in more than one place. Try deleting some of the definitions of 'x_1'.";

test("D-6, D-10 a header in error greys its column and hides its values; cells and headers with the wrong argument count are marked", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}&reducedMotion=1`);
  await setExpressions(page, [
    {
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "2"] },
        { latex: "y_{1}", values: ["1,2", "5"] },
        { latex: "x_{1}", values: ["3", "4"] },
      ],
    },
    {
      id: "u",
      type: "table",
      columns: [
        { latex: "x_{2}", values: ["1", "\\sin()"] },
        { latex: "\\sin()", values: ["7", "5"] },
        { latex: "y_{3}", values: ["\\sin(1,2)", "5"] },
      ],
    },
  ]);
  const t = page.locator('#calc [data-row-id="t"]');
  const u = page.locator('#calc [data-row-id="u"]');
  await expect(t.locator(".kc-header-warning")).toHaveCount(2);
  expect(await markerTexts(page, '[data-row-id="t"] .kc-header-warning')).toEqual([
    DUPLICATE_X,
    DUPLICATE_X,
  ]);
  expect(await markerTexts(page, '[data-row-id="u"] .kc-header-warning')).toEqual([SIN_NONE]);
  expect(
    await markerTexts(page, '[data-row-id="u"] .kc-cell-warning:not(.kc-header-warning)')
  ).toEqual([SIN_ONE, SIN_NONE]);
  // the errored columns' cells are grey, read-only and empty: no textbox and no value
  const greyed = t.locator('[role="gridcell"][data-computed="true"]');
  await expect(greyed).toHaveCount(6);
  await expect(t.getByRole("textbox", { name: /^x₁, row/ })).toHaveCount(0);
  for (const text of await greyed.allTextContents()) expect(text).toBe("");
  await expect(u.locator('[role="gridcell"][data-computed="true"]')).toHaveCount(3);
  // a cell's triangle sits 5 px from its left edge and its text starts right after it
  const marker = t.locator(".kc-cell-warning:not(.kc-header-warning)");
  const geometry = await marker.evaluate((m) => {
    const cell = m.closest(".kc-table-cell")!.getBoundingClientRect();
    const box = m.getBoundingClientRect();
    const text = m.parentElement!.querySelector(".mq-root-block")!.getBoundingClientRect();
    return { marker: box.x - cell.x, gap: text.x - box.right };
  });
  expect(geometry.marker).toBeCloseTo(5, 0);
  expect(Math.abs(geometry.gap)).toBeLessThan(2);
});

test("RC-7 a name defined twice marks only the rows that use it; its definitions show their values", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["a=1", "a=2", "a+1"])}&reducedMotion=1`);
  const row = (id: string) => page.locator(`#calc [data-row-id="${id}"]`);
  await expect(row("3").locator(".kc-row-warning")).toBeVisible();
  await expect(row("1").locator(".kc-row-warning")).toHaveCount(0);
  await expect(row("2").locator(".kc-row-warning")).toHaveCount(0);
  expect(await markerTexts(page, '[data-row-id="3"] .kc-row-warning')).toEqual([
    "You've defined 'a' in more than one place. Try deleting some of the definitions of 'a'.",
  ]);
  const values = () =>
    page.evaluate(() => {
      const analysis = globalThis.__shell!.handle.calculator.expressionAnalysis;
      return [analysis["1"].evaluation, analysis["2"].evaluation];
    });
  await expect.poll(values).toEqual([
    { type: "number", value: 1 },
    { type: "number", value: 2 },
  ]);
});

test("S-12 Add table on a blank list makes the table row 1", async ({ page }) => {
  await openShell(page, `?w=1200&h=800&rows=${enc([""])}&reducedMotion=1`);
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByRole("menuitem", { name: "Add table" }).click();
  await expect(page.getByRole("grid", { name: /^Table 1, 2 columns/ })).toBeVisible();
  const types = await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.getExpressions().map((e) => e.type)
  );
  expect(types).toEqual(["table", "expression"]);
});

test("R-2 a row's triangle reads Desmos's text for a half-typed operator", async ({ page }) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["1+", "\\left|\\right|"])}&reducedMotion=1`);
  await expect(page.locator("#calc .kc-row-warning")).toHaveCount(2);
  expect(await markerTexts(page, ".kc-row-warning")).toEqual([
    "You need something on both sides of the '+' symbol.",
    "Absolute value symbol cannot be empty.",
  ]);
});
