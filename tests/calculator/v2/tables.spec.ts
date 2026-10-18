// Tables in a real calculator (03-tables-ui Task 9 of the parity plan): S-2, S-10, D-5, D-7, D-13,
// D-16, D-41 and D-42 on the harness page /v2/calculator.html, with real MathQuill cells.

import { expect, test, type Page } from "@playwright/test";
import { enc, openShell, rowField, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const cell = (page: Page, name: string) => page.getByRole("textbox", { name, exact: true });
/** The visible MathQuill field of a cell; its textarea is visually hidden. */
const cellField = (page: Page, name: string) =>
  page
    .locator("#calc .kc-table-cell")
    .filter({ has: cell(page, name) })
    .locator(".mq-editable-field");

/** The stored columns of the first table row. */
const columns = (page: Page) =>
  page.evaluate(() =>
    globalThis
      .__calculatorHarness!.engine.getSnapshot()
      .rows.find((r) => r.type === "table")!
      .columns!.map((c) => [...c.values])
  );

test("S-2, S-10 Add item opens by keyboard and Add table puts focus in the first x cell", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=x"])}`);
  await page.getByRole("button", { name: "Add item" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Add expression" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(cell(page, "x₁, row 1, blank")).toBeFocused();
  await expect(page.getByRole("grid", { name: "Table 2, 2 columns, 0 rows" })).toBeVisible();
});

test("D-5, D-7 typing table converts the row, and Enter and Tab fill 1, 2, 3 against 2, 4, 6 as three points", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc([""])}`);
  await rowField(page, "1").click();
  await page.keyboard.type("table");
  await expect(cell(page, "x₁, row 1, blank")).toBeFocused();
  for (const [x, y] of [
    ["1", "2"],
    ["2", "4"],
    ["3", "6"],
  ]) {
    await page.keyboard.type(x);
    await page.keyboard.press("Tab");
    await page.keyboard.type(y);
    await page.keyboard.press("Tab"); // wraps to the next row's x cell
  }
  expect(await columns(page)).toEqual([
    ["1", "2", "3"],
    ["2", "4", "6"],
  ]);
  await expect(cell(page, "x₁, row 4, blank")).toBeFocused();
  // Three points plotted (the shell harness has no pixel reader; graph.spec covers G-7 pixels).
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = globalThis.__calculatorHarness!.engine.getSnapshot();
        const id = s.rows.find((r) => r.type === "table")!.id;
        const g = s.geometry.get(id);
        return g?.kind === "table" ? [...g.series[0].coords] : null;
      })
    )
    .toEqual([1, 2, 2, 4, 3, 6]);
  // Enter moves down the column; ArrowUp from row 1 enters the header.
  await cellField(page, "y₁, row 1").click();
  await page.keyboard.press("Enter");
  await expect(cell(page, "y₁, row 2")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(cell(page, "Column 2 header")).toBeFocused();
});

test("D-7 ArrowLeft and ArrowRight cross cells only at the caret's edge", async ({ page }) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=x"])}`);
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["12"] },
        { latex: "y_{1}", values: ["3"] },
      ],
    })
  );
  await cellField(page, "x₁, row 1").click();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft"); // inside 12: the caret moves
  await expect(cell(page, "x₁, row 1")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight"); // at the end: into y₁
  await expect(cell(page, "y₁, row 1")).toBeFocused();
});

test("D-13 Create table from y=x^2 shows the computed column and the undoable toast", async ({
  page,
  isMobile,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=x^{2}"])}`);
  if (isMobile) {
    // A long-press on the gutter tab; touch has no right-click.
    const tab = page.getByRole("button", { name: "Hide expression 1" });
    await tab.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true });
    await page.waitForTimeout(700);
    await tab.dispatchEvent("pointerup", { pointerType: "touch", isPrimary: true });
  } else {
    await rowField(page, "1").click({ button: "right" });
  }
  await page.getByRole("menuitem", { name: "Create table" }).click();
  await expect(page.locator("#calc [data-toast]")).toContainText("Table created.");
  await expect(cell(page, "x₁, row 1")).toBeFocused();
  await expect(
    page.getByRole("gridcell", { name: "x₁ squared, row 1, computed, 4", exact: true })
  ).toHaveText("4");
  await page.locator("#calc [data-toast]").getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("grid")).toHaveCount(0);
});

test("D-16 Zoom to fit table 2 fits the view to its points", async ({ page }) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=x"])}`);
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["10", "30"] },
        { latex: "y_{1}", values: ["100", "200"] },
      ],
    })
  );
  const fit = page.getByRole("button", { name: "Zoom to fit table 2" });
  await expect(fit).not.toHaveAttribute("aria-disabled", "true");
  await fit.click();
  const view = await page.evaluate(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().viewport
  );
  expect([view.left, view.right, view.bottom, view.top].map(Math.round)).toEqual([8, 32, 90, 210]);
  await expect(page.getByRole("button", { name: "Home" })).toBeVisible();
});

test("D-41, D-42 at 390 px a wide table scrolls inside its item and the keypad's arrows cross cells", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "the phone layout and keypad");
  await openShell(page, `?rows=${enc(["y=x"])}`);
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpression({
      id: "t",
      type: "table",
      columns: ["x_{1}", "y_{1}", "y_{2}", "y_{3}", "y_{4}", "y_{5}"].map((latex) => ({
        latex,
        values: ["1"],
      })),
    })
  );
  const grid = page.getByRole("grid", { name: /^Table 2/ });
  const sizes = await grid.evaluate((el) => ({
    scroll: el.scrollWidth,
    client: el.clientWidth,
    page: document.documentElement.scrollWidth,
    view: window.innerWidth,
    cells: [...el.querySelectorAll('[role="columnheader"]')].map(
      (c) => c.getBoundingClientRect().width
    ),
  }));
  expect(sizes.scroll).toBeGreaterThan(sizes.client); // the table scrolls inside its item
  expect(sizes.page).toBeLessThanOrEqual(sizes.view); // and the page never does
  expect(new Set(sizes.cells.map(Math.round)).size).toBe(1); // every column keeps its width
  await cellField(page, "x₁, row 1").tap();
  await expect(page.getByRole("region", { name: "Keypad" })).toBeVisible();
  await page.getByRole("button", { name: "Right arrow" }).tap(); // caret at the end of 1
  await page.getByRole("button", { name: "Right arrow" }).tap();
  await expect(cell(page, "y₁, row 1")).toBeFocused();
  await page.getByRole("button", { name: "Enter" }).tap();
  await expect(cell(page, "y₁, row 2, blank")).toBeFocused();
});
