// Table and regression behaviour checked side by side against the reference (independent
// verification pass, 2026-10-19), with real clicks and keys on the harness page: the typed
// regression panel's layout, residual names that avoid a table regression's e₁, long tables
// collapsing, focus after Delete regression and after Export to the expression list, Ctrl+Arrow
// jumps, the column menu's Add Regression and the yearly-data parameter warning.

import { expect, test, type Page } from "@playwright/test";
import { openShell, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

async function withRows(
  page: Page,
  x: string[],
  y: string[],
  extra: string[] = [],
  query = "?w=1100&h=760&rows=%5B%5D"
): Promise<void> {
  await openShell(page, query);
  await page.evaluate(
    ([xs, ys, more]) => {
      const engine = globalThis.__calculatorHarness!.engine;
      engine.setExpressions([
        {
          id: "1",
          type: "table",
          columns: [
            { latex: "x_{1}", values: xs },
            { latex: "y_{1}", values: ys },
          ],
        },
        ...more.map((latex, i) => ({ id: `e${i}`, latex })),
      ]);
    },
    [x, y, extra] as const
  );
}

const LIN = {
  x: ["1", "2", "3", "4", "5"],
  y: ["2.1", "3.9", "6.2", "7.8", "10.1"],
};

test("RT-31 a typed regression shows REGRESSION PARAMETERS in a grid, then STATISTICS and RESIDUALS with plot", async ({
  page,
}) => {
  await withRows(page, LIN.x, LIN.y, ["y_{1}\\sim mx_{1}+b"]);
  const panel = page.locator("#calc [data-regression]");
  await expect(panel.getByRole("img", { name: "m equals 1.99" })).toBeVisible();
  await expect(panel.getByRole("img", { name: "b equals 0.05" })).toBeVisible();
  await expect(panel.getByRole("img", { name: "R squared equals 0.9973" })).toBeVisible();
  await expect(panel.getByRole("img", { name: "r equals 0.9987" })).toBeVisible();
  await expect(panel.getByRole("region", { name: "Regression Parameters" })).toContainText(
    "Regression Parameters"
  );
  // m and b sit side by side on one line, as on the reference
  const m = await panel.getByRole("img", { name: "m equals 1.99" }).boundingBox();
  const b = await panel.getByRole("img", { name: "b equals 0.05" }).boundingBox();
  expect(Math.abs(m!.y - b!.y)).toBeLessThan(2);
  expect(b!.x - m!.x).toBeGreaterThan(100);
  await expect(page.locator("#calc [data-row-id='e0'] .kc-row-tab")).toHaveCount(1);
  await panel.getByRole("button", { name: "plot" }).click();
  await expect
    .poll(async () =>
      page.evaluate(() =>
        globalThis.__calculatorHarness!.engine.getSnapshot().rows[0].columns!.map((c) => c.latex)
      )
    )
    .toEqual(["x_{1}", "y_{1}", "e_{1}"]);
});

test("RT-25, RT-32 the exported custom regression takes e₀ beside the table regression's e₁", async ({
  page,
}) => {
  await withRows(page, ["12", "25", "325"], ["3", "5", "10"], ["m=2"]);
  await page.getByRole("button", { name: "Add Regression" }).click();
  await page.getByRole("button", { name: "Regression options" }).click();
  await page.getByRole("button", { name: "Export as custom regression" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__calculatorHarness!.engine.getExpressions()[1].latex)
    )
    .toBe("y_{1}\\sim m_{0}x_{1}+b_{0}");
  const typed = page.locator("#calc [data-regression]");
  await expect(typed.getByRole("img", { name: "e sub 0" })).toBeVisible();
  await expect(typed.getByRole("img", { name: "m sub 0 equals 0.0197568" })).toBeVisible();
});

test("RT-28 Delete regression gives focus back to the gutter's Add Regression", async ({
  page,
}) => {
  await withRows(page, LIN.x, LIN.y);
  await page.getByRole("button", { name: "Add Regression" }).click();
  await page.getByRole("button", { name: "Regression options" }).click();
  await page.getByRole("button", { name: "Delete regression" }).click();
  await expect(page.getByRole("button", { name: "Add Regression" })).toBeFocused();
});

test("RT-32 Export to the expression list inserts the equation below the table and focuses it", async ({
  page,
}) => {
  await withRows(page, ["1", "2", "3", "4", "5"], ["3.1", "6.2", "11.8", "24.5", "49"]);
  await page.getByRole("button", { name: "Add Regression" }).click();
  await page.getByRole("button", { name: "Export to the expression list" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__calculatorHarness!.engine.getExpressions()[1].latex)
    )
    .toBe("y=11.01x-14.11");
  await expect(page.getByRole("textbox", { name: /^Expression 2/ })).toBeFocused();
});

test("RT-6, TABLES-28 a 29-row table shows rows 1-7, 18 more rows, the last 4; Show all shows the rest", async ({
  page,
}) => {
  const xs = Array.from({ length: 29 }, (_, i) => String(i + 1));
  await withRows(page, xs, xs);
  await expect(page.getByText("18 more rows")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "x₁, row 8" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "x₁, row 26" })).toHaveCount(1);
  await page.getByRole("button", { name: "Show all" }).click();
  await expect(page.getByText("18 more rows")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "x₁, row 8" })).toBeFocused();
});

