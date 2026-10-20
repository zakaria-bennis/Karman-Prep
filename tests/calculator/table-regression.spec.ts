// Table regressions in a real calculator (RT-26 to RT-32): Add Regression, the model dropdown with
// real clicks, the EQUATION, STATISTICS and RESIDUALS blocks, plot residuals with its Zoom Fit, the
// ⋮ menu's export and delete, and Log Mode, on the harness page /harness/calculator.html.

import { expect, test, type Page } from "@playwright/test";
import { openShell, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

async function withTable(page: Page, x: string[], y: string[]): Promise<void> {
  await openShell(page, "?w=1100&h=760");
  await page.evaluate(
    ([xs, ys]) =>
      globalThis.__calculatorHarness!.engine.setExpression({
        id: "1",
        type: "table",
        columns: [
          { latex: "x_{1}", values: xs },
          { latex: "y_{1}", values: ys },
        ],
      }),
    [x, y]
  );
}

const panel = (page: Page) => page.locator("#calc [data-table-regression]");
const equation = (page: Page) =>
  panel(page).locator(".kc-tr-equation [data-latex]").getAttribute("data-latex");
const regression = (page: Page) =>
  page.evaluate(
    () =>
      globalThis.__calculatorHarness!.engine.getExpressions().find((s) => s.id === "1")!.regression
  );

test("RT-28, RT-29 Add Regression then Quadratic fits the owner's data to y=-0.000438273x^2+0.170062x+1.02236", async ({
  page,
}) => {
  await withTable(page, ["12", "25", "325"], ["3", "5", "10"]);
  await page.getByRole("button", { name: "Add Regression" }).click();
  await expect(page.getByRole("button", { name: "Linear Regression" })).toBeFocused();
  await expect.poll(() => equation(page)).toBe("y=0.0197568x+3.61602");
  await expect(panel(page).getByRole("img", { name: "R squared equals 0.9415" })).toHaveCount(1);
  await expect(panel(page).getByRole("img", { name: "r equals 0.9703" })).toHaveCount(1);
  await page.getByRole("button", { name: "Linear Regression" }).click();
  await page.getByRole("option", { name: "Quadratic Regression" }).click();
  await expect.poll(() => equation(page)).toBe("y=-0.000438273x^{2}+0.170062x+1.02236");
  await expect(panel(page).locator(".kc-tr-stat")).toHaveCount(1); // R² only, never r
  // the curve is drawn with the table
  const curve = await page.evaluate(() => {
    const g = globalThis.__calculatorHarness!.engine.getSnapshot().geometry.get("1");
    return g?.kind === "table" ? (g.regression?.polylines.length ?? 0) : 0;
  });
  expect(curve).toBeGreaterThan(4);
});

test("RT-26, RT-27 plot adds the e1 column without moving the view and Zoom Fit fits the residuals", async ({
  page,
}) => {
  await withTable(page, ["1", "2", "3", "4", "5"], ["2.1", "3.9", "6.2", "7.8", "10.1"]);
  await page.getByRole("button", { name: "Add Regression" }).click();
  await expect.poll(() => equation(page)).toBe("y=1.99x+0.05");
  const before = await page.evaluate(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().viewport
  );
  await panel(page).getByRole("button", { name: "plot" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        globalThis.__calculatorHarness!.engine.getSnapshot().rows[0].columns!.map((c) => c.latex)
      )
    )
    .toEqual(["x_{1}", "y_{1}", "e_{1}"]);
  const after = await page.evaluate(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().viewport
  );
  expect(after).toEqual(before);
  const zoom = panel(page).getByRole("button", { name: "Zoom Fit" });
  await expect(zoom).toBeFocused();
  await zoom.click();
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().viewport.bottom)
    )
    .toBeLessThan(0);
  await expect(zoom).toHaveCount(0);
});

test("RT-32 the ⋮ menu exports the template below the table and deletes the regression", async ({
  page,
}) => {
  await withTable(page, ["12", "25", "325"], ["3", "5", "10"]);
  await page.getByRole("button", { name: "Add Regression" }).click();
  await page.getByRole("button", { name: "Regression options" }).click();
  await expect(page.getByRole("dialog", { name: "Regression options" })).toContainText(
    "Regression Model Structure"
  );
  await page.getByRole("button", { name: "Export as custom regression" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().rows[1]?.latex)
    )
    .toBe("y_{1}\\sim mx_{1}+b");
  await page.getByRole("button", { name: "Regression options" }).click();
  await page.getByRole("button", { name: "Delete regression" }).click();
  await expect.poll(() => regression(page)).toBeUndefined();
  await expect(page.getByRole("button", { name: "Add Regression" })).toHaveCount(1);
});

test("RT-24 Log Mode on an exponential refits through ln y", async ({ page }) => {
  await withTable(page, ["1", "2", "3", "4", "5"], ["3.1", "6.2", "11.8", "24.5", "49"]);
  await page.getByRole("button", { name: "Add Regression" }).click();
  await page.getByRole("button", { name: "Linear Regression" }).click();
  await page.getByRole("option", { name: "Exponential Regression" }).click();
  await expect.poll(() => equation(page)).toBe("y=1.48887\\cdot2.01138^{x}");
  await page.getByRole("checkbox", { name: "Log Mode" }).check();
  await expect.poll(() => equation(page)).toBe("y=1.54407\\cdot1.99271^{x}");
  expect((await regression(page))?.isLogMode).toBe(true);
});

test("TABLES-49, -51 pasting a numeric grid into an empty row makes a table and zooms to fit", async ({
  page,
}) => {
  await openShell(page, "?w=1100&h=760&rows=%5B%22%22%5D");
  await page.locator("#calc [data-row-id='1'] .mq-root-block").click();
  await page.evaluate(() => {
    const deep = (d: Document | ShadowRoot): Element | null =>
      d.activeElement?.shadowRoot ? deep(d.activeElement.shadowRoot) : d.activeElement;
    const target = deep(document)!;
    const data = new DataTransfer();
    data.setData("text/plain", "time\theight\n1\t2\n3\t4\n50\t60");
    target.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })
    );
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        globalThis
          .__calculatorHarness!.engine.getExpressions()[0]
          .columns?.map((c) => [c.latex, ...c.values])
      )
    )
    .toEqual([
      ["x_{1}", "1", "3", "50"],
      ["y_{1}", "2", "4", "60"],
    ]);
  await expect(page.getByText("We zoomed to fit your data.")).toBeVisible();
  const top = await page.evaluate(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().viewport.top
  );
  expect(top).toBeGreaterThan(60);
});

test("RT-7 typing 1⏎2⏎3⏎ in a new table continues the sequence with 4", async ({ page }) => {
  await openShell(page, "?w=900&h=600&rows=%5B%22%22%5D");
  await page.locator("#calc [data-row-id='1'] .mq-root-block").click();
  await page.keyboard.type("table");
  for (const x of ["1", "2", "3"]) {
    await page.keyboard.type(x);
    await page.keyboard.press("Enter");
  }
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          globalThis.__calculatorHarness!.engine.getExpressions().find((s) => s.type === "table")!
            .columns![0].values
      )
    )
    .toEqual(["1", "2", "3", "4"]);
});
