// Tables parity pass 4, with real clicks on the harness page: the running colour counter (RT-2)
// through a table, its blank header slot, its regression and the plotted residual column; the
// table counts as selected while focus is on one of its controls; the blank last row draws no
// bottom rule; cell math is centred in its column.

import { expect, test, type Page } from "@playwright/test";
import { openShell, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

async function linTable(page: Page): Promise<void> {
  await openShell(page, "?w=1100&h=760&rows=%5B%5D");
  await page.evaluate(() => {
    const engine = globalThis.__calculatorHarness!.engine;
    engine.removeExpression({ id: "1" });
    engine.setExpression({
      id: "1",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "2", "3", "4", "5"] },
        { latex: "y_{1}", values: ["2.1", "3.9", "6.2", "7.8", "10.1"] },
      ],
    });
  });
}

const tableState = (page: Page) =>
  page.evaluate(
    () => globalThis.__calculatorHarness!.engine.getExpressions().find((s) => s.id === "1")!
  );

test("RT-2 columns, the blank header slot, the regression and the residual column follow one colour counter", async ({
  page,
}) => {
  await linTable(page);
  await page.getByRole("button", { name: "Add Regression" }).click();
  await page.locator("#calc .kc-tr-plot").click();
  await expect.poll(async () => (await tableState(page)).columns!.length).toBe(3);
  const t = await tableState(page);
  // red went to the blank row, purple to the blank header slot
  expect([t.columns![0].color, t.columns![1].color]).toEqual(["c2", "#388c46"]);
  expect(t.regression!.color).toBe("c6");
  expect(t.columns![2].color).toBe("c1");
});

test("RT-28 focus on the regression dropdown selects the table, and leaving the table clears it", async ({
  page,
}) => {
  await linTable(page);
  await page.getByRole("button", { name: "Add Regression" }).click();
  const item = page.locator("#calc .kc-table-item");
  await expect(page.locator("#calc .kc-tr-model .kc-tr-select-button")).toBeFocused();
  await expect(item).toHaveAttribute("data-focused", "true");
  await page.locator("#outside").focus();
  await expect(item).not.toHaveAttribute("data-focused", "true");
});

test("RT-6 the blank last row has no bottom rule and data cells centre their math", async ({
  page,
}) => {
  await linTable(page);
  const last = page.locator("#calc .kc-table-row").last().locator(".kc-table-cell").first();
  await expect(last).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");
  const cell = page.locator("#calc .kc-table-row[data-table-row='0'] .kc-table-cell").first();
  const box = (await cell.boundingBox())!;
  const math = (await cell.locator(".mq-root-block").boundingBox())!;
  const centre = math.x + math.width / 2 - (box.x + box.width / 2);
  expect(Math.abs(centre)).toBeLessThan(2);
});