test("TABLES-36 Ctrl+ArrowUp goes to the column's header, Ctrl+ArrowDown to its blank row", async ({
  page,
}) => {
  await withRows(page, ["1", "2", "3"], ["4", "5", "6"]);
  await page
    .getByRole("gridcell")
    .filter({ has: page.getByRole("textbox", { name: "y₁, row 2" }) })
    .click();
  await page.keyboard.press("Control+ArrowUp");
  await expect(page.getByRole("textbox", { name: "Column 2 header" })).toBeFocused();
  await page.keyboard.press("Control+ArrowDown");
  await expect(page.getByRole("textbox", { name: "y₁, row 4, blank" })).toBeFocused();
  await page.keyboard.press("Control+ArrowLeft");
  await expect(page.getByRole("textbox", { name: "x₁, row 4, blank" })).toBeFocused();
});

test("RT-19 Exponential on yearly data fits and shows the parameter warning above Log Mode", async ({
  page,
}) => {
  await withRows(page, ["2000", "2001", "2002", "2003"], ["1", "2", "4.1", "7.9"]);
  await page.getByRole("button", { name: "Add Regression" }).click();
  await page.getByRole("button", { name: "Linear Regression" }).click();
  await page.getByRole("option", { name: "Exponential Regression" }).click();
  const panel = page.locator("#calc [data-table-regression]");
  const warning = panel.getByText(
    "Some parameters may be too large or small to represent accurately."
  );
  await expect(warning).toBeVisible();
  const warningBox = await warning.boundingBox();
  const logBox = await panel.getByRole("checkbox", { name: "Log Mode" }).boundingBox();
  expect(warningBox!.y).toBeLessThan(logBox!.y);
  await page.getByRole("button", { name: "Exponential Regression" }).click();
  await page.getByRole("option", { name: "Power Regression" }).click();
  await expect(panel.getByRole("img", { name: /^Regression Equation:/ })).toBeVisible();
  await expect(warning).toHaveCount(0);
});

test("RT-8, RT-28 the column menu's Add Regression adds a regression on that column", async ({
  page,
}) => {
  await withRows(page, LIN.x, LIN.y);
  await page.getByRole("button", { name: "Points for y₁" }).click({ modifiers: ["Shift"] });
  const menu = page.getByRole("dialog", { name: "Style for y₁" });
  await menu.getByRole("button", { name: "Add Regression" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => globalThis.__calculatorHarness!.engine.getExpressions()[0].regression?.type
      )
    )
    .toBe("linear");
});

test("RT-6, TABLES-26 computed cells show 8 significant digits, raised exponents and undefined", async ({
  page,
}) => {
  await openShell(page, "?w=1100&h=760&rows=%5B%5D");
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpression({
      id: "1",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "0.0001", "a"] },
        { latex: "\\sin(x_{1})", values: [] },
        { latex: "10^{12}x_{1}", values: [] },
      ],
    })
  );
  const cells = page.locator("#calc .kc-table-cell[data-computed]");
  await expect(cells.nth(0)).toHaveText("0.84147098");
  await expect(cells.nth(1)).toHaveText("1×1012");
  await expect(cells.nth(1).locator("sup")).toHaveText("12");
  await expect(cells.nth(2)).toHaveText("1×10−4");
  await expect(cells.nth(4)).toHaveText("undefined");
});

test("RT-9, RT-10 Convert to Table replaces a point list with a table of its coordinates", async ({
  page,
}) => {
  await openShell(page, "?w=1100&h=760&rows=%5B%22%5B(1%2C2)%2C(3%2C4)%5D%22%5D");
  await page.getByRole("button", { name: "Edit list" }).click();
  const convert = page.getByRole("button", { name: "Create table from expression 1" });
  await expect(convert).toHaveAttribute("title", "Convert to Table");
  await convert.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        globalThis
          .__calculatorHarness!.engine.getExpressions()[0]
          .columns?.map((c) => [c.latex, ...c.values])
      )
    )
    .toEqual([
      ["x_{1}", "1", "3"],
      ["y_{1}", "2", "4"],
    ]);
  // exact: the live region also says "Table created. Undo is available." once it announces
  await expect(page.getByText("Table created.", { exact: true })).toBeVisible();
});
